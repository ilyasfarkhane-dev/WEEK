import { Forbidden, PageHeader } from "@/components/chrome";
import { canAccessAdmin } from "@/lib/authz";
import { prisma } from "@/lib/db";
import { formatDateTime } from "@/lib/format";
import { requireActor } from "@/server/actor";

export const metadata = { title: "Email outbox" };

export default async function OutboxPage() {
  const { actor } = await requireActor();
  if (!canAccessAdmin(actor, "email")) return <Forbidden />;
  const rows = await prisma.emailOutbox.findMany({ orderBy: { createdAt: "desc" }, take: 50 });
  return (
    <div>
      <PageHeader eyebrow="Email" title="Outbox" description="Messages stay here when no provider is configured. A SKIPPED or FAILED status means the message was not delivered." />
      <ul className="space-y-3">
        {rows.map((row) => (
          <li key={row.id} className="rounded-md border border-line bg-white p-4 text-sm">
            <p className="font-semibold">{row.status} · {row.subject}</p>
            <p className="text-muted">To {row.toAddress} · {formatDateTime(row.createdAt)}</p>
            <p className="mt-2">{row.detail}</p>
            <pre className="mt-2 whitespace-pre-wrap text-xs">{row.body}</pre>
          </li>
        ))}
      </ul>
    </div>
  );
}
