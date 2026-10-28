import Link from "next/link";
import type { ChallengeStatus } from "@prisma/client";
import { EmptyState, PageHeader, Pagination } from "@/components/chrome";
import { Badge } from "@/components/ui/primitives";
import { buttonClass } from "@/components/ui/button";
import { prisma } from "@/lib/db";
import { label } from "@/lib/labels";
import { requireActor } from "@/server/actor";
import { challengeWhere } from "@/server/access";
import { canCreateChallenge } from "@/lib/authz";

export const metadata = { title: "Challenges" };

const STATUSES: ChallengeStatus[] = ["SUBMITTED", "UNDER_REVIEW", "SELECTED", "MERGED", "REFERRED", "RETAINED", "CLOSED"];

export default async function ChallengesPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const params = await searchParams;
  const { actor } = await requireActor();
  const page = Math.max(1, Number(params.page) || 1);
  const status = STATUSES.find((item) => item === params.status);
  const q = params.q?.trim();
  const where = {
    AND: [
      challengeWhere(actor),
      status ? { status } : {},
      params.country ? { countryCode: params.country } : {},
      params.theme ? { theme: { slug: params.theme } } : {},
      q ? { OR: [{ title: { contains: q, mode: "insensitive" as const } }, { code: { contains: q, mode: "insensitive" as const } }, { problemStatement: { contains: q, mode: "insensitive" as const } }] } : {},
    ],
  };
  const [total, rows, themes, countries] = await Promise.all([
    prisma.challenge.count({ where }),
    prisma.challenge.findMany({
      where,
      include: { theme: true, country: true, institution: true },
      orderBy: params.sort === "title" ? { title: "asc" } : { updatedAt: "desc" },
      skip: (page - 1) * 20,
      take: 20,
    }),
    prisma.theme.findMany({ where: { archivedAt: null }, orderBy: { sortOrder: "asc" } }),
    prisma.country.findMany({ orderBy: { name: "asc" } }),
  ]);
  const pages = Math.max(1, Math.ceil(total / 20));
  return (
    <div>
      <PageHeader
        eyebrow="Challenge register"
        title="Challenges"
        description="Submit a public-service problem, follow its review, and see whether it is taken into collaboration."
        actions={canCreateChallenge(actor) ? <Link className={buttonClass()} href="/challenges/new">Submit a challenge</Link> : null}
      />
      <form className="mb-6 grid gap-3 rounded-lg border border-line bg-white p-4 md:grid-cols-5" method="get">
        <input className="rounded-md border border-line px-3 py-2 text-sm md:col-span-2" name="q" defaultValue={q} placeholder="Search title or identifier" aria-label="Search challenges" />
        <select className="rounded-md border border-line px-3 py-2 text-sm" name="status" defaultValue={status ?? ""} aria-label="Status">
          <option value="">Any status</option>
          {STATUSES.map((item) => <option key={item} value={item}>{label(item)}</option>)}
        </select>
        <select className="rounded-md border border-line px-3 py-2 text-sm" name="theme" defaultValue={params.theme ?? ""} aria-label="Theme">
          <option value="">Any theme</option>
          {themes.map((theme) => <option key={theme.id} value={theme.slug}>{theme.name}</option>)}
        </select>
        <select className="rounded-md border border-line px-3 py-2 text-sm" name="country" defaultValue={params.country ?? ""} aria-label="Country">
          <option value="">Any country</option>
          {countries.map((country) => <option key={country.code} value={country.code}>{country.name}</option>)}
        </select>
        <button className={buttonClass("secondary", "sm")} type="submit">Apply filters</button>
      </form>
      {rows.length === 0 ? <EmptyState title="No challenges in this view" body="Adjust the filters, or submit a challenge from a workspace you belong to." action={<Link className={buttonClass()} href="/challenges/new">Submit a challenge</Link>} /> : (
        <div className="overflow-x-auto rounded-lg border border-line bg-white">
          <table className="w-full min-w-[720px] text-start text-sm">
            <caption className="sr-only">Challenges</caption>
            <thead className="border-b border-line text-xs uppercase tracking-[0.12em] text-muted">
              <tr>
                <th className="px-4 py-3 font-semibold">Identifier</th>
                <th className="px-4 py-3 font-semibold">Title</th>
                <th className="px-4 py-3 font-semibold">Theme</th>
                <th className="px-4 py-3 font-semibold">Country</th>
                <th className="px-4 py-3 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-b border-line last:border-0">
                  <td className="px-4 py-3 font-mono text-xs">{row.code}</td>
                  <td className="px-4 py-3"><Link className="font-semibold text-navy" href={`/challenges/${row.id}`}>{row.title}</Link><p className="text-muted">{row.institution.name}</p></td>
                  <td className="px-4 py-3">{row.theme.name}</td>
                  <td className="px-4 py-3">{row.country.name}</td>
                  <td className="px-4 py-3"><Badge>{label(row.status)}</Badge></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <Pagination page={page} pages={pages} path={`/challenges?q=${encodeURIComponent(q ?? "")}&status=${status ?? ""}&theme=${params.theme ?? ""}&country=${params.country ?? ""}`} />
    </div>
  );
}
