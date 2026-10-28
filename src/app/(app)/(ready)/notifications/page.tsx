import { EmptyState, PageHeader } from "@/components/chrome";
import { SubmitButton } from "@/components/submit-button";
import { formatDateTime } from "@/lib/format";
import { label } from "@/lib/labels";
import { prisma } from "@/lib/db";
import { requireActor } from "@/server/actor";
import { markNotificationsReadAction } from "@/server/actions/notifications";
import Link from "next/link";

async function markRead() {
  "use server";
  await markNotificationsReadAction();
}

export const metadata = { title: "Notifications" };

export default async function NotificationsPage() {
  const { actor } = await requireActor();
  const items = await prisma.notification.findMany({ where: { userId: actor.id }, orderBy: { createdAt: "desc" }, take: 50 });
  const openRequests = await prisma.helpRequest.count({ where: { requesterId: actor.id, status: { in: ["OPEN", "MATCHED", "IN_DISCUSSION"] } } });
  return (
    <div>
      <PageHeader eyebrow="Inbox" title="Notifications" description="A short digest of recent notices. Email is not sent unless you enable it and a provider is configured." actions={<form action={markRead}><SubmitButton variant="secondary">Mark all read</SubmitButton></form>} />
      <p className="mb-4 text-sm text-muted">You have {openRequests} unresolved request{openRequests === 1 ? "" : "s"} that you opened.</p>
      {items.length === 0 ? <EmptyState title="No notifications" body="Assignments, reviews, and reminders will appear here." /> : (
        <ul className="space-y-3">
          {items.map((item) => (
            <li key={item.id} className="rounded-lg border border-line bg-white p-4 text-sm">
              <p className="text-xs uppercase tracking-[0.12em] text-muted">{label(item.type)} · {formatDateTime(item.createdAt)}{item.readAt ? "" : " · Unread"}</p>
              <p className="mt-1 font-semibold">{item.title}</p>
              <p>{item.body}</p>
              {item.href ? <Link className="mt-2 inline-block font-semibold text-teal" href={item.href}>Open</Link> : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
