import { redirect } from "next/navigation";
import { ProfileForm } from "@/components/record-forms";
import { PageHeader } from "@/components/chrome";
import { prisma } from "@/lib/db";
import { isPlatformAdmin } from "@/lib/authz";
import { requireUser, toActor } from "@/server/actor";

export const metadata = { title: "Onboarding" };

export default async function OnboardingPage() {
  const user = await requireUser();
  const actor = toActor(user);
  if (user.onboardingCompletedAt) redirect("/dashboard");
  const [settings, institutions, countries, tags, themes] = await Promise.all([
    prisma.programmeSettings.findUnique({ where: { id: "default" } }),
    prisma.institution.findMany({ where: { archivedAt: null }, orderBy: { name: "asc" } }),
    prisma.country.findMany({ orderBy: { name: "asc" } }),
    prisma.expertiseTag.findMany({ orderBy: { label: "asc" } }),
    prisma.theme.findMany({ where: { archivedAt: null }, orderBy: { sortOrder: "asc" } }),
  ]);
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        eyebrow="First sign-in"
        title={`Welcome, ${user.name.split(" ")[0]}`}
        description="Complete your professional profile and accept the participation rules. You can change these choices later."
      />
      {isPlatformAdmin(actor) ? <p className="mb-4 text-sm text-muted">Administrators may leave onboarding unfinished, but a completed profile helps the community.</p> : null}
      <ProfileForm
        mode="onboarding"
        rules={settings?.rulesText ?? "Participation rules have not been published yet."}
        defaults={{
          fullName: user.profile?.fullName || user.name,
          title: user.profile?.title ?? "",
          institutionId: user.institutionId ?? "",
          countryCode: user.profile?.countryCode ?? "",
          biography: user.profile?.biography ?? "",
          expertise: [],
          themesOfInterest: actor.primaryThemeId ? [actor.primaryThemeId] : [],
          expertiseOffered: "",
          supportRequested: "",
          preferredLanguage: "en",
          profileVisibility: "PROGRAMME",
        }}
        institutions={institutions.map((item) => ({ id: item.id, label: `${item.name} (${item.countryCode})` }))}
        countries={countries.map((item) => ({ id: item.code, label: item.name }))}
        tags={tags.map((item) => ({ id: item.id, label: item.label }))}
        themes={themes.map((item) => ({ id: item.id, label: item.name }))}
      />
    </div>
  );
}
