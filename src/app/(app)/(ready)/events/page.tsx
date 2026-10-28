import Link from "next/link";
import { EmptyState, PageHeader } from "@/components/chrome";
import { Badge } from "@/components/ui/primitives";
import { buttonClass } from "@/components/ui/button";
import { canManageEvents } from "@/lib/authz";
import { prisma } from "@/lib/db";
import { formatDateTime } from "@/lib/format";
import { label } from "@/lib/labels";
import { requireActor } from "@/server/actor";
import { eventWhere } from "@/server/access";

export const metadata = { title: "Events" };

export default async function EventsPage() {
  const { actor } = await requireActor();
  const events = await prisma.event.findMany({
    where: eventWhere(actor),
    include: { theme: true, _count: { select: { registrations: true } } },
    orderBy: { startsAt: "asc" },
  });
  const upcoming = events.filter((event) => event.endsAt >= new Date());
  const past = events.filter((event) => event.endsAt < new Date());
  return (
    <div>
      <PageHeader eyebrow="Calendar" title="Events" description="Onboarding, the summit, reviews, clinics, and demonstrations. Registration is stored here. Email reminders are sent only when a provider is configured." actions={canManageEvents(actor) ? <Link className={buttonClass()} href="/events/new">Schedule</Link> : null} />
      {events.length === 0 ? <EmptyState title="No events yet" body="Programme managers can add the cohort calendar." /> : null}
      <EventList title="Upcoming" events={upcoming} />
      <EventList title="Earlier" events={past} />
    </div>
  );
}

function EventList({ title, events }: { title: string; events: Array<{ id: string; title: string; kind: string; startsAt: Date; timeZone: string; theme: { name: string } | null; _count: { registrations: number } }> }) {
  if (events.length === 0) return null;
  return (
    <section className="mt-8">
      <h2 className="font-serif text-2xl text-navy">{title}</h2>
      <ul className="mt-3 space-y-3">
        {events.map((event) => (
          <li key={event.id} className="rounded-lg border border-line bg-white p-4">
            <Badge>{label(event.kind)}</Badge>
            <Link className="mt-2 block font-serif text-2xl text-navy" href={`/events/${event.id}`}>{event.title}</Link>
            <p className="text-sm text-muted">{formatDateTime(event.startsAt, event.timeZone)}{event.theme ? ` · ${event.theme.name}` : ""} · {event._count.registrations} registrations</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
