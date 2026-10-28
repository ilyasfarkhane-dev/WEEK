import { Forbidden, PageHeader, Pagination } from "@/components/chrome";
import { canAccessAdmin } from "@/lib/authz";
import { prisma } from "@/lib/db";
import { formatDateTime } from "@/lib/format";
import { requireActor } from "@/server/actor";

export const metadata = { title: "Audit log" };

export default async function AuditPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const params = await searchParams;
  const { actor } = await requireActor();
  if (!canAccessAdmin(actor, "audit")) return <Forbidden />;
  const page = Math.max(1, Number(params.page) || 1);
  const [total, rows] = await Promise.all([
    prisma.auditEvent.count(),
    prisma.auditEvent.findMany({ include: { actor: { select: { name: true } } }, orderBy: { createdAt: "desc" }, skip: (page - 1) * 40, take: 40 }),
  ]);
  return (
    <div>
      <PageHeader eyebrow="Security" title="Audit log" description="Security-relevant actions are appended. The log does not include passwords or invitation tokens." />
      <ul className="space-y-2 text-sm">{rows.map((row) => (
        <li key={row.id} className="rounded-md border border-line bg-white px-4 py-3">
          <span className="text-muted">{formatDateTime(row.createdAt)}</span> · {row.action} · {row.entityType}{row.entityId ? ` ${row.entityId}` : ""} · {row.actor?.name ?? "System"}
        </li>
      ))}</ul>
      <Pagination page={page} pages={Math.max(1, Math.ceil(total / 40))} path="/admin/audit-logs" />
    </div>
  );
}
