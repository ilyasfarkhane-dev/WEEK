import { Forbidden, PageHeader } from "@/components/chrome";
import { ProjectForm } from "@/components/record-forms";
import { isCommunityMember, isOperator } from "@/lib/authz";
import { prisma } from "@/lib/db";
import { requireActor } from "@/server/actor";
import { challengeWhere } from "@/server/access";

export const metadata = { title: "Open a project" };

export default async function NewProjectPage({ searchParams }: { searchParams: Promise<{ challenge?: string; theme?: string }> }) {
  const params = await searchParams;
  const { actor } = await requireActor();
  if (!isCommunityMember(actor)) return <Forbidden />;
  const themeIds = isOperator(actor) ? undefined : actor.themeIds;
  const [institutions, countries, themes, challenges, members] = await Promise.all([
    prisma.institution.findMany({ where: { archivedAt: null }, orderBy: { name: "asc" } }),
    prisma.country.findMany({ orderBy: { name: "asc" } }),
    prisma.theme.findMany({ where: { archivedAt: null, ...(themeIds ? { id: { in: themeIds } } : {}) }, orderBy: { sortOrder: "asc" } }),
    prisma.challenge.findMany({ where: challengeWhere(actor), select: { id: true, code: true, title: true }, take: 50, orderBy: { createdAt: "desc" } }),
    prisma.user.findMany({
      where: { status: "ACTIVE", deletedAt: null, memberships: themeIds ? { some: { themeId: { in: themeIds } } } : undefined },
      select: { id: true, name: true },
      take: 80,
      orderBy: { name: "asc" },
    }),
  ]);
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader eyebrow="Projects" title="Open a project" description="Link a challenge when you have one. Collaborators must already be members of the workspace." />
      <ProjectForm
        institutions={institutions.map((item) => ({ id: item.id, label: item.name }))}
        countries={countries.map((item) => ({ id: item.code, label: item.name }))}
        themes={themes.map((item) => ({ id: item.id, label: item.name }))}
        challenges={challenges.map((item) => ({ id: item.id, label: `${item.code} · ${item.title}` }))}
        members={members.filter((item) => item.id !== actor.id).map((item) => ({ id: item.id, label: item.name }))}
      />
      {params.challenge ? <p className="mt-4 text-sm text-muted">You came from a challenge. Select it in the linked-challenge field.</p> : null}
    </div>
  );
}
