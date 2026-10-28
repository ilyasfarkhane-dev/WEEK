import { prisma } from "@/lib/db";

export async function rateLimit(key: string, max: number, windowMs: number) {
  const now = new Date();
  const bucket = await prisma.rateLimitBucket.findUnique({ where: { id: key } });
  if (!bucket || now.getTime() - bucket.windowStart.getTime() > windowMs) {
    await prisma.rateLimitBucket.upsert({
      where: { id: key },
      create: { id: key, count: 1, windowStart: now },
      update: { count: 1, windowStart: now },
    });
    return { ok: true as const };
  }
  if (bucket.count >= max) return { ok: false as const };
  await prisma.rateLimitBucket.update({
    where: { id: key },
    data: { count: { increment: 1 } },
  });
  return { ok: true as const };
}
