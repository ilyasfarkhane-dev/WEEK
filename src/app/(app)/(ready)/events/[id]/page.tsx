import { notFound } from "next/navigation";
import { PageHeader } from "@/components/chrome";
import { Badge } from "@/components/ui/primitives";
import { SubmitButton } from "@/components/submit-button";
import { canManageEvents } from "@/lib/authz";
import { formatDateTime } from "@/lib/format";
import { label } from "@/lib/labels";
import { prisma } from "@/lib/db";
import { requireActor } from "@/server/actor";
import { eventWhere } from "@/server/access";
import { cancelRegistrationAction, markAttendanceAction, registerForEventAction, saveEventNotesAction } from "@/server/actions/engagement";

export default async function EventPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { actor } = await requireActor();
  const event = await prisma.event.findFirst({
    where: { id, ...eventWhere(actor) },
    include: { theme: true, host: { select: { name: true } }, project: { select: { title: true } }, registrations: { include: { user: { select: { id: true, name: true } } } } },
  });
  if (!event) notFound();
  const mine = event.registrations.find((item) => item.userId === actor.id);
  async function register() {
    "use server";
    await registerForEventAction(id);
  }
  async function cancel() {
    "use server";
    await cancelRegistrationAction(id);
  }
  async function attend(formData: FormData) {
    "use server";
    const status = String(formData.get("status"));
    if (status === "ATTENDED" || status === "ABSENT" || status === "REGISTERED") {
      await markAttendanceAction({ eventId: id, userId: String(formData.get("userId")), status });
    }
  }
  async function notes(formData: FormData) {
    "use server";
    await saveEventNotesAction({ eventId: id, notes: String(formData.get("notes") ?? ""), followUp: String(formData.get("followUp") ?? "") });
  }
  return (
    <article>
      <PageHeader eyebrow={label(event.kind)} title={event.title} description={event.description} actions={<Badge>{mine ? label(mine.status) : "Not registered"}</Badge>} />
      <p className="text-sm text-muted">{formatDateTime(event.startsAt, event.timeZone)} – {formatDateTime(event.endsAt, event.timeZone)}</p>
      <p className="mt-2 text-sm">Host: {event.host?.name ?? "Programme team"}{event.theme ? ` · ${event.theme.name}` : ""}{event.project ? ` · ${event.project.title}` : ""}</p>
      {event.meetingUrl ? <p className="mt-3 text-sm"><a className="font-semibold text-teal" href={event.meetingUrl}>Meeting link</a></p> : null}
      {event.preparation ? <section className="mt-6"><h2 className="font-serif text-2xl text-navy">Preparation</h2><p className="mt-2 whitespace-pre-wrap text-sm leading-6">{event.preparation}</p></section> : null}
      <form action={mine && mine.status !== "CANCELLED" ? cancel : register} className="mt-6">
        <SubmitButton>{mine && mine.status !== "CANCELLED" ? "Cancel registration" : "Register"}</SubmitButton>
      </form>
      <section className="mt-8">
        <h2 className="font-serif text-2xl text-navy">Attendance</h2>
        <ul className="mt-3 space-y-2 text-sm">
          {event.registrations.map((registration) => (
            <li key={registration.id} className="flex flex-wrap items-center gap-3">
              <span>{registration.user.name}</span>
              <Badge>{label(registration.status)}</Badge>
              {canManageEvents(actor) ? (
                <form action={attend} className="flex gap-2">
                  <input type="hidden" name="userId" value={registration.userId} />
                  <select className="rounded-md border border-line px-2 py-1" name="status" defaultValue={registration.status} aria-label={`Attendance for ${registration.user.name}`}>
                    <option value="REGISTERED">Registered</option>
                    <option value="ATTENDED">Attended</option>
                    <option value="ABSENT">Absent</option>
                  </select>
                  <SubmitButton variant="secondary">Save</SubmitButton>
                </form>
              ) : null}
            </li>
          ))}
        </ul>
      </section>
      {(event.notes || event.followUp || canManageEvents(actor)) ? (
        <section className="mt-8">
          <h2 className="font-serif text-2xl text-navy">Notes and follow-up</h2>
          {canManageEvents(actor) ? (
            <form action={notes} className="mt-3 space-y-3">
              <textarea className="min-h-24 w-full rounded-md border border-line px-3 py-2 text-sm" name="notes" defaultValue={event.notes} aria-label="Notes" />
              <textarea className="min-h-20 w-full rounded-md border border-line px-3 py-2 text-sm" name="followUp" defaultValue={event.followUp} aria-label="Follow-up" />
              <SubmitButton variant="secondary">Save notes</SubmitButton>
            </form>
          ) : <p className="mt-2 whitespace-pre-wrap text-sm">{event.notes} {event.followUp}</p>}
        </section>
      ) : null}
    </article>
  );
}
