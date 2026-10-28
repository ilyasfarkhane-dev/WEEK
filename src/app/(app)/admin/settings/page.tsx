import { Forbidden, PageHeader } from "@/components/chrome";
import { SubmitButton } from "@/components/submit-button";
import { canAccessAdmin } from "@/lib/authz";
import { prisma } from "@/lib/db";
import { readTargets } from "@/lib/metrics";
import { requireActor } from "@/server/actor";
import { publishAnnouncementAction, resetCanvasFieldsForm, saveCanvasFieldAction, saveProgrammeSettingsAction } from "@/server/actions/admin";

export const metadata = { title: "Programme settings" };

export default async function SettingsAdminPage() {
  const { actor } = await requireActor();
  if (!canAccessAdmin(actor, "settings")) return <Forbidden />;
  const [settings, fields] = await Promise.all([
    prisma.programmeSettings.findUnique({ where: { id: "default" } }),
    prisma.canvasFieldDefinition.findMany({ orderBy: { sortOrder: "asc" } }),
  ]);
  const targets = readTargets(settings?.targets);
  async function save(formData: FormData) {
    "use server";
    await saveProgrammeSettingsAction({
      phase: formData.get("phase"),
      phaseLabel: formData.get("phaseLabel"),
      substantiveContributorsBeforeEvent: formData.get("substantiveContributorsBeforeEvent"),
      cohortSize: formData.get("cohortSize"),
      reviewedCanvases: formData.get("reviewedCanvases"),
      helpResponseWorkingDays: formData.get("helpResponseWorkingDays"),
      sponsorsByDay30: formData.get("sponsorsByDay30"),
      contributorsDays61to90: formData.get("contributorsDays61to90"),
      authorizedTestsWithin90Days: formData.get("authorizedTestsWithin90Days"),
    });
  }
  async function announce(formData: FormData) {
    "use server";
    await publishAnnouncementAction({ title: formData.get("title"), body: formData.get("body") });
  }
  async function field(formData: FormData) {
    "use server";
    await saveCanvasFieldAction({
      key: formData.get("key"),
      label: formData.get("label"),
      helpText: formData.get("helpText"),
      required: formData.get("required") === "on",
      active: formData.get("active") === "on",
    });
  }
  return (
    <div className="space-y-8">
      <PageHeader eyebrow="Configuration" title="Programme settings" description="Targets are proposals. Changing them does not change historical records." />
      <form action={save} className="grid gap-3 rounded-lg border border-line bg-white p-5 md:grid-cols-2">
        <label className="text-sm">Phase
          <select className="mt-1 w-full rounded-md border border-line px-3 py-2" name="phase" defaultValue={settings?.phase ?? "PRE_SUMMIT"}>
            {["PRE_SUMMIT", "SUMMIT", "DAY_30", "DAY_60", "DAY_90", "MONTH_SIX", "SUSTAIN"].map((phase) => <option key={phase} value={phase}>{phase}</option>)}
          </select>
        </label>
        <label className="text-sm">Phase label<input className="mt-1 w-full rounded-md border border-line px-3 py-2" name="phaseLabel" defaultValue={settings?.phaseLabel ?? ""} /></label>
        {Object.entries(targets).map(([key, value]) => (
          <label key={key} className="text-sm">{key}<input className="mt-1 w-full rounded-md border border-line px-3 py-2" type="number" name={key} defaultValue={value} /></label>
        ))}
        <SubmitButton>Save targets</SubmitButton>
      </form>
      <form action={announce} className="space-y-3 rounded-lg border border-line bg-white p-5">
        <h2 className="font-serif text-2xl text-navy">Announcement</h2>
        <input className="w-full rounded-md border border-line px-3 py-2 text-sm" name="title" aria-label="Announcement title" required />
        <textarea className="min-h-24 w-full rounded-md border border-line px-3 py-2 text-sm" name="body" aria-label="Announcement" required />
        <SubmitButton variant="secondary">Publish</SubmitButton>
      </form>
      <section className="space-y-4">
        <h2 className="font-serif text-2xl text-navy">Canvas fields</h2>
        <p className="text-sm text-muted">Editing a label does not rewrite earlier versions. Each version stores the field text that existed when it was saved.</p>
        {fields.map((item) => (
          <form key={item.id} action={field} className="grid gap-2 rounded-md border border-line bg-white p-4">
            <input type="hidden" name="key" value={item.key} />
            <input className="rounded-md border border-line px-3 py-2 text-sm" name="label" defaultValue={item.label} aria-label={`Label for ${item.key}`} />
            <textarea className="min-h-16 rounded-md border border-line px-3 py-2 text-sm" name="helpText" defaultValue={item.helpText} aria-label={`Help for ${item.key}`} />
            <label className="text-sm"><input type="checkbox" name="required" defaultChecked={item.required} /> Required</label>
            <label className="text-sm"><input type="checkbox" name="active" defaultChecked={item.active} /> Active</label>
            <SubmitButton variant="secondary">Save field</SubmitButton>
          </form>
        ))}
        <form action={resetCanvasFieldsForm}><SubmitButton variant="secondary">Restore default fields</SubmitButton></form>
      </section>
    </div>
  );
}
