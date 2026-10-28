import Link from "next/link";
import { EmptyState, PageHeader } from "@/components/chrome";
import { Badge } from "@/components/ui/primitives";
import { buttonClass } from "@/components/ui/button";
import { isCommunityMember } from "@/lib/authz";
import { prisma } from "@/lib/db";
import { label } from "@/lib/labels";
import { requireActor } from "@/server/actor";
import { resourceWhere } from "@/server/access";

export const metadata = { title: "Knowledge" };

export default async function KnowledgePage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const params = await searchParams;
  const { actor } = await requireActor();
  const q = params.q?.trim();
  const rows = await prisma.resource.findMany({
    where: {
      AND: [
        resourceWhere(actor),
        params.type ? { type: params.type as "TEMPLATE" } : {},
        params.theme ? { theme: { slug: params.theme } } : {},
        q ? { OR: [{ title: { contains: q, mode: "insensitive" } }, { description: { contains: q, mode: "insensitive" } }, { tags: { has: q } }] } : {},
      ],
    },
    include: { theme: true },
    orderBy: [{ featured: "desc" }, { updatedAt: "desc" }],
    take: 50,
  });
  return (
    <div>
      <PageHeader eyebrow="Library" title="Knowledge" description="Verified resources, community contributions, and drafts are labelled differently. Featuring is a curator’s choice, not a claim of impact." actions={isCommunityMember(actor) ? <Link className={buttonClass()} href="/knowledge/new">Add a resource</Link> : null} />
      <form className="mb-6 flex flex-wrap gap-3" method="get">
        <input className="rounded-md border border-line bg-white px-3 py-2 text-sm" name="q" defaultValue={q} aria-label="Search knowledge" placeholder="Search title, description, or tag" />
        <button className={buttonClass("secondary", "sm")} type="submit">Search</button>
      </form>
      {rows.length === 0 ? <EmptyState title="Nothing in the library yet" body="Managers can verify a contribution after review." /> : (
        <ul className="space-y-3">
          {rows.map((row) => (
            <li key={row.id} className="rounded-lg border border-line bg-white p-4">
              <div className="flex flex-wrap gap-2"><Badge tone={row.verification === "VERIFIED" ? "ok" : row.verification === "DRAFT" ? "gold" : "neutral"}>{label(row.verification)}</Badge><Badge>{label(row.type)}</Badge>{row.featured ? <Badge tone="teal">Featured</Badge> : null}</div>
              <Link className="mt-2 block font-serif text-2xl text-navy" href={`/knowledge/${row.id}`}>{row.title}</Link>
              <p className="text-sm text-muted">{row.theme?.name ?? "Cross-cutting"} · {label(row.language)}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
