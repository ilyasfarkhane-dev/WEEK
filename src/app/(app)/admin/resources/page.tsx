import Link from "next/link";
import { Forbidden, PageHeader } from "@/components/chrome";
import { canCurateResources } from "@/lib/authz";
import { prisma } from "@/lib/db";
import { label } from "@/lib/labels";
import { requireActor } from "@/server/actor";

export const metadata = { title: "Resource curation" };

export default async function AdminResourcesPage() {
  const { actor } = await requireActor();
  if (!canCurateResources(actor)) return <Forbidden />;
  const resources = await prisma.resource.findMany({ where: { archivedAt: null }, orderBy: { updatedAt: "desc" }, take: 80 });
  return (
    <div>
      <PageHeader eyebrow="Library" title="Curation" description="Verify a resource only after a person has reviewed it. Featured does not mean evaluated impact." />
      <ul className="space-y-2 text-sm">{resources.map((resource) => <li key={resource.id}><Link className="font-semibold text-navy" href={`/knowledge/${resource.id}`}>{resource.title}</Link> · {label(resource.verification)}{resource.featured ? " · featured" : ""}</li>)}</ul>
    </div>
  );
}
