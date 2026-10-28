import Link from "next/link";
import { Forbidden } from "@/components/chrome";
import { canAccessAdmin, type AdminSection } from "@/lib/authz";
import { requireActor } from "@/server/actor";

const links: Array<[string, string, AdminSection]> = [
  ["Overview", "/admin", "home"],
  ["People", "/admin/users", "users"],
  ["Institutions", "/admin/institutions", "institutions"],
  ["Workspaces", "/admin/themes", "themes"],
  ["Projects", "/admin/projects", "projects"],
  ["Resources", "/admin/resources", "resources"],
  ["Events", "/admin/events", "events"],
  ["Monitoring", "/admin/analytics", "analytics"],
  ["Audit log", "/admin/audit-logs", "audit"],
  ["Settings", "/admin/settings", "settings"],
  ["Email outbox", "/admin/email-outbox", "email"],
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const { actor } = await requireActor();
  if (!links.some(([, , section]) => canAccessAdmin(actor, section))) return <Forbidden />;
  return (
    <div>
      <nav aria-label="Administration" className="mb-8 flex gap-3 overflow-x-auto border-b border-line pb-3 text-sm">
        {links.filter(([, , section]) => canAccessAdmin(actor, section)).map(([label, href]) => (
          <Link key={href} className="whitespace-nowrap text-navy hover:text-teal" href={href}>{label}</Link>
        ))}
      </nav>
      {children}
    </div>
  );
}
