import { notFound } from "next/navigation";
import { PageHeader } from "@/components/chrome";
import { Badge } from "@/components/ui/primitives";
import { SubmitButton } from "@/components/submit-button";
import { formatDateTime } from "@/lib/format";
import { label } from "@/lib/labels";
import { prisma } from "@/lib/db";
import { requireActor } from "@/server/actor";
import { loadHelp } from "@/server/records";
import { respondToHelpAction } from "@/server/actions/engagement";

export default async function HelpDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { actor } = await requireActor();
  const request = await loadHelp(actor, id);
  if (!request) notFound();
  const candidates = request.skillsRequired
    ? await prisma.user.findMany({
        where: {
          id: { not: request.requesterId },
          status: "ACTIVE",
          deletedAt: null,
          profile: { profileVisibility: "PROGRAMME", expertiseOffered: { not: "" } },
        },
        include: { profile: true, institution: true, expertise: { include: { tag: true } }, memberships: true },
        take: 40,
      })
    : [];
  const matches = candidates.map((person) => {
    const reasons: string[] = [];
    const skills = request.skillsRequired.toLowerCase();
    const overlap = person.expertise.filter((item) => skills.includes(item.tag.label.toLowerCase()));
    if (overlap.length) reasons.push(`Declared expertise overlaps the request: ${overlap.map((item) => item.tag.label).join(", ")}.`);
    if (request.themeId && person.memberships.some((membership) => membership.themeId === request.themeId)) reasons.push("Member of the same thematic workspace.");
    if ((person.profile?.expertiseOffered.length ?? 0) > 0) reasons.push("Profile states expertise they are willing to offer.");
    return { person, reasons };
  }).filter((item) => item.reasons.length > 0).slice(0, 5);
  async function respond(formData: FormData) {
    "use server";
    await respondToHelpAction({
      requestId: String(formData.get("requestId")),
      body: String(formData.get("body") ?? ""),
      status: String(formData.get("status") || "IN_DISCUSSION"),
    });
  }
  return (
    <div>
      <PageHeader eyebrow={request.code} title={request.title} description={request.description} actions={<Badge>{label(request.status)}</Badge>} />
      <p className="text-sm text-muted">{label(request.kind)} · {label(request.priority)} · {request.requester.name}{request.requester.institution ? ` · ${request.requester.institution.name}` : ""}{request.theme ? ` · ${request.theme.name}` : ""}</p>
      {request.skillsRequired ? <p className="mt-3 text-sm">Experience sought: {request.skillsRequired}</p> : null}
      <section className="mt-8">
        <h2 className="font-serif text-2xl text-navy">Possible matches</h2>
        <p className="mt-2 text-sm text-muted">Suggestions use declared expertise, workspace membership, and a willingness to help. They are not assignments, and private profiles are excluded.</p>
        <ul className="mt-3 space-y-3">
          {matches.length === 0 ? <li className="text-sm text-muted">No explainable match in programme-visible profiles.</li> : matches.map(({ person, reasons }) => (
            <li key={person.id} className="rounded-md border border-line bg-white p-4 text-sm">
              <p className="font-semibold">{person.name}</p>
              <p className="text-muted">{person.profile?.title}{person.institution ? ` · ${person.institution.name}` : ""}</p>
              <ul className="mt-2 list-disc ps-5">{reasons.map((reason) => <li key={reason}>{reason}</li>)}</ul>
            </li>
          ))}
        </ul>
      </section>
      <section className="mt-8">
        <h2 className="font-serif text-2xl text-navy">Responses</h2>
        <ul className="mt-3 space-y-3">{request.responses.map((response) => <li key={response.id} className="rounded-md border border-line bg-white p-4 text-sm"><p>{response.body}</p><p className="text-muted">{response.author.name} · {formatDateTime(response.createdAt)}</p></li>)}</ul>
        <form action={respond} className="mt-4 space-y-3">
          <input type="hidden" name="requestId" value={request.id} />
          <label className="block text-sm font-semibold" htmlFor="body">Your response</label>
          <textarea className="min-h-24 w-full rounded-md border border-line px-3 py-2 text-sm" id="body" name="body" required />
          <label className="block text-sm font-semibold" htmlFor="status">Update status</label>
          <select className="rounded-md border border-line px-3 py-2 text-sm" id="status" name="status" defaultValue={request.status === "OPEN" ? "IN_DISCUSSION" : request.status}>
            {["OPEN", "MATCHED", "IN_DISCUSSION", "RESOLVED", "CLOSED"].map((item) => <option key={item} value={item}>{label(item)}</option>)}
          </select>
          <SubmitButton>Post response</SubmitButton>
        </form>
      </section>
    </div>
  );
}
