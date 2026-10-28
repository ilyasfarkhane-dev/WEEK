import { revalidatePath } from "@/server/noop";
import { prisma } from "@/lib/db";
import { requireActor } from "@/server/actor";
import { ok } from "@/server/result";

export async function markNotificationsReadAction() {
  const { actor } = await requireActor();
  await prisma.notification.updateMany({
    where: { userId: actor.id, readAt: null },
    data: { readAt: new Date() },
  });
  revalidatePath("/notifications");
  revalidatePath("/dashboard");
  return ok("Notifications marked as read.");
}
