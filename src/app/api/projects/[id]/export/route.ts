import { NextResponse } from "next/server";
import { canReadProjectNarrative } from "@/lib/authz";
import { toCsv } from "@/lib/format";
import { label } from "@/lib/labels";
import { requireActor } from "@/server/actor";
import { loadProject } from "@/server/records";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const { actor } = await requireActor();
  const loaded = await loadProject(actor, id);
  if (!loaded) return new NextResponse("Not found", { status: 404 });
  const narrative = canReadProjectNarrative(loaded.level);
  const project = loaded.project;
  const rows = [
    ["field", "value"],
    ["code", project.code],
    ["title", narrative ? project.title : "Restricted record"],
    ["stage", label(project.stage)],
    ["status", label(project.status)],
    ["theme", project.theme.name],
    ["country", project.country.name],
    ["institution", project.institution.name],
    ["summary", narrative ? project.summary : ""],
    ["formal_approval", project.approvals.some((item) => item.isFormal && item.state === "APPROVED") ? "yes" : "no"],
  ];
  return new NextResponse(toCsv(rows), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${project.code}.csv"`,
      "Cache-Control": "private, no-store",
    },
  });
}
