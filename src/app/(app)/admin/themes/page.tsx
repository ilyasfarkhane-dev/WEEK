import { Forbidden, PageHeader } from "@/components/chrome";
import { SubmitButton } from "@/components/submit-button";
import { isOperator } from "@/lib/authz";
import { prisma } from "@/lib/db";
import { requireActor } from "@/server/actor";
import { saveThemeAction } from "@/server/actions/admin";

export const metadata = { title: "Workspaces" };

export default async function AdminThemesPage() {
  const { actor } = await requireActor();
  if (!isOperator(actor)) return <Forbidden />;
  const [themes, people] = await Promise.all([
    prisma.theme.findMany({ orderBy: { sortOrder: "asc" } }),
    prisma.user.findMany({ where: { status: "ACTIVE", deletedAt: null }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
  ]);
  async function save(formData: FormData) {
    "use server";
    await saveThemeAction({
      id: String(formData.get("id")),
      summary: String(formData.get("summary") ?? ""),
      objectives: String(formData.get("objectives") ?? ""),
      facilitatorId: String(formData.get("facilitatorId") ?? ""),
      archived: formData.get("archived") === "on",
    });
  }
  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Workspaces" title="Eight thematic teams" description="Archiving hides a workspace from new activity. Existing records remain." />
      {themes.map((theme) => (
        <form key={theme.id} action={save} className="space-y-3 rounded-lg border border-line bg-white p-5">
          <h2 className="font-serif text-2xl text-navy">{theme.name}</h2>
          <input type="hidden" name="id" value={theme.id} />
          <textarea className="min-h-20 w-full rounded-md border border-line px-3 py-2 text-sm" name="summary" defaultValue={theme.summary} aria-label={`${theme.name} summary`} />
          <textarea className="min-h-20 w-full rounded-md border border-line px-3 py-2 text-sm" name="objectives" defaultValue={theme.objectives} aria-label={`${theme.name} objectives`} />
          <select className="w-full rounded-md border border-line px-3 py-2 text-sm" name="facilitatorId" defaultValue={theme.facilitatorId ?? ""} aria-label={`${theme.name} facilitator`}>
            <option value="">No facilitator</option>
            {people.map((person) => <option key={person.id} value={person.id}>{person.name}</option>)}
          </select>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="archived" defaultChecked={Boolean(theme.archivedAt)} /> Archive</label>
          <SubmitButton variant="secondary">Save workspace</SubmitButton>
        </form>
      ))}
    </div>
  );
}
