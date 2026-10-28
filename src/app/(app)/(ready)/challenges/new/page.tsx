import { ChallengeForm } from "@/components/record-forms";
import { PageHeader } from "@/components/chrome";
import { canCreateChallenge } from "@/lib/authz";
import { prisma } from "@/lib/db";
import { requireActor } from "@/server/actor";
import { Forbidden } from "@/components/chrome";

export const metadata = { title: "Submit a challenge" };

export default async function NewChallengePage() {
  const { actor } = await requireActor();
  if (!canCreateChallenge(actor)) return <Forbidden body="Participants, facilitators, and programme managers can submit challenges." />;
  const themeIds = actor.themeIds.length ? actor.themeIds : actor.facilitatedThemeIds;
  const [institutions, countries, themes] = await Promise.all([
    prisma.institution.findMany({ where: { archivedAt: null }, orderBy: { name: "asc" } }),
    prisma.country.findMany({ orderBy: { name: "asc" } }),
    prisma.theme.findMany({
      where: { archivedAt: null, ...(themeIds.length && !actor.roles.includes("PROGRAMME_MANAGER") && !actor.roles.includes("PLATFORM_ADMIN") ? { id: { in: themeIds } } : {}) },
      orderBy: { sortOrder: "asc" },
    }),
  ]);
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader eyebrow="Challenge register" title="Submit a challenge" description="Describe the problem as it is experienced. A facilitator will review it. The default classification is confidential to your workspace." />
      <ChallengeForm
        institutions={institutions.map((item) => ({ id: item.id, label: item.name }))}
        countries={countries.map((item) => ({ id: item.code, label: item.name }))}
        themes={themes.map((item) => ({ id: item.id, label: item.name }))}
      />
    </div>
  );
}
