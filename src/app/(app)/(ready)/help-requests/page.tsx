import Link from "next/link";
import { EmptyState, PageHeader, Pagination } from "@/components/chrome";
import { Badge } from "@/components/ui/primitives";
import { buttonClass } from "@/components/ui/button";
import { isCommunityMember } from "@/lib/authz";
import { prisma } from "@/lib/db";
import { label } from "@/lib/labels";
import { requireActor } from "@/server/actor";
import { helpWhere } from "@/server/access";

export const metadata = { title: "Exchange" };

export default async function HelpPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const params = await searchParams;
  const { actor } = await requireActor();
  const page = Math.max(1, Number(params.page) || 1);
  const q = params.q?.trim();
  const where = {
    AND: [
      helpWhere(actor),
      params.status ? { status: params.status as "OPEN" } : {},
      params.theme ? { theme: { slug: params.theme } } : {},
      q ? { OR: [{ title: { contains: q, mode: "insensitive" as const } }, { skillsRequired: { contains: q, mode: "insensitive" as const } }, { description: { contains: q, mode: "insensitive" as const } }] } : {},
    ],
  };
  const [total, rows] = await Promise.all([
    prisma.helpRequest.count({ where }),
    prisma.helpRequest.findMany({
      where,
      include: { theme: true, requester: { include: { institution: true } } },
      orderBy: { updatedAt: "desc" },
      skip: (page - 1) * 20,
      take: 20,
    }),
  ]);
  return (
    <div>
      <PageHeader eyebrow="Peer and expert exchange" title="Requests" description="Ask for help, offer expertise, or request an example. Matches are explained. Private profile details are not disclosed." actions={isCommunityMember(actor) ? <Link className={buttonClass()} href="/help-requests/new">New request</Link> : null} />
      <form className="mb-6 flex flex-wrap gap-3" method="get">
        <input className="rounded-md border border-line bg-white px-3 py-2 text-sm" name="q" defaultValue={q} aria-label="Search requests" placeholder="Search expertise, title, or description" />
        <button className={buttonClass("secondary", "sm")} type="submit">Search</button>
      </form>
      {rows.length === 0 ? <EmptyState title="No requests" body="Publish a request if you need a peer, an example, or a review." /> : (
        <ul className="space-y-3">
          {rows.map((row) => (
            <li key={row.id} className="rounded-lg border border-line bg-white p-4">
              <div className="flex gap-2"><Badge>{label(row.kind)}</Badge><Badge tone="neutral">{label(row.status)}</Badge></div>
              <Link className="mt-2 block font-serif text-2xl text-navy" href={`/help-requests/${row.id}`}>{row.title}</Link>
              <p className="text-sm text-muted">{row.requester.name}{row.requester.institution ? ` · ${row.requester.institution.name}` : ""}{row.theme ? ` · ${row.theme.name}` : ""}</p>
            </li>
          ))}
        </ul>
      )}
      <Pagination page={page} pages={Math.max(1, Math.ceil(total / 20))} path={`/help-requests?q=${encodeURIComponent(q ?? "")}`} />
    </div>
  );
}
