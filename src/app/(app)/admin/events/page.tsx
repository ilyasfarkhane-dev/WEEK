import Link from "next/link";
import { Forbidden, PageHeader } from "@/components/chrome";
import { canManageEvents } from "@/lib/authz";
import { prisma } from "@/lib/db";
import { formatDateTime } from "@/lib/format";
import { requireActor } from "@/server/actor";

export const metadata = { title: "Event administration" };

export default async function AdminEventsPage() {
  const { actor } = await requireActor();
  if (!canManageEvents(actor)) return <Forbidden />;
  const events = await prisma.event.findMany({ orderBy: { startsAt: "asc" }, include: { _count: { select: { registrations: true } } } });
  return (
    <div>
      <PageHeader eyebrow="Calendar" title="Events" description="Schedule from the member calendar. Attendance is recorded on each event." actions={<Link className="text-sm font-semibold text-teal" href="/events/new">Schedule an event</Link>} />
      <ul className="space-y-2 text-sm">{events.map((event) => <li key={event.id}><Link className="font-semibold text-navy" href={`/events/${event.id}`}>{event.title}</Link> · {formatDateTime(event.startsAt, event.timeZone)} · {event._count.registrations} registrations</li>)}</ul>
    </div>
  );
}
