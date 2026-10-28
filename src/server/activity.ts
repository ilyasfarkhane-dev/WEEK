import { prisma } from "@/lib/db";

export async function recordActivity(input: {
  summary: string;
  actorId?: string | null;
  projectId?: string | null;
  themeId?: string | null;
}) {
  await prisma.activityEvent.create({
    data: {
      summary: input.summary,
      actorId: input.actorId ?? null,
      projectId: input.projectId ?? null,
      themeId: input.themeId ?? null,
    },
  });
}
