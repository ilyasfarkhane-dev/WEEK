import { redirect } from "next/navigation";
import type { AppRole } from "@prisma/client";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import type { Actor } from "@/lib/authz";

const userInclude = {
  roles: true,
  memberships: true,
  profile: true,
  institution: true,
} as const;

export type CurrentUser = NonNullable<Awaited<ReturnType<typeof loadUser>>>;

async function loadUser(id: string) {
  return prisma.user.findUnique({ where: { id }, include: userInclude });
}

export function toActor(user: CurrentUser): Actor {
  return {
    id: user.id,
    status: user.status,
    roles: user.roles.map((role) => role.role),
    institutionId: user.institutionId,
    themeIds: user.memberships.map((membership) => membership.themeId),
    facilitatedThemeIds: user.memberships
      .filter((membership) => membership.role === "FACILITATOR")
      .map((membership) => membership.themeId),
    primaryThemeId: user.memberships.find((membership) => membership.isPrimary)?.themeId ?? null,
  };
}

export async function getCurrentUser() {
  const session = await auth();
  if (!session?.user?.id) return null;
  const user = await loadUser(session.user.id);
  if (!user || user.deletedAt || user.status !== "ACTIVE") return null;
  const stale =
    !user.lastActiveAt || Date.now() - user.lastActiveAt.getTime() > 60 * 60 * 1000;
  if (stale) {
    await prisma.user.update({ where: { id: user.id }, data: { lastActiveAt: new Date() } });
  }
  return user;
}

export async function requireUser() {
  const session = await auth();
  if (session?.user?.id) {
    const user = await loadUser(session.user.id);
    if (user && !user.deletedAt && user.status === "ACTIVE") {
      const stale =
        !user.lastActiveAt || Date.now() - user.lastActiveAt.getTime() > 60 * 60 * 1000;
      if (stale) {
        await prisma.user.update({ where: { id: user.id }, data: { lastActiveAt: new Date() } });
      }
      return user;
    }
  }
  redirect("/login");
}

export async function requireActor() {
  const user = await requireUser();
  return { user, actor: toActor(user) };
}

export function hasRole(user: { roles: { role: AppRole }[] }, role: AppRole) {
  return user.roles.some((item) => item.role === role);
}
