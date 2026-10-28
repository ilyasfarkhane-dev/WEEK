import Link from "next/link";
import type { ProjectStage } from "@prisma/client";
import { EmptyState, PageHeader, Pagination } from "@/components/chrome";
import { Badge } from "@/components/ui/primitives";
import { buttonClass } from "@/components/ui/button";
import { isCommunityMember, projectAccess } from "@/lib/authz";
import { prisma } from "@/lib/db";
import { label } from "@/lib/labels";
import { requireActor } from "@/server/actor";
import { projectWhere } from "@/server/access";

export const metadata = { title: "Projects" };

const STAGES: ProjectStage[] = ["PROBLEM_DEFINED", "PROPOSAL_DEVELOPED", "AUTHORIZATION_SOUGHT", "TEST_APPROVED", "TESTING", "EVIDENCE_REVIEWED", "DECISION_RECORDED"];

export default async function ProjectsPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const params = await searchParams;
  const { actor } = await requireActor();
  const page = Math.max(1, Number(params.page) || 1);
  const stage = STAGES.find((item) => item === params.stage);
  const q = params.q?.trim();
  const where = {
    AND: [
      projectWhere(actor),
      { archivedAt: null },
      stage ? { stage } : {},
      params.country ? { countryCode: params.country } : {},
      params.theme ? { theme: { slug: params.theme } } : {},
      q ? { OR: [{ title: { contains: q, mode: "insensitive" as const } }, { code: { contains: q, mode: "insensitive" as const } }] } : {},
    ],
  };
  const [total, rows, themes] = await Promise.all([
    prisma.project.count({ where }),
    prisma.project.findMany({
      where,
      include: { theme: true, country: true, institution: true, members: true, grants: true },
      orderBy: { updatedAt: "desc" },
      skip: (page - 1) * 20,
      take: 20,
    }),
    prisma.theme.findMany({ where: { archivedAt: null }, orderBy: { sortOrder: "asc" } }),
  ]);
  return (
    <div>
      <PageHeader
        eyebrow="Lifecycle"
        title="Projects"
        description="A project keeps its history when it is paused, revised, or closed. Testing stages require a recorded institutional authorization."
        actions={isCommunityMember(actor) ? <Link className={buttonClass()} href="/projects/new">Open a project</Link> : null}
      />
      <form className="mb-6 grid gap-3 rounded-lg border border-line bg-white p-4 md:grid-cols-4" method="get">
        <input className="rounded-md border border-line px-3 py-2 text-sm" name="q" defaultValue={q} aria-label="Search projects" placeholder="Search" />
        <select className="rounded-md border border-line px-3 py-2 text-sm" name="stage" defaultValue={stage ?? ""} aria-label="Stage">
          <option value="">Any stage</option>
          {STAGES.map((item) => <option key={item} value={item}>{label(item)}</option>)}
        </select>
        <select className="rounded-md border border-line px-3 py-2 text-sm" name="theme" defaultValue={params.theme ?? ""} aria-label="Theme">
          <option value="">Any theme</option>
          {themes.map((theme) => <option key={theme.id} value={theme.slug}>{theme.name}</option>)}
        </select>
        <button className={buttonClass("secondary", "sm")} type="submit">Apply</button>
      </form>
      {rows.length === 0 ? <EmptyState title="No projects in this view" body="Open a project from a challenge, or change the filters." /> : (
        <ul className="space-y-3">
          {rows.map((project) => {
            const grant = project.grants.find((item) => item.userId === actor.id);
            const level = projectAccess(actor, {
              leadId: project.leadId,
              themeId: project.themeId,
              visibility: project.visibility,
              confidentiality: project.confidentiality,
              memberIds: project.members.map((member) => member.userId),
              grantPermission: grant?.permission ?? null,
            });
            return (
              <li key={project.id} className="rounded-lg border border-line bg-white p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-xs text-muted">{project.code}</span>
                  <Badge>{label(project.stage)}</Badge>
                  <Badge tone="neutral">{label(project.status)}</Badge>
                </div>
                <Link className="mt-2 block font-serif text-2xl text-navy" href={`/projects/${project.id}`}>{level === "summary" ? "Restricted project record" : project.title}</Link>
                <p className="mt-1 text-sm text-muted">{project.theme.name} · {project.country.name} · {project.institution.name}</p>
              </li>
            );
          })}
        </ul>
      )}
      <Pagination page={page} pages={Math.max(1, Math.ceil(total / 20))} path={`/projects?q=${encodeURIComponent(q ?? "")}&stage=${stage ?? ""}&theme=${params.theme ?? ""}`} />
    </div>
  );
}
