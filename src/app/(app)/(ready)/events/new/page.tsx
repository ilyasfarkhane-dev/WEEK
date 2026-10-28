import { redirect } from "next/navigation";
import { Forbidden, PageHeader } from "@/components/chrome";
import { SubmitButton } from "@/components/submit-button";
import { canManageEvents } from "@/lib/authz";
import { prisma } from "@/lib/db";
import { requireActor } from "@/server/actor";
import { createEventAction } from "@/server/actions/engagement";

export const metadata = { title: "Schedule an event" };

export default async function NewEventPage() {
  const { actor } = await requireActor();
  if (!canManageEvents(actor)) return <Forbidden />;
  const themes = await prisma.theme.findMany({ where: { archivedAt: null }, orderBy: { sortOrder: "asc" } });
  async function create(formData: FormData) {
    "use server";
    const result = await createEventAction({
      title: formData.get("title"),
      description: formData.get("description"),
      kind: formData.get("kind"),
      startsAt: formData.get("startsAt"),
      endsAt: formData.get("endsAt"),
      timeZone: formData.get("timeZone"),
      themeId: formData.get("themeId") || undefined,
      meetingUrl: formData.get("meetingUrl") || "",
      preparation: formData.get("preparation") ?? "",
    });
    if (result.ok && result.data && "id" in result.data && result.data.id) redirect(`/events/${result.data.id}`);
  }
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader eyebrow="Events" title="Schedule a session" description="Times are interpreted in the time zone you enter." />
      <form action={create} className="space-y-3">
        <input className="w-full rounded-md border border-line px-3 py-2 text-sm" name="title" aria-label="Title" required />
        <textarea className="min-h-24 w-full rounded-md border border-line px-3 py-2 text-sm" name="description" aria-label="Description" required />
        <select className="w-full rounded-md border border-line px-3 py-2 text-sm" name="kind" aria-label="Kind">
          {["ONBOARDING", "SUMMIT", "WORKSHOP", "REVIEW", "CLINIC", "DEMONSTRATION", "OTHER"].map((item) => <option key={item} value={item}>{item}</option>)}
        </select>
        <input className="w-full rounded-md border border-line px-3 py-2 text-sm" type="datetime-local" name="startsAt" aria-label="Starts" required />
        <input className="w-full rounded-md border border-line px-3 py-2 text-sm" type="datetime-local" name="endsAt" aria-label="Ends" required />
        <input className="w-full rounded-md border border-line px-3 py-2 text-sm" name="timeZone" defaultValue="UTC" aria-label="Time zone" />
        <select className="w-full rounded-md border border-line px-3 py-2 text-sm" name="themeId" aria-label="Workspace"><option value="">Whole programme</option>{themes.map((theme) => <option key={theme.id} value={theme.id}>{theme.name}</option>)}</select>
        <input className="w-full rounded-md border border-line px-3 py-2 text-sm" name="meetingUrl" aria-label="Meeting link" placeholder="https://" />
        <textarea className="min-h-20 w-full rounded-md border border-line px-3 py-2 text-sm" name="preparation" aria-label="Preparation" placeholder="Preparation materials" />
        <SubmitButton>Schedule</SubmitButton>
      </form>
    </div>
  );
}
