import { notFound } from "next/navigation";
import Link from "next/link";
import { PageHeader } from "@/components/chrome";
import { CanvasEditor } from "@/components/canvas-editor";
import { SubmitButton } from "@/components/submit-button";
import { asCanvasContent, completion, type CanvasField } from "@/lib/canvas";
import { canEditProject, canReadProjectNarrative } from "@/lib/authz";
import { formatDateTime } from "@/lib/format";
import { prisma } from "@/lib/db";
import { requireActor } from "@/server/actor";
import { loadProject } from "@/server/records";
import { addCanvasCommentAction } from "@/server/actions/collaboration";

export const metadata = { title: "Solution Canvas" };

export default async function CanvasPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ left?: string; right?: string }>;
}) {
  const { id } = await params;
  const query = await searchParams;
  const { actor } = await requireActor();
  const loaded = await loadProject(actor, id);
  if (!loaded || !canReadProjectNarrative(loaded.level) || !loaded.project.canvas) notFound();
  const canvas = await prisma.solutionCanvas.findUnique({
    where: { id: loaded.project.canvas.id },
    include: {
      versions: { orderBy: { versionNumber: "asc" }, include: { author: { select: { name: true } } } },
      comments: { include: { author: { select: { name: true } } }, orderBy: { createdAt: "asc" } },
    },
  });
  if (!canvas) notFound();
  const definitions = await prisma.canvasFieldDefinition.findMany({ where: { active: true }, orderBy: { sortOrder: "asc" } });
  const fields: CanvasField[] = definitions.map((field) => ({
    key: field.key,
    label: field.label,
    helpText: field.helpText,
    sortOrder: field.sortOrder,
    required: field.required,
    active: field.active,
  }));
  const content = asCanvasContent(canvas.workingJson);
  const progress = completion(content, fields);
  const left = canvas.versions.find((version) => String(version.versionNumber) === query.left) ?? canvas.versions.at(-2);
  const right = canvas.versions.find((version) => String(version.versionNumber) === query.right) ?? canvas.versions.at(-1);
  async function comment(formData: FormData) {
    "use server";
    await addCanvasCommentAction({
      canvasId: String(formData.get("canvasId")),
      sectionKey: String(formData.get("sectionKey")),
      body: String(formData.get("body") ?? ""),
    });
  }
  return (
    <div className="grid gap-8 lg:grid-cols-[220px_1fr]">
      <aside className="lg:sticky lg:top-6 lg:self-start">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">Sections</p>
        <nav aria-label="Canvas sections" className="mt-3 space-y-2">
          {fields.map((field) => <a key={field.key} className="block text-sm text-navy hover:text-teal" href={`#${field.key}`}>{field.label}</a>)}
        </nav>
        <p className="mt-6 text-sm text-muted">{progress.total === 0 ? "No required fields." : `${progress.filled} of ${progress.total} required sections have text.`}</p>
      </aside>
      <div>
        <PageHeader
          eyebrow={loaded.project.code}
          title="Solution Canvas"
          description="Autosave keeps a new version whenever the content changes. Earlier versions stay available."
          actions={<Link className="text-sm font-semibold text-teal" href={`/projects/${loaded.project.id}`}>Back to project</Link>}
        />
        <p className="mb-4 text-sm"><Link className="font-semibold text-teal" href={`/api/projects/${loaded.project.id}/canvas/pdf`}>Download PDF</Link> · <Link className="font-semibold text-teal" href={`/api/projects/${loaded.project.id}/canvas/export`}>Download JSON</Link></p>
        <CanvasEditor
          canvasId={canvas.id}
          initial={content}
          updatedAt={canvas.workingUpdatedAt.toISOString()}
          fields={fields.map((field) => ({ key: field.key, label: field.label, helpText: field.helpText, required: field.required }))}
          canEdit={canEditProject(loaded.level)}
        />
        <section className="mt-10 space-y-6">
          <h2 className="font-serif text-2xl text-navy">Section comments</h2>
          {fields.map((field) => (
            <div key={field.key}>
              <h3 className="text-sm font-semibold">{field.label}</h3>
              <ul className="mt-2 space-y-2">
                {canvas.comments.filter((item) => item.sectionKey === field.key).map((item) => (
                  <li key={item.id} className="rounded-md border border-line bg-white p-3 text-sm"><p>{item.body}</p><p className="text-muted">{item.author.name} · {formatDateTime(item.createdAt)}</p></li>
                ))}
              </ul>
              <form action={comment} className="mt-2 flex flex-col gap-2">
                <input type="hidden" name="canvasId" value={canvas.id} />
                <input type="hidden" name="sectionKey" value={field.key} />
                <textarea className="min-h-16 rounded-md border border-line px-3 py-2 text-sm" name="body" aria-label={`Comment on ${field.label}`} />
                <SubmitButton variant="secondary">Comment</SubmitButton>
              </form>
            </div>
          ))}
        </section>
        <section className="mt-10">
          <h2 className="font-serif text-2xl text-navy">Revision history</h2>
          <form className="mt-4 flex flex-wrap gap-3" method="get">
            <select className="rounded-md border border-line px-3 py-2 text-sm" name="left" defaultValue={left ? String(left.versionNumber) : ""} aria-label="Earlier version">
              {canvas.versions.map((version) => <option key={version.id} value={version.versionNumber}>Version {version.versionNumber}</option>)}
            </select>
            <select className="rounded-md border border-line px-3 py-2 text-sm" name="right" defaultValue={right ? String(right.versionNumber) : ""} aria-label="Later version">
              {canvas.versions.map((version) => <option key={version.id} value={version.versionNumber}>Version {version.versionNumber}</option>)}
            </select>
            <button className="rounded-md border border-line bg-white px-3 py-2 text-sm font-semibold" type="submit">Compare</button>
          </form>
          <ol className="mt-4 space-y-2 text-sm">
            {canvas.versions.map((version) => <li key={version.id}>Version {version.versionNumber} · {version.author.name} · {formatDateTime(version.createdAt)} · {version.note}</li>)}
          </ol>
          {left && right ? (
            <div className="mt-6 space-y-4">
              {fields.map((field) => {
                const before = asCanvasContent(left.content)[field.key] ?? "";
                const after = asCanvasContent(right.content)[field.key] ?? "";
                if (before === after) return null;
                return (
                  <article key={field.key} className="rounded-lg border border-line bg-white p-4">
                    <h3 className="font-semibold">{field.label}</h3>
                    <div className="mt-3 grid gap-3 md:grid-cols-2">
                      <div><p className="text-xs uppercase tracking-[0.12em] text-muted">Version {left.versionNumber}</p><p className="mt-2 whitespace-pre-wrap text-sm">{before || "Empty"}</p></div>
                      <div><p className="text-xs uppercase tracking-[0.12em] text-muted">Version {right.versionNumber}</p><p className="mt-2 whitespace-pre-wrap text-sm">{after || "Empty"}</p></div>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : null}
        </section>
      </div>
    </div>
  );
}
