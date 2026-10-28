import { Forbidden, PageHeader } from "@/components/chrome";
import { SubmitButton } from "@/components/submit-button";
import { canAccessAdmin, isPlatformAdmin } from "@/lib/authz";
import { prisma } from "@/lib/db";
import { label } from "@/lib/labels";
import { requireActor } from "@/server/actor";
import { anonymizeUserForm, importInvitationsForm, setUserStatusForm } from "@/server/actions/admin";
import { InvitePanel } from "@/components/invite-panel";

export const metadata = { title: "People" };

export default async function UsersAdminPage() {
  const { actor } = await requireActor();
  if (!canAccessAdmin(actor, "users")) return <Forbidden />;
  const [users, themes, institutions] = await Promise.all([
    prisma.user.findMany({ where: { deletedAt: null }, include: { roles: true, institution: true }, orderBy: { name: "asc" }, take: 120 }),
    prisma.theme.findMany({ where: { archivedAt: null }, orderBy: { sortOrder: "asc" } }),
    prisma.institution.findMany({ where: { archivedAt: null }, orderBy: { name: "asc" } }),
  ]);
  return (
    <div className="space-y-8">
      <PageHeader eyebrow="Cohort" title="People and invitations" description="Invitations expire after 14 days. The registration link is shown to you because email delivery is not assumed." />
      <InvitePanel themes={themes} institutions={institutions} />
      <form action={importInvitationsForm} className="rounded-lg border border-line bg-white p-5" encType="multipart/form-data">
        <h2 className="font-serif text-2xl text-navy">CSV import</h2>
        <p className="mt-2 text-sm text-muted">Columns: full_name, email, role, theme_slug, institution_name. Role may use PARTICIPANT or several roles separated by |. Up to 200 rows.</p>
        <input className="mt-3 block text-sm" type="file" name="file" accept=".csv,text/csv" required aria-label="CSV file" />
        <div className="mt-3"><SubmitButton>Import invitations</SubmitButton></div>
      </form>
      <div className="overflow-x-auto rounded-lg border border-line bg-white">
        <table className="w-full min-w-[720px] text-sm">
          <thead className="border-b border-line text-xs uppercase tracking-[0.12em] text-muted"><tr><th className="px-3 py-2 text-start">Name</th><th className="px-3 py-2 text-start">Email</th><th className="px-3 py-2 text-start">Roles</th><th className="px-3 py-2 text-start">Status</th><th className="px-3 py-2 text-start">Actions</th></tr></thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id} className="border-b border-line">
                <td className="px-3 py-2">{user.name}{user.isDemo ? " · demo" : ""}</td>
                <td className="px-3 py-2">{user.email}</td>
                <td className="px-3 py-2">{user.roles.map((role) => label(role.role)).join(", ")}</td>
                <td className="px-3 py-2">{label(user.status)}</td>
                <td className="px-3 py-2">
                  {isPlatformAdmin(actor) ? (
                    <div className="flex gap-2">
                      <form action={setUserStatusForm}>
                        <input type="hidden" name="userId" value={user.id} />
                        <input type="hidden" name="status" value={user.status === "SUSPENDED" ? "ACTIVE" : "SUSPENDED"} />
                        <SubmitButton variant="secondary">{user.status === "SUSPENDED" ? "Reinstate" : "Suspend"}</SubmitButton>
                      </form>
                      <form action={anonymizeUserForm}>
                        <input type="hidden" name="userId" value={user.id} />
                        <SubmitButton variant="danger">Archive</SubmitButton>
                      </form>
                    </div>
                  ) : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

