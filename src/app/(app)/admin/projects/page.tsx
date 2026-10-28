import Link from "next/link";
import { Forbidden, PageHeader } from "@/components/chrome";
import { isOperator } from "@/lib/authz";
import { prisma } from "@/lib/db";
import { label } from "@/lib/labels";
import { requireActor } from "@/server/actor";

export const metadata = { title: "Project portfolio" };

export default async function AdminProjectsPage() {
  const { actor } = await requireActor();
  if (!isOperator(actor)) return <Forbidden />;
  const projects = await prisma.project.findMany({ include: { theme: true, institution: true }, orderBy: { updatedAt: "desc" }, take: 100 });
  return (
    <div>
      <PageHeader eyebrow="Portfolio" title="Projects" description="Open a record to see whether your role can read the narrative. Confidential files stay redacted on the project page." />
      <ul className="space-y-2 text-sm">{projects.map((project) => (
        <li key={project.id} className="rounded-md border border-line bg-white px-4 py-3">
          <Link className="font-semibold text-navy" href={`/projects/${project.id}`}>{project.code}</Link> · {label(project.stage)} · {label(project.status)} · {project.theme.name} · {project.institution.name}
          {project.isDemo ? " · demonstration" : ""}
        </li>
      ))}</ul>
    </div>
  );
}
