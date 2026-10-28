import { notFound } from "next/navigation";
import { PageHeader } from "@/components/chrome";
import { Badge } from "@/components/ui/primitives";
import { SubmitButton } from "@/components/submit-button";
import { canCurateResources } from "@/lib/authz";
import { formatDate } from "@/lib/format";
import { label } from "@/lib/labels";
import { requireActor } from "@/server/actor";
import { loadResource } from "@/server/records";
import { curateResourceAction } from "@/server/actions/engagement";

export default async function ResourcePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { actor } = await requireActor();
  const resource = await loadResource(actor, id);
  if (!resource) notFound();
  async function curate(formData: FormData) {
    "use server";
    const verification = String(formData.get("verification"));
    if (verification === "DRAFT" || verification === "COMMUNITY" || verification === "VERIFIED") {
      await curateResourceAction({ id: String(formData.get("id")), verification, featured: formData.get("featured") === "on" });
    }
  }
  return (
    <article>
      <PageHeader eyebrow={label(resource.type)} title={resource.title} description={resource.description} />
      <div className="mb-4 flex flex-wrap gap-2">
        <Badge tone={resource.verification === "VERIFIED" ? "ok" : "gold"}>{label(resource.verification)}</Badge>
        {resource.featured ? <Badge tone="teal">Featured</Badge> : null}
      </div>
      <dl className="grid gap-3 text-sm sm:grid-cols-2">
        <div><dt className="text-muted">Language</dt><dd>{label(resource.language)}</dd></div>
        <div><dt className="text-muted">Published</dt><dd>{formatDate(resource.publishedOn)}</dd></div>
        <div><dt className="text-muted">Source</dt><dd>{resource.source || "—"}</dd></div>
        <div><dt className="text-muted">Attribution</dt><dd>{resource.attribution || resource.authorName || "—"}</dd></div>
      </dl>
      {resource.tags.length ? <p className="mt-4 text-sm">Tags: {resource.tags.join(", ")}</p> : null}
      <div className="mt-6 flex flex-wrap gap-4 text-sm">
        {resource.externalUrl ? <a className="font-semibold text-teal" href={resource.externalUrl}>Open external source</a> : null}
        {resource.fileKey ? <a className="font-semibold text-teal" href={`/api/resources/${resource.id}/file`}>Download file</a> : null}
      </div>
      {canCurateResources(actor) ? (
        <form action={curate} className="mt-8 space-y-3 rounded-lg border border-line bg-white p-5">
          <input type="hidden" name="id" value={resource.id} />
          <select className="rounded-md border border-line px-3 py-2 text-sm" name="verification" defaultValue={resource.verification} aria-label="Verification">
            <option value="DRAFT">Draft</option>
            <option value="COMMUNITY">Community contribution</option>
            <option value="VERIFIED">Verified</option>
          </select>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="featured" defaultChecked={resource.featured} /> Feature on dashboards</label>
          <SubmitButton variant="secondary">Save curation</SubmitButton>
        </form>
      ) : null}
    </article>
  );
}
