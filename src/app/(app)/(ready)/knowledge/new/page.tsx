import { Forbidden, PageHeader } from "@/components/chrome";
import { SubmitButton } from "@/components/submit-button";
import { isCommunityMember } from "@/lib/authz";
import { prisma } from "@/lib/db";
import { requireActor } from "@/server/actor";
import { createResourceForm } from "@/server/actions/engagement";

export const metadata = { title: "Add a resource" };

export default async function NewResourcePage() {
  const { actor } = await requireActor();
  if (!isCommunityMember(actor)) return <Forbidden />;
  const themes = await prisma.theme.findMany({ where: { archivedAt: null }, orderBy: { sortOrder: "asc" } });
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader eyebrow="Library" title="Add a resource" description="Community submissions stay labelled as community contributions until a manager verifies them." />
      <form action={createResourceForm} className="space-y-3" encType="multipart/form-data">
        <input className="w-full rounded-md border border-line px-3 py-2 text-sm" name="title" aria-label="Title" required />
        <textarea className="min-h-28 w-full rounded-md border border-line px-3 py-2 text-sm" name="description" aria-label="Description" required />
        <select className="w-full rounded-md border border-line px-3 py-2 text-sm" name="type" aria-label="Type">
          {["CASE_STUDY", "TEMPLATE", "POLICY", "RESEARCH", "GUIDE", "WORKSHOP", "LESSON", "PRESENTATION"].map((item) => <option key={item} value={item}>{item}</option>)}
        </select>
        <select className="w-full rounded-md border border-line px-3 py-2 text-sm" name="themeId" aria-label="Theme"><option value="">Cross-cutting</option>{themes.map((theme) => <option key={theme.id} value={theme.id}>{theme.name}</option>)}</select>
        <select className="w-full rounded-md border border-line px-3 py-2 text-sm" name="language" aria-label="Language"><option value="en">English</option><option value="fr">French</option><option value="ar">Arabic</option></select>
        <input className="w-full rounded-md border border-line px-3 py-2 text-sm" name="source" aria-label="Source" placeholder="Source" />
        <input className="w-full rounded-md border border-line px-3 py-2 text-sm" name="attribution" aria-label="Attribution" placeholder="Attribution" />
        <input className="w-full rounded-md border border-line px-3 py-2 text-sm" name="authorName" aria-label="Author" placeholder="Author or institution" />
        <input className="w-full rounded-md border border-line px-3 py-2 text-sm" name="tags" aria-label="Tags" placeholder="Tags, separated by commas" />
        <input className="w-full rounded-md border border-line px-3 py-2 text-sm" name="externalUrl" aria-label="URL" placeholder="https://" />
        <input className="w-full rounded-md border border-line px-3 py-2 text-sm" type="date" name="publishedOn" aria-label="Publication date" />
        <input className="w-full text-sm" type="file" name="file" aria-label="File" />
        <input type="hidden" name="visibility" value="TEAM" />
        <input type="hidden" name="verification" value="COMMUNITY" />
        <p className="text-sm text-muted">PDF, text, CSV, PNG, or JPEG. Maximum 8 MB.</p>
        <SubmitButton>Save resource</SubmitButton>
      </form>
    </div>
  );
}
