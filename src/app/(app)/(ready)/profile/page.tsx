import { PageHeader } from "@/components/chrome";
import { ProfileForm } from "@/components/record-forms";
import { prisma } from "@/lib/db";
import { requireUser, toActor } from "@/server/actor";

export const metadata = { title: "Profile" };

export default async function ProfilePage() {
  const user = await requireUser();
  const actor = toActor(user);
  const [institutions, countries, tags, themes, expertise] = await Promise.all([
    prisma.institution.findMany({ where: { archivedAt: null }, orderBy: { name: "asc" } }),
    prisma.country.findMany({ orderBy: { name: "asc" } }),
    prisma.expertiseTag.findMany({ orderBy: { label: "asc" } }),
    prisma.theme.findMany({ where: { archivedAt: null }, orderBy: { sortOrder: "asc" } }),
    prisma.userExpertise.findMany({ where: { userId: user.id } }),
  ]);
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader eyebrow="Profile" title="Your profile" description="This is what other members may see, within the visibility you choose. Your email is not shown in the directory." />
      <ProfileForm
        mode="profile"
        defaults={{
          fullName: user.profile?.fullName ?? user.name,
          title: user.profile?.title ?? "",
          institutionId: user.institutionId ?? "",
          countryCode: user.profile?.countryCode ?? "",
          biography: user.profile?.biography ?? "",
          expertise: expertise.map((item) => item.tagId),
          themesOfInterest: user.profile?.themesOfInterest ?? [],
          expertiseOffered: user.profile?.expertiseOffered ?? "",
          supportRequested: user.profile?.supportRequested ?? "",
          preferredLanguage: user.profile?.preferredLanguage ?? "en",
          profileVisibility: user.profile?.profileVisibility ?? "PROGRAMME",
        }}
        institutions={institutions.map((item) => ({ id: item.id, label: item.name }))}
        countries={countries.map((item) => ({ id: item.code, label: item.name }))}
        tags={tags.map((item) => ({ id: item.id, label: item.label }))}
        themes={themes.map((item) => ({ id: item.id, label: item.name }))}
      />
      <p className="mt-6 text-sm text-muted">Primary workspace id on file: {actor.primaryThemeId ?? "none"}.</p>
    </div>
  );
}
