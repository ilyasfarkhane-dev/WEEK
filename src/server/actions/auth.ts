"use server";

import { createHash, randomBytes } from "node:crypto";
import { headers } from "next/headers";
import { AuthError } from "next-auth";
import bcrypt from "bcryptjs";
import { signIn, signOut } from "@/auth";
import { prisma } from "@/lib/db";
import { invitationAcceptSchema, loginSchema, resetPasswordSchema, resetRequestSchema } from "@/lib/validators";
import { audit } from "@/server/audit";
import { queueEmail } from "@/lib/email";
import { rateLimit } from "@/server/rate-limit";
import { fail, ok } from "@/server/result";

async function clientKey(prefix: string) {
  const headerStore = await headers();
  const ip = headerStore.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  return `${prefix}:${ip}`;
}

export async function loginAction(input: { email: string; password: string }) {
  const parsed = loginSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Check the form and try again.");
  const email = parsed.data.email.toLowerCase();
  const limit = await rateLimit(await clientKey(`login:${email}`), 8, 15 * 60 * 1000);
  if (!limit.ok) return fail("Too many sign-in attempts. Wait 15 minutes and try again.");
  const user = await prisma.user.findUnique({ where: { email } });
  const matches = user?.passwordHash ? await bcrypt.compare(parsed.data.password, user.passwordHash) : false;
  await prisma.loginAttempt.create({
    data: { email, userId: user?.id, success: Boolean(matches && user?.status === "ACTIVE" && !user.deletedAt) },
  });
  if (!matches || !user || user.status !== "ACTIVE" || user.deletedAt) {
    return fail("The email or password is not correct, or the account is not active.");
  }
  try {
    await signIn("credentials", {
      email,
      password: parsed.data.password,
      redirectTo: user.onboardingCompletedAt ? "/dashboard" : "/onboarding",
    });
  } catch (error) {
    if (error instanceof AuthError) return fail("The email or password is not correct, or the account is not active.");
    throw error;
  }
  return ok();
}

export async function logoutAction() {
  await signOut({ redirectTo: "/" });
}

export async function acceptInvitationAction(input: { token: string; password: string; confirmPassword: string }) {
  const parsed = invitationAcceptSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Check the invitation and password.");
  const limit = await rateLimit(await clientKey("invite"), 10, 15 * 60 * 1000);
  if (!limit.ok) return fail("Too many attempts. Wait and try again.");
  const tokenHash = createHash("sha256").update(parsed.data.token).digest("hex");
  const invitation = await prisma.invitation.findUnique({ where: { tokenHash } });
  if (!invitation || invitation.revokedAt || invitation.acceptedAt || invitation.expiresAt < new Date()) {
    return fail("This invitation is invalid or has expired. Ask a programme manager for a new one.");
  }
  const email = invitation.email.toLowerCase();
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return fail("An account with this email already exists. Sign in instead.");
  const passwordHash = await bcrypt.hash(parsed.data.password, 12);
  const user = await prisma.user.create({
    data: {
      email,
      name: invitation.fullName,
      passwordHash,
      status: "ACTIVE",
      institutionId: invitation.institutionId,
      profile: { create: { fullName: invitation.fullName } },
      roles: { create: invitation.roles.map((role) => ({ role })) },
      notificationPreference: { create: {} },
      ...(invitation.themeId
        ? {
            memberships: {
              create: {
                themeId: invitation.themeId,
                role: invitation.roles.includes("THEMATIC_FACILITATOR") ? "FACILITATOR" : "MEMBER",
                isPrimary: true,
              },
            },
          }
        : {}),
    },
  });
  if (invitation.themeId && invitation.roles.includes("THEMATIC_FACILITATOR")) {
    await prisma.theme.update({ where: { id: invitation.themeId }, data: { facilitatorId: user.id } });
  }
  await prisma.invitation.update({ where: { id: invitation.id }, data: { acceptedAt: new Date() } });
  await audit(user.id, "invitation.accept", "User", user.id);
  try {
    await signIn("credentials", { email, password: parsed.data.password, redirectTo: "/onboarding" });
  } catch (error) {
    if (error instanceof AuthError) return fail("The account was created, but sign-in failed. Use the sign-in page.");
    throw error;
  }
  return ok();
}

export async function requestPasswordResetAction(input: { email: string }) {
  const parsed = resetRequestSchema.safeParse(input);
  if (!parsed.success) return ok("If an account exists, a reset was queued.");
  const email = parsed.data.email.toLowerCase();
  const limit = await rateLimit(await clientKey(`reset:${email}`), 5, 15 * 60 * 1000);
  if (!limit.ok) return fail("Too many reset requests. Wait 15 minutes and try again.");
  const user = await prisma.user.findUnique({ where: { email } });
  if (user && user.status === "ACTIVE" && !user.deletedAt && user.passwordHash) {
    const token = randomBytes(32).toString("base64url");
    const tokenHash = createHash("sha256").update(token).digest("hex");
    await prisma.passwordResetToken.create({
      data: { userId: user.id, tokenHash, expiresAt: new Date(Date.now() + 60 * 60 * 1000) },
    });
    const link = `${process.env.AUTH_URL ?? "http://localhost:3000"}/reset-password/${token}`;
    await queueEmail({
      to: user.email,
      subject: "Reset your Governance Innovation Community password",
      body: `A password reset was requested. This link expires in one hour.\n\n${link}\n\nIf you did not request this, you can ignore the message.`,
    });
    await audit(user.id, "password.reset.request", "User", user.id);
  }
  return ok("If an account exists, a reset was queued. No email is sent unless a provider is configured and confirms delivery.");
}

export async function resetPasswordAction(input: { token: string; password: string; confirmPassword: string }) {
  const parsed = resetPasswordSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Choose a stronger password.");
  const tokenHash = createHash("sha256").update(parsed.data.token).digest("hex");
  const record = await prisma.passwordResetToken.findUnique({ where: { tokenHash } });
  if (!record || record.usedAt || record.expiresAt < new Date()) {
    return fail("This reset link is invalid or has expired.");
  }
  const passwordHash = await bcrypt.hash(parsed.data.password, 12);
  await prisma.$transaction([
    prisma.user.update({ where: { id: record.userId }, data: { passwordHash } }),
    prisma.passwordResetToken.update({ where: { id: record.id }, data: { usedAt: new Date() } }),
  ]);
  await audit(record.userId, "password.reset.complete", "User", record.userId);
  return ok("Your password has been updated. Sign in with the new password.");
}
