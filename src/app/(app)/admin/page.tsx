import Link from "next/link";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/chrome";
import { Card } from "@/components/ui/primitives";
import { isOperator } from "@/lib/authz";
import { prisma } from "@/lib/db";
import { requireActor } from "@/server/actor";

export const metadata = { title: "Administration" };

export default async function AdminHomePage() {
  const { actor } = await requireActor();
  if (!isOperator(actor)) redirect("/admin/analytics");
  const [users, openRequests, overdue, themes] = await Promise.all([
    prisma.user.count({ where: { deletedAt: null, status: "ACTIVE" } }),
    prisma.helpRequest.count({ where: { status: "OPEN" } }),
    prisma.actionItem.count({ where: { status: { in: ["OPEN", "IN_PROGRESS"] }, dueOn: { lt: new Date() } } }),
    prisma.theme.count({ where: { archivedAt: null } }),
  ]);
  const items = [
    ["Active accounts", String(users)],
    ["Thematic workspaces", String(themes)],
    ["Unanswered requests", String(openRequests)],
    ["Overdue actions", String(overdue)],
  ];
  return (
    <div>
      <PageHeader eyebrow="Administration" title="Programme operations" description="These counts are read from current records." />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {items.map(([title, value]) => (
          <Card key={title} className="p-4"><p className="text-xs uppercase tracking-[0.14em] text-muted">{title}</p><p className="mt-2 font-serif text-3xl text-navy">{value}</p></Card>
        ))}
      </div>
      <p className="mt-6 text-sm"><Link className="font-semibold text-teal" href="/admin/analytics">Monitoring and targets</Link></p>
    </div>
  );
}
