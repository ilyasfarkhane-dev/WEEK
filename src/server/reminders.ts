import { prisma } from "@/lib/db";
import { notify } from "@/server/notify";

export async function remindCurrentUser(userId: string) {
  const soon = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
  const [actions, registrations] = await Promise.all([
    prisma.actionItem.findMany({
      where: { ownerId: userId, status: { in: ["OPEN", "IN_PROGRESS"] }, dueOn: { lte: soon } },
      take: 8,
    }),
    prisma.eventRegistration.findMany({
      where: { userId, status: "REGISTERED", event: { startsAt: { gte: new Date(), lte: soon } } },
      include: { event: true },
      take: 8,
    }),
  ]);
  for (const action of actions) {
    await notify({
      userId,
      type: "DEADLINE",
      title: action.dueOn && action.dueOn < new Date() ? "Action overdue" : "Action due soon",
      body: action.title,
      href: action.projectId ? `/projects/${action.projectId}` : "/dashboard",
      dedupeKey: `deadline:${action.id}:${action.dueOn?.toISOString().slice(0, 10) ?? "none"}`,
    });
  }
  for (const registration of registrations) {
    await notify({
      userId,
      type: "EVENT_REMINDER",
      title: "Upcoming session",
      body: registration.event.title,
      href: `/events/${registration.event.id}`,
      dedupeKey: `event:${registration.event.id}:${registration.event.startsAt.toISOString().slice(0, 10)}`,
    });
  }
}
