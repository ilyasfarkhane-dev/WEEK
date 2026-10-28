import { Forbidden, PageHeader } from "@/components/chrome";
import { SubmitButton } from "@/components/submit-button";
import { isOperator } from "@/lib/authz";
import { prisma } from "@/lib/db";
import { requireActor } from "@/server/actor";
import { saveInstitutionAction } from "@/server/actions/admin";

export const metadata = { title: "Institutions" };

export default async function InstitutionsPage() {
  const { actor } = await requireActor();
  if (!isOperator(actor)) return <Forbidden />;
  const [institutions, countries] = await Promise.all([
    prisma.institution.findMany({ where: { archivedAt: null }, include: { country: true }, orderBy: { name: "asc" } }),
    prisma.country.findMany({ orderBy: { name: "asc" } }),
  ]);
  async function save(formData: FormData) {
    "use server";
    await saveInstitutionAction({
      name: String(formData.get("name") ?? ""),
      countryCode: String(formData.get("countryCode") ?? ""),
      kind: String(formData.get("kind") ?? "agency"),
    });
  }
  return (
    <div>
      <PageHeader eyebrow="Reference data" title="Institutions" description="Use clearly identified demonstration names in non-production environments." />
      <form action={save} className="mb-6 grid gap-3 rounded-lg border border-line bg-white p-5 md:grid-cols-4">
        <input className="rounded-md border border-line px-3 py-2 text-sm" name="name" aria-label="Name" placeholder="Institution name" required />
        <select className="rounded-md border border-line px-3 py-2 text-sm" name="countryCode" aria-label="Country">{countries.map((country) => <option key={country.code} value={country.code}>{country.name}</option>)}</select>
        <select className="rounded-md border border-line px-3 py-2 text-sm" name="kind" aria-label="Kind"><option value="ministry">Ministry</option><option value="agency">Agency</option><option value="international">International organization</option><option value="other">Other</option></select>
        <SubmitButton>Add</SubmitButton>
      </form>
      <ul className="space-y-2 text-sm">{institutions.map((item) => <li key={item.id} className="rounded-md border border-line bg-white px-4 py-3">{item.name} · {item.country.name} · {item.kind}{item.isDemo ? " · demonstration" : ""}</li>)}</ul>
    </div>
  );
}
