import { NextResponse } from "next/server";
import type { ProjectStage } from "@prisma/client";
import { canViewAnalytics, projectAccess } from "@/lib/authz";
import { toCsv } from "@/lib/format";
import { label } from "@/lib/labels";
import { STAGE_ORDER } from "@/lib/metrics";
import { prisma } from "@/lib/db";
import { requireActor } from "@/server/actor";
import { projectWhere } from "@/server/access";
import { loadProgrammeMetrics } from "@/server/metrics-query";

export async function GET(request: Request) {
  const { actor } = await requireActor();
  if (!canViewAnalytics(actor)) return new NextResponse("Not found", { status: 404 });
  const url = new URL(request.url);
  const stage = STAGE_ORDER.find((item) => item === url.searchParams.get("stage"));
  const metrics = await loadProgrammeMetrics({
    from: url.searchParams.get("from") ? new Date(url.searchParams.get("from") as string) : undefined,
    to: url.searchParams.get("to") ? new Date(url.searchParams.get("to") as string) : undefined,
    themeId: url.searchParams.get("theme") || undefined,
    countryCode: url.searchParams.get("country") || undefined,
    institutionId: url.searchParams.get("institution") || undefined,
    stage: stage as ProjectStage | undefined,
  });
  const projects = await prisma.project.findMany({
    where: projectWhere(actor),
    include: { theme: true, country: true, institution: true, members: true, grants: true },
    orderBy: { code: "asc" },
  });
  const rows: Array<Array<string | number | null>> = [
    ["section", "measure", "value"],
    ["activity", "registered_participants", metrics.stock.participants],
    ["activity", "onboarding_rate", metrics.stock.onboardingRate],
    ["activity", "meaningful_contributions", metrics.flow.contributors],
    ["projects", "total", metrics.projects.total],
    ["note", "interpretation", "Counts are stored records, not evidence of causation."],
  ];
  for (const project of projects) {
    const grant = project.grants.find((item) => item.userId === actor.id);
    const level = projectAccess(actor, {
      leadId: project.leadId,
      themeId: project.themeId,
      visibility: project.visibility,
      confidentiality: project.confidentiality,
      memberIds: project.members.map((member) => member.userId),
      grantPermission: grant?.permission ?? null,
    });
    if (level === "none") continue;
    rows.push([
      "project",
      project.code,
      `${level === "summary" ? "Restricted record" : project.title} | ${label(project.stage)} | ${project.theme.name} | ${project.country.name}`,
    ]);
  }
  return new NextResponse(toCsv(rows), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": "attachment; filename=gic-monitoring.csv",
      "Cache-Control": "private, no-store",
    },
  });
}
