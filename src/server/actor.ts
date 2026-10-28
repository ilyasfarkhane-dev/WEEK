import type { AppRole } from "@prisma/client";
import { prisma } from "@/lib/db";
import type { Actor } from "@/lib/authz";
import { redirect } from "@/server/result";
import { readSessionUserId } from "@/server/session";

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
  const userId = readSessionUserId();
  if (!userId) return null;
  const user = await loadUser(userId);
  if (!user || user.deletedAt || user.status !== "ACTIVE") return null;
  const stale =
    !user.lastActiveAt || Date.now() - user.lastActiveAt.getTime() > 60 * 60 * 1000;
  if (stale) {
    await prisma.user.update({ where: { id: user.id }, data: { lastActiveAt: new Date() } });
  }
  return user;
}

export async function requireUser() {
  const userId = readSessionUserId();
  if (userId) {
    const user = await loadUser(userId);
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
