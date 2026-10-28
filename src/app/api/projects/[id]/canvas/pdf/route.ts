import { NextResponse } from "next/server";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { canReadProjectNarrative } from "@/lib/authz";
import { asCanvasContent } from "@/lib/canvas";
import { requireActor } from "@/server/actor";
import { loadProject } from "@/server/records";
import { prisma } from "@/lib/db";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const { actor } = await requireActor();
  const loaded = await loadProject(actor, id);
  if (!loaded || !canReadProjectNarrative(loaded.level)) return new NextResponse("Not found", { status: 404 });
  const canvas = await prisma.solutionCanvas.findUnique({ where: { projectId: loaded.project.id } });
  if (!canvas) return new NextResponse("Not found", { status: 404 });
  const fields = await prisma.canvasFieldDefinition.findMany({ orderBy: { sortOrder: "asc" } });
  const content = asCanvasContent(canvas.workingJson);
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  let page = pdf.addPage();
  let y = 780;
  const write = (text: string, size: number, strong = false) => {
    const used = strong ? bold : font;
    const lines = wrap(text, 90);
    for (const line of lines) {
      if (y < 60) {
        page = pdf.addPage();
        y = 780;
      }
      page.drawText(winAnsi(line), { x: 48, y, size, font: used, color: rgb(0.07, 0.14, 0.25) });
      y -= size + 6;
    }
  };
  write(`${loaded.project.code} · Solution Canvas`, 16, true);
  write("Demonstration or draft text may be included. This export is not an institutional authorization.", 10);
  y -= 8;
  for (const field of fields) {
    write(field.label, 12, true);
    write(content[field.key]?.trim() || "Not completed.", 10);
    y -= 6;
  }
  const bytes = await pdf.save();
  return new NextResponse(Buffer.from(bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${loaded.project.code}-canvas.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
}

function winAnsi(value: string) {
  return value.replace(/[^\x09\x0A\x0D\x20-\x7E]/g, "?");
}

function wrap(value: string, width: number) {
  const words = winAnsi(value).split(/\s+/);
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (next.length > width) {
      if (current) lines.push(current);
      current = word;
    } else current = next;
  }
  if (current) lines.push(current);
  return lines.length ? lines : [""];
}
