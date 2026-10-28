import Link from "next/link";
import { PageHeader } from "@/components/chrome";
import { prisma } from "@/lib/db";
import { requireActor } from "@/server/actor";

export const metadata = { title: "Workspaces" };

export default async function ThemesPage() {
  const { actor } = await requireActor();
  const themes = await prisma.theme.findMany({
    where: { archivedAt: null },
    orderBy: { sortOrder: "asc" },
    include: { _count: { select: { memberships: true, projects: true } }, facilitator: { select: { name: true } } },
  });
  return (
    <div>
      <PageHeader eyebrow="Cohort" title="Thematic workspaces" description="Each participant has one primary team and may contribute elsewhere when invited." />
      <div className="grid gap-4 md:grid-cols-2">
        {themes.map((theme) => {
          const mine = actor.themeIds.includes(theme.id);
          return (
            <article key={theme.id} className="rounded-lg border border-line bg-white p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-teal">{mine ? "Your workspace" : `Workspace ${theme.sortOrder}`}</p>
              <h2 className="mt-2 font-serif text-2xl text-navy"><Link href={`/themes/${theme.slug}`}>{theme.name}</Link></h2>
              <p className="mt-2 text-sm leading-6 text-muted">{theme.summary}</p>
              <p className="mt-3 text-sm text-muted">{theme.facilitator ? `Facilitator: ${theme.facilitator.name}` : "Facilitator not assigned"} · {theme._count.memberships} members · {theme._count.projects} projects</p>
            </article>
          );
        })}
      </div>
    </div>
  );
}
