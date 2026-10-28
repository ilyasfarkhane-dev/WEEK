import { NextResponse } from "next/server";
import { canReadProjectNarrative } from "@/lib/authz";
import { asCanvasContent } from "@/lib/canvas";
import { prisma } from "@/lib/db";
import { requireActor } from "@/server/actor";
import { loadProject } from "@/server/records";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const { actor } = await requireActor();
  const loaded = await loadProject(actor, id);
  if (!loaded || !canReadProjectNarrative(loaded.level)) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const canvas = await prisma.solutionCanvas.findUnique({
    where: { projectId: loaded.project.id },
    include: { versions: { orderBy: { versionNumber: "asc" }, select: { versionNumber: true, content: true, createdAt: true, note: true } } },
  });
  if (!canvas) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({
    projectCode: loaded.project.code,
    working: asCanvasContent(canvas.workingJson),
    updatedAt: canvas.workingUpdatedAt,
    versions: canvas.versions,
    notice: "Generated content is not included. This is the stored canvas.",
  });
}
