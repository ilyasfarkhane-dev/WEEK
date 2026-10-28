import { DemoBanner } from "@/components/chrome";
import { AppShell } from "@/components/shell";
import { canAccessAdmin, isPlatformAdmin } from "@/lib/authz";
import { prisma } from "@/lib/db";
import { label } from "@/lib/labels";
import { requireUser, toActor } from "@/server/actor";
import { remindCurrentUser } from "@/server/reminders";

export const dynamic = "force-dynamic";

export default async function MemberLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const actor = toActor(user);
  const [settings, unread] = await Promise.all([
    prisma.programmeSettings.findUnique({ where: { id: "default" } }),
    prisma.notification.count({ where: { userId: user.id, readAt: null } }),
  ]);
  if (user.onboardingCompletedAt || isPlatformAdmin(actor)) {
    await remindCurrentUser(user.id);
  }
  return (
    <>
      <DemoBanner show={Boolean(settings?.demonstration || user.isDemo)} />
      <AppShell
        name={user.name}
        roles={actor.roles.map((role) => label(role)).join(" · ") || "Member"}
        phase={settings?.phaseLabel ?? "Programme"}
        unread={unread}
        showAdmin={canAccessAdmin(actor, "home")}
      >
        {children}
      </AppShell>
    </>
  );
}
