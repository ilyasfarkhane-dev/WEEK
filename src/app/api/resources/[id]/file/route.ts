import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { requireActor } from "@/server/actor";
import { loadResource } from "@/server/records";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const { actor } = await requireActor();
  const resource = await loadResource(actor, id);
  if (!resource?.fileKey || !/^[\w.-]+$/.test(resource.fileKey)) return new NextResponse("Not found", { status: 404 });
  const directory = process.env.UPLOAD_DIR || path.join(process.cwd(), "storage", "uploads");
  const full = path.join(directory, resource.fileKey);
  if (!full.startsWith(path.resolve(directory))) return new NextResponse("Not found", { status: 404 });
  try {
    const bytes = await readFile(full);
    return new NextResponse(bytes, {
      headers: {
        "Content-Type": resource.mimeType || "application/octet-stream",
        "Content-Disposition": `attachment; filename="${(resource.fileName || "resource").replaceAll('"', "")}"`,
        "X-Content-Type-Options": "nosniff",
        "Cache-Control": "private, no-store",
      },
    });
  } catch {
    return new NextResponse("Not found", { status: 404 });
  }
}
