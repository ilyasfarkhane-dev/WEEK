import { Forbidden, PageHeader } from "@/components/chrome";
import { HelpForm } from "@/components/record-forms";
import { isCommunityMember } from "@/lib/authz";
import { prisma } from "@/lib/db";
import { requireActor } from "@/server/actor";

export const metadata = { title: "New request" };

export default async function NewHelpPage() {
  const { actor } = await requireActor();
  if (!isCommunityMember(actor)) return <Forbidden />;
  const themes = await prisma.theme.findMany({ where: { archivedAt: null }, orderBy: { sortOrder: "asc" } });
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader eyebrow="Exchange" title="Publish a request" description="Say what you need and which experience would help. The request is visible according to the classification you choose." />
      <HelpForm themes={themes.map((theme) => ({ id: theme.id, label: theme.name }))} />
    </div>
  );
}
