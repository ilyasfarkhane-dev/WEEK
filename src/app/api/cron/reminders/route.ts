import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { notify } from "@/server/notify";

export async function POST(request: Request) {
  if (!process.env.CRON_SECRET) {
    return NextResponse.json(
      { ok: false, delivered: false, detail: "CRON_SECRET is not configured. No reminder job ran and no email was sent." },
      { status: 503 },
    );
  }
  if (request.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
  const soon = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
  const actions = await prisma.actionItem.findMany({
    where: { ownerId: { not: null }, status: { in: ["OPEN", "IN_PROGRESS"] }, dueOn: { lte: soon } },
    take: 200,
  });
  for (const action of actions) {
    if (!action.ownerId) continue;
    await notify({
      userId: action.ownerId,
      type: "DEADLINE",
      title: action.dueOn && action.dueOn < new Date() ? "Action overdue" : "Action due soon",
      body: action.title,
      href: action.projectId ? `/projects/${action.projectId}` : "/dashboard",
      dedupeKey: `deadline:${action.id}:${action.dueOn?.toISOString().slice(0, 10) ?? "none"}`,
    });
  }
  return NextResponse.json({
    ok: true,
    remindersRecorded: actions.length,
    email: "In-app notices were deduplicated. Email is sent only when a provider is configured and the user asked for immediate email.",
  });
}
