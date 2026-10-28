import { notFound } from "next/navigation";
import Link from "next/link";
import { PageHeader } from "@/components/chrome";
import { SubmitButton } from "@/components/submit-button";
import { profileAccess } from "@/lib/authz";
import { formatDate, formatDateTime } from "@/lib/format";
import { label } from "@/lib/labels";
import { prisma } from "@/lib/db";
import { requireActor } from "@/server/actor";
import { projectWhere, challengeWhere, resourceWhere } from "@/server/access";
import { addCommentAction } from "@/server/actions/collaboration";
import { addThemeNoteAction } from "@/server/actions/admin";
import { isOperator } from "@/lib/authz";

export default async function ThemePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { actor } = await requireActor();
  const theme = await prisma.theme.findUnique({
    where: { slug },
    include: {
      facilitator: { select: { name: true } },
      memberships: { include: { user: { include: { profile: true, institution: true, expertise: { include: { tag: true } }, memberships: true } } } },
      projects: { where: { AND: [{ archivedAt: null }, projectWhere(actor)] }, take: 8, orderBy: { updatedAt: "desc" } },
      challenges: { where: { AND: [{ archivedAt: null }, challengeWhere(actor)] }, take: 8, orderBy: { updatedAt: "desc" } },
      resources: { where: { AND: [resourceWhere(actor)] }, take: 6 },
      events: { where: { startsAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } }, orderBy: { startsAt: "asc" }, take: 6 },
      actions: { where: { status: { in: ["OPEN", "IN_PROGRESS"] } }, include: { owner: { select: { name: true } } }, take: 8 },
      comments: { where: { deletedAt: null }, include: { author: { select: { name: true } } }, orderBy: { createdAt: "desc" }, take: 20 },
      notes: { include: { author: { select: { name: true } } }, orderBy: { createdAt: "desc" }, take: 10 },
      activities: { orderBy: { createdAt: "desc" }, take: 8 },
    },
  });
  if (!theme || theme.archivedAt) notFound();
  const canPost = isOperator(actor) || actor.themeIds.includes(theme.id) || actor.facilitatedThemeIds.includes(theme.id);
  async function comment(formData: FormData) {
    "use server";
    await addCommentAction({ body: String(formData.get("body") ?? ""), themeId: String(formData.get("themeId")) });
  }
  async function note(formData: FormData) {
    "use server";
    const kind = formData.get("kind") === "MEETING" ? "MEETING" : "DECISION";
    await addThemeNoteAction({ themeId: String(formData.get("themeId")), kind, title: String(formData.get("title") ?? ""), body: String(formData.get("body") ?? "") });
  }
  return (
    <div className="space-y-8">
      <PageHeader eyebrow={`Workspace ${theme.sortOrder}`} title={theme.name} description={theme.summary} />
      <p className="max-w-3xl text-sm leading-7">{theme.objectives}</p>
      <p className="text-sm text-muted">Facilitator: {theme.facilitator?.name ?? "Not assigned"}</p>
      <section>
        <h2 className="font-serif text-2xl text-navy">Members</h2>
        <ul className="mt-3 grid gap-3 md:grid-cols-2">
          {theme.memberships.map((membership) => {
            const access = membership.user.profile
              ? profileAccess(actor, { userId: membership.userId, visibility: membership.user.profile.profileVisibility, themeIds: membership.user.memberships.map((item) => item.themeId) })
              : "none";
            if (access === "none") return null;
            return (
              <li key={membership.id} className="rounded-md border border-line bg-white p-4 text-sm">
                <p className="font-semibold">{membership.user.name}</p>
                <p className="text-muted">{label(membership.role)}{membership.isPrimary ? " · Primary team" : ""}{membership.user.profile?.title ? ` · ${membership.user.profile.title}` : ""}</p>
                {membership.user.institution ? <p className="text-muted">{membership.user.institution.name}</p> : null}
                {access === "full" || access === "limited" ? <p className="mt-1 text-muted">{membership.user.expertise.map((item) => item.tag.label).join(", ")}</p> : null}
              </li>
            );
          })}
        </ul>
      </section>
      <section className="grid gap-6 lg:grid-cols-2">
        <div>
          <h2 className="font-serif text-2xl text-navy">Projects</h2>
          <ul className="mt-3 space-y-2 text-sm">{theme.projects.map((project) => <li key={project.id}><Link className="font-semibold text-navy" href={`/projects/${project.id}`}>{project.code}</Link> · {label(project.stage)}</li>)}</ul>
        </div>
        <div>
          <h2 className="font-serif text-2xl text-navy">Challenges</h2>
          <ul className="mt-3 space-y-2 text-sm">{theme.challenges.map((challenge) => <li key={challenge.id}><Link className="font-semibold text-navy" href={`/challenges/${challenge.id}`}>{challenge.title}</Link></li>)}</ul>
        </div>
      </section>
      <section>
        <h2 className="font-serif text-2xl text-navy">Discussion</h2>
        <ul className="mt-3 space-y-3">{theme.comments.map((comment) => <li key={comment.id} className="rounded-md border border-line bg-white p-4 text-sm"><p>{comment.body}</p><p className="text-muted">{comment.author.name} · {formatDateTime(comment.createdAt)}</p></li>)}</ul>
        {canPost ? (
          <form action={comment} className="mt-4 space-y-3">
            <input type="hidden" name="themeId" value={theme.id} />
            <textarea className="min-h-24 w-full rounded-md border border-line px-3 py-2 text-sm" name="body" aria-label="Discussion post" required />
            <SubmitButton>Post</SubmitButton>
          </form>
        ) : <p className="mt-3 text-sm text-muted">Join this workspace before posting.</p>}
      </section>
      <section>
        <h2 className="font-serif text-2xl text-navy">Decisions and meeting notes</h2>
        <ul className="mt-3 space-y-3">{theme.notes.map((item) => <li key={item.id} className="rounded-md border border-line bg-white p-4 text-sm"><p className="text-xs uppercase tracking-[0.12em] text-muted">{item.kind === "DECISION" ? "Decision" : "Meeting note"}</p><p className="font-semibold">{item.title}</p><p>{item.body}</p><p className="text-muted">{item.author.name}</p></li>)}</ul>
        {actor.facilitatedThemeIds.includes(theme.id) || isOperator(actor) ? (
          <form action={note} className="mt-4 grid gap-3">
            <input type="hidden" name="themeId" value={theme.id} />
            <select className="rounded-md border border-line px-3 py-2 text-sm" name="kind" aria-label="Note type"><option value="DECISION">Decision</option><option value="MEETING">Meeting note</option></select>
            <input className="rounded-md border border-line px-3 py-2 text-sm" name="title" aria-label="Note title" required />
            <textarea className="min-h-20 rounded-md border border-line px-3 py-2 text-sm" name="body" aria-label="Note" required />
            <SubmitButton variant="secondary">Save note</SubmitButton>
          </form>
        ) : null}
      </section>
      <section className="grid gap-6 lg:grid-cols-2">
        <div>
          <h2 className="font-serif text-2xl text-navy">Open actions</h2>
          <ul className="mt-3 space-y-2 text-sm">{theme.actions.map((action) => <li key={action.id}>{action.title} · {action.owner?.name ?? "Unassigned"} · {formatDate(action.dueOn)}</li>)}</ul>
        </div>
        <div>
          <h2 className="font-serif text-2xl text-navy">Sessions and resources</h2>
          <ul className="mt-3 space-y-2 text-sm">{theme.events.map((event) => <li key={event.id}><Link href={`/events/${event.id}`}>{event.title}</Link></li>)}{theme.resources.map((resource) => <li key={resource.id}><Link href={`/knowledge/${resource.id}`}>{resource.title}</Link></li>)}</ul>
        </div>
      </section>
      <section>
        <h2 className="font-serif text-2xl text-navy">Recent activity</h2>
        <ul className="mt-3 space-y-1 text-sm">{theme.activities.map((item) => <li key={item.id}>{formatDateTime(item.createdAt)} · {item.summary}</li>)}</ul>
      </section>
    </div>
  );
}
