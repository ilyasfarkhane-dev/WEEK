import { EmptyState, PageHeader } from "@/components/chrome";
import { profileAccess } from "@/lib/authz";
import { prisma } from "@/lib/db";
import { label } from "@/lib/labels";
import { requireActor } from "@/server/actor";

export const metadata = { title: "Members" };

export default async function MembersPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const params = await searchParams;
  const { actor } = await requireActor();
  const q = params.q?.trim();
  const people = await prisma.user.findMany({
    where: {
      status: "ACTIVE",
      deletedAt: null,
      ...(params.country ? { profile: { countryCode: params.country } } : {}),
      ...(params.institution ? { institutionId: params.institution } : {}),
      ...(params.theme ? { memberships: { some: { theme: { slug: params.theme } } } } : {}),
      ...(q ? { OR: [{ name: { contains: q, mode: "insensitive" } }, { profile: { title: { contains: q, mode: "insensitive" } } }, { expertise: { some: { tag: { label: { contains: q, mode: "insensitive" } } } } }] } : {}),
    },
    include: { profile: true, institution: true, expertise: { include: { tag: true } }, memberships: { include: { theme: true } } },
    orderBy: { name: "asc" },
    take: 80,
  });
  const [countries, institutions, themes] = await Promise.all([
    prisma.country.findMany({ orderBy: { name: "asc" } }),
    prisma.institution.findMany({ where: { archivedAt: null }, orderBy: { name: "asc" } }),
    prisma.theme.findMany({ where: { archivedAt: null }, orderBy: { sortOrder: "asc" } }),
  ]);
  const visible = people.filter((person) => person.profile && profileAccess(actor, {
    userId: person.id,
    visibility: person.profile.profileVisibility,
    themeIds: person.memberships.map((membership) => membership.themeId),
  }) !== "none");
  return (
    <div>
      <PageHeader eyebrow="Directory" title="Members" description="Profiles set to private are omitted. Contact emails are not shown." />
      <form className="mb-6 grid gap-3 md:grid-cols-4" method="get">
        <input className="rounded-md border border-line bg-white px-3 py-2 text-sm" name="q" defaultValue={q} aria-label="Search members" placeholder="Name, title, or expertise" />
        <select className="rounded-md border border-line bg-white px-3 py-2 text-sm" name="country" defaultValue={params.country ?? ""} aria-label="Country"><option value="">Any country</option>{countries.map((country) => <option key={country.code} value={country.code}>{country.name}</option>)}</select>
        <select className="rounded-md border border-line bg-white px-3 py-2 text-sm" name="institution" defaultValue={params.institution ?? ""} aria-label="Institution"><option value="">Any institution</option>{institutions.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select>
        <select className="rounded-md border border-line bg-white px-3 py-2 text-sm" name="theme" defaultValue={params.theme ?? ""} aria-label="Theme"><option value="">Any theme</option>{themes.map((theme) => <option key={theme.id} value={theme.slug}>{theme.name}</option>)}</select>
        <button className="rounded-md bg-navy px-3 py-2 text-sm font-semibold text-white" type="submit">Search</button>
      </form>
      {visible.length === 0 ? <EmptyState title="No visible members" body="Try a broader search. People who chose a private profile will not appear." /> : (
        <ul className="grid gap-3 md:grid-cols-2">
          {visible.map((person) => (
            <li key={person.id} className="rounded-lg border border-line bg-white p-4 text-sm">
              <p className="font-semibold">{person.name}</p>
              <p className="text-muted">{person.profile?.title}{person.institution ? ` · ${person.institution.name}` : ""}</p>
              <p className="mt-2 text-muted">{person.expertise.map((item) => item.tag.label).join(", ") || "Expertise not listed"}</p>
              <p className="mt-1 text-muted">{person.memberships.map((membership) => membership.theme.name).join(" · ")}</p>
              {person.profile?.profileVisibility ? <p className="mt-2 text-xs uppercase tracking-[0.12em] text-muted">{label(person.profile.profileVisibility)} profile</p> : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
