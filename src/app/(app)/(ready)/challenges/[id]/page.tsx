import { notFound } from "next/navigation";
import Link from "next/link";
import { DefinitionList, PageHeader } from "@/components/chrome";
import { Badge } from "@/components/ui/primitives";
import { SubmitButton } from "@/components/submit-button";
import { canReadProjectNarrative, canReviewChallenge } from "@/lib/authz";
import { formatDateTime } from "@/lib/format";
import { label } from "@/lib/labels";
import { requireActor } from "@/server/actor";
import { loadChallenge } from "@/server/records";
import { reviewChallengeAction, addCommentAction } from "@/server/actions/collaboration";
import { prisma } from "@/lib/db";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return { title: `Challenge ${id.slice(0, 6)}` };
}

export default async function ChallengeDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { actor } = await requireActor();
  const loaded = await loadChallenge(actor, id);
  if (!loaded) notFound();
  const { challenge, level } = loaded;
  const narrative = canReadProjectNarrative(level);
  const others = narrative && canReviewChallenge(actor, challenge.themeId)
    ? await prisma.challenge.findMany({ where: { themeId: challenge.themeId, id: { not: challenge.id } }, select: { id: true, code: true, title: true }, take: 30 })
    : [];
  async function review(formData: FormData) {
    "use server";
    await reviewChallengeAction({
      challengeId: String(formData.get("challengeId") ?? ""),
      status: String(formData.get("status") ?? ""),
      decisionNote: String(formData.get("decisionNote") ?? ""),
      mergedIntoId: String(formData.get("mergedIntoId") ?? "") || undefined,
    });
  }
  async function comment(formData: FormData) {
    "use server";
    await addCommentAction({ body: String(formData.get("body") ?? ""), challengeId: String(formData.get("challengeId") ?? "") });
  }
  return (
    <div>
      <PageHeader
        eyebrow={challenge.code}
        title={narrative ? challenge.title : "Restricted challenge"}
        description={narrative ? undefined : "You can see that this record exists for programme coordination. The narrative is not shared with your role."}
        actions={<Badge>{label(challenge.status)}</Badge>}
      />
      <DefinitionList items={[
        { term: "Status", detail: label(challenge.status) },
        { term: "Theme", detail: challenge.theme.name },
        { term: "Institution", detail: challenge.institution.name },
        { term: "Country", detail: challenge.country.name },
        { term: "Updated", detail: formatDateTime(challenge.updatedAt) },
        { term: "Classification", detail: `${label(challenge.visibility)} · ${label(challenge.confidentiality)}` },
      ]} />
      {narrative ? (
        <div className="mt-8 space-y-6 text-sm leading-7">
          {[
            ["Problem statement", challenge.problemStatement],
            ["Context", challenge.context],
            ["Affected users", challenge.affectedUsers],
            ["Evidence", challenge.evidence],
            ["Previous attempts", challenge.previousAttempts],
            ["Expected benefit", challenge.expectedBenefit],
            ["Expertise required", challenge.expertiseRequired],
          ].map(([title, body]) => (
            <section key={title}>
              <h2 className="font-serif text-2xl text-navy">{title}</h2>
              <p className="mt-2 whitespace-pre-wrap">{body || "Not provided."}</p>
            </section>
          ))}
          <p className="text-muted">Owner: {challenge.owner.name}. Created {formatDateTime(challenge.createdAt)}.</p>
        </div>
      ) : null}
      {challenge.projects.length > 0 ? (
        <section className="mt-8">
          <h2 className="font-serif text-2xl text-navy">Linked projects</h2>
          <ul className="mt-3 space-y-2">{challenge.projects.map((project) => <li key={project.id}><Link className="font-semibold text-teal" href={`/projects/${project.id}`}>{project.code} · {project.title}</Link></li>)}</ul>
        </section>
      ) : null}
      <section className="mt-8">
        <h2 className="font-serif text-2xl text-navy">Review history</h2>
        {challenge.reviews.length === 0 ? <p className="mt-2 text-sm text-muted">No review has been recorded yet.</p> : (
          <ol className="mt-3 space-y-3">
            {challenge.reviews.map((review) => (
              <li key={review.id} className="rounded-md border border-line bg-white p-4 text-sm">
                <p className="font-semibold">{label(review.fromStatus)} → {label(review.toStatus)}</p>
                <p className="mt-1">{review.decisionNote}</p>
                <p className="mt-1 text-muted">{review.reviewer.name} · {formatDateTime(review.createdAt)}</p>
              </li>
            ))}
          </ol>
        )}
      </section>
      {canReviewChallenge(actor, challenge.themeId) && narrative ? (
        <form action={review} className="mt-6 space-y-3 rounded-lg border border-line bg-white p-5">
          <h2 className="font-serif text-2xl text-navy">Record a review</h2>
          <input type="hidden" name="challengeId" value={challenge.id} />
          <label className="block text-sm font-semibold" htmlFor="status">Outcome</label>
          <select className="w-full rounded-md border border-line px-3 py-2 text-sm" id="status" name="status" defaultValue={challenge.status}>
            {["SUBMITTED", "UNDER_REVIEW", "SELECTED", "MERGED", "REFERRED", "RETAINED", "CLOSED"].map((item) => <option key={item} value={item}>{label(item)}</option>)}
          </select>
          <label className="block text-sm font-semibold" htmlFor="mergedIntoId">Merge into</label>
          <select className="w-full rounded-md border border-line px-3 py-2 text-sm" id="mergedIntoId" name="mergedIntoId">
            <option value="">Not a merge</option>
            {others.map((item) => <option key={item.id} value={item.id}>{item.code} · {item.title}</option>)}
          </select>
          <label className="block text-sm font-semibold" htmlFor="decisionNote">Note to the contributor</label>
          <textarea className="min-h-28 w-full rounded-md border border-line px-3 py-2 text-sm" id="decisionNote" name="decisionNote" required minLength={5} />
          <SubmitButton>Save review</SubmitButton>
        </form>
      ) : null}
      {narrative ? (
        <section className="mt-8">
          <h2 className="font-serif text-2xl text-navy">Discussion</h2>
          <ul className="mt-3 space-y-3">{challenge.comments.map((comment) => <li key={comment.id} className="rounded-md border border-line bg-white p-4 text-sm"><p>{comment.body}</p><p className="mt-1 text-muted">{comment.author.name}</p></li>)}</ul>
          <form action={comment} className="mt-4 space-y-3">
            <input type="hidden" name="challengeId" value={challenge.id} />
            <label className="block text-sm font-semibold" htmlFor="body">Add a comment</label>
            <textarea className="min-h-24 w-full rounded-md border border-line px-3 py-2 text-sm" id="body" name="body" required />
            <SubmitButton>Post comment</SubmitButton>
          </form>
        </section>
      ) : null}
    </div>
  );
}
