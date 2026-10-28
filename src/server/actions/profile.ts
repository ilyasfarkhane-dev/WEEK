"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { prisma } from "@/lib/db";
import { onboardingSchema, profileSchema } from "@/lib/validators";
import { requireActor } from "@/server/actor";
import { audit } from "@/server/audit";
import { fail, ok } from "@/server/result";
import { isPlatformAdmin } from "@/lib/authz";

async function saveProfile(mode: "onboarding" | "profile", input: unknown) {
  const { user, actor } = await requireActor();
  const schema = mode === "onboarding" ? onboardingSchema : profileSchema;
  const parsed = schema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Check the highlighted fields.");
  const data = parsed.data;
  const settings = await prisma.programmeSettings.findUnique({ where: { id: "default" } });
  if (mode === "onboarding" && !settings) return fail("Programme rules are not available yet.");
  const institution = await prisma.institution.findFirst({
    where: { id: data.institutionId, archivedAt: null },
  });
  if (!institution || institution.countryCode !== data.countryCode) {
    return fail("Choose an institution in the selected country.");
  }
  await prisma.$transaction([
    prisma.user.update({
      where: { id: user.id },
      data: {
        name: data.fullName,
        institutionId: institution.id,
        ...(mode === "onboarding"
          ? {
              onboardingCompletedAt: new Date(),
              rulesAcceptedAt: new Date(),
              rulesVersion: settings?.rulesVersion,
            }
          : {}),
      },
    }),
    prisma.profile.upsert({
      where: { userId: user.id },
      create: {
        userId: user.id,
        fullName: data.fullName,
        title: data.title,
        biography: data.biography,
        countryCode: data.countryCode,
        themesOfInterest: data.themesOfInterest,
        expertiseOffered: data.expertiseOffered,
        supportRequested: data.supportRequested,
        preferredLanguage: data.preferredLanguage,
        profileVisibility: data.profileVisibility,
      },
      update: {
        fullName: data.fullName,
        title: data.title,
        biography: data.biography,
        countryCode: data.countryCode,
        themesOfInterest: data.themesOfInterest,
        expertiseOffered: data.expertiseOffered,
        supportRequested: data.supportRequested,
        preferredLanguage: data.preferredLanguage,
        profileVisibility: data.profileVisibility,
      },
    }),
    prisma.userExpertise.deleteMany({ where: { userId: user.id } }),
  ]);
  if (data.expertise.length) {
    await prisma.userExpertise.createMany({
      data: data.expertise.map((tagId) => ({ userId: user.id, tagId })),
      skipDuplicates: true,
    });
  }
  const jar = await cookies();
  jar.set("gic-locale", data.preferredLanguage, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: process.env.NODE_ENV === "production",
  });
  await audit(actor.id, mode === "onboarding" ? "onboarding.complete" : "profile.update", "User", user.id);
  revalidatePath("/profile");
  revalidatePath("/dashboard");
  return ok(mode === "onboarding" ? "Welcome. Your profile is ready." : "Profile saved.");
}

export async function completeOnboardingAction(input: unknown) {
  return saveProfile("onboarding", input);
}

export async function updateProfileAction(input: unknown) {
  return saveProfile("profile", input);
}

export async function updateNotificationPreferencesAction(input: {
  inAppEnabled: boolean;
  emailEnabled: boolean;
  digestFrequency: "OFF" | "IMMEDIATE" | "DAILY" | "WEEKLY";
  mutedTypes: Array<
    | "INVITATION"
    | "WORKSPACE_ASSIGNMENT"
    | "COMMENT"
    | "MENTION"
    | "HELP_RESPONSE"
    | "ACTION_ASSIGNMENT"
    | "DEADLINE"
    | "PROJECT_STAGE"
    | "EVENT_REMINDER"
    | "REVIEW_REQUEST"
    | "SYSTEM"
  >;
}) {
  const { actor } = await requireActor();
  await prisma.notificationPreference.upsert({
    where: { userId: actor.id },
    create: { userId: actor.id, ...input },
    update: input,
  });
  await audit(actor.id, "notifications.preferences", "User", actor.id);
  revalidatePath("/settings");
  return ok("Notification preferences saved. Email is delivered only when a provider is configured.");
}

export async function deleteOwnAccountAction() {
  const { user, actor } = await requireActor();
  if (isPlatformAdmin(actor)) return fail("Transfer platform administration before deleting this account.");
  await anonymizeUser(user.id, actor.id);
  return ok("Your account has been archived and personal profile fields have been cleared.");
}

export async function anonymizeUser(userId: string, actorId: string) {
  await prisma.$transaction([
    prisma.user.update({
      where: { id: userId },
      data: {
        status: "ARCHIVED",
        name: "Deleted member",
        email: `deleted-${userId}@anonymized.invalid`,
        passwordHash: null,
        deletedAt: new Date(),
        institutionId: null,
      },
    }),
    prisma.profile.updateMany({
      where: { userId },
      data: {
        fullName: "Deleted member",
        title: "",
        biography: "",
        expertiseOffered: "",
        supportRequested: "",
        themesOfInterest: [],
        profileVisibility: "PRIVATE",
      },
    }),
    prisma.userExpertise.deleteMany({ where: { userId } }),
  ]);
  await audit(actorId, "user.anonymize", "User", userId);
}
