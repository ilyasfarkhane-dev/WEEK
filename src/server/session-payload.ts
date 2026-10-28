import { canAccessAdmin, isPlatformAdmin, type AdminSection } from "@/lib/authz";
import { prisma } from "@/lib/db";
import { label } from "@/lib/labels";
import { directionFor } from "@/lib/utils";
import { getCurrentUser, toActor } from "@/server/actor";
import { requestCookie } from "@/server/http-context";

const sections: Array<[string, string, AdminSection]> = [
  ["Overview", "/admin", "home"],
  ["People", "/admin/users", "users"],
  ["Institutions", "/admin/institutions", "institutions"],
  ["Workspaces", "/admin/themes", "themes"],
  ["Projects", "/admin/projects", "projects"],
  ["Resources", "/admin/resources", "resources"],
  ["Events", "/admin/events", "events"],
  ["Monitoring", "/admin/analytics", "analytics"],
  ["Audit log", "/admin/audit-logs", "audit"],
  ["Settings", "/admin/settings", "settings"],
  ["Email outbox", "/admin/email-outbox", "email"],
];

export async function sessionPayload() {
  const user = await getCurrentUser();
  const settings = await prisma.programmeSettings.findUnique({ where: { id: "default" } });
  const cookieLocale = requestCookie("gic-locale");
  const locale = user?.profile?.preferredLanguage || (cookieLocale === "fr" || cookieLocale === "ar" ? cookieLocale : "en");
  if (!user) {
    return { user: null, phase: settings?.phaseLabel ?? "Programme", unread: 0, locale, direction: directionFor(locale), adminLinks: [] as Array<{ href: string; label: string }> };
  }
  const actor = toActor(user);
  const unread = await prisma.notification.count({ where: { userId: user.id, readAt: null } });
  return {
    user: {
      id: user.id,
      name: user.name,
      roles: actor.roles,
      roleLabel: actor.roles.map((role) => label(role)).join(" · ") || "Member",
      onboardingCompletedAt: user.onboardingCompletedAt,
      isAdmin: isPlatformAdmin(actor),
      institutionId: actor.institutionId,
      themeIds: actor.themeIds,
      facilitatedThemeIds: actor.facilitatedThemeIds,
      primaryThemeId: actor.primaryThemeId,
      status: actor.status,
    },
    phase: settings?.phaseLabel ?? "Programme",
    unread,
    locale,
    direction: directionFor(locale),
    showAdmin: sections.some(([, , section]) => canAccessAdmin(actor, section)),
    adminLinks: sections.filter(([, , section]) => canAccessAdmin(actor, section)).map(([labelText, href]) => ({ label: labelText, href })),
    demonstration: Boolean(settings?.demonstration || user.isDemo),
  };
}
