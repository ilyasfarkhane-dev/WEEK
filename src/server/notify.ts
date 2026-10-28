import type { NotificationType } from "@prisma/client";
import { prisma } from "@/lib/db";
import { queueEmail } from "@/lib/email";

export async function notify(input: {
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  href?: string;
  dedupeKey?: string;
}) {
  if (input.dedupeKey) {
    const existing = await prisma.notification.findFirst({
      where: { userId: input.userId, dedupeKey: input.dedupeKey },
    });
    if (existing) return;
  }

  const prefs = await prisma.notificationPreference.findUnique({ where: { userId: input.userId } });
  const muted = prefs?.mutedTypes.includes(input.type) ?? false;
  const inApp = (prefs?.inAppEnabled ?? true) && !muted;
  if (inApp) {
    await prisma.notification.create({
      data: {
        userId: input.userId,
        type: input.type,
        title: input.title,
        body: input.body,
        href: input.href,
        dedupeKey: input.dedupeKey,
      },
    });
  }

  const wantsEmail =
    Boolean(prefs?.emailEnabled) &&
    !muted &&
    prefs?.digestFrequency === "IMMEDIATE";
  if (!wantsEmail) return;

  const user = await prisma.user.findUnique({ where: { id: input.userId }, select: { email: true, deletedAt: true } });
  if (!user || user.deletedAt) return;
  await queueEmail({
    to: user.email,
    subject: input.title,
    body: `${input.body}${input.href ? `\n\nOpen: ${process.env.AUTH_URL ?? ""}${input.href}` : ""}`,
  });
}
