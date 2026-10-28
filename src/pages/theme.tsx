import { useSearchParams } from "react-router-dom";
import { Link } from "@/components/link";
import { ActionForm } from "@/components/action-form";
import { PageHeader } from "@/components/chrome";
import { SubmitButton } from "@/components/submit-button";
import { Alert } from "@/components/ui/primitives";
import { useView } from "@/client/use-view";
import { formatDate, formatDateTime } from "@/lib/format";
import { label } from "@/lib/labels";

type ThemeView = {
  canPost: boolean;
  canNote: boolean;
  theme: {
    id: string;
    sortOrder: number;
    name: string;
    summary: string;
    objectives: string;
    facilitator: { name: string } | null;
    memberships: Array<{ id: string; name: string; role: string; primary: boolean; title: string; institution: string; expertise: string[] }>;
    projects: Array<{ id: string; code: string; stage: string }>;
    challenges: Array<{ id: string; title: string }>;
    comments: Array<{ id: string; body: string; createdAt: string; author: { name: string } }>;
    notes: Array<{ id: string; kind: string; title: string; body: string; author: { name: string } }>;
    actions: Array<{ id: string; title: string; dueOn: string | null; owner: { name: string } | null }>;
    events: Array<{ id: string; title: string }>;
    resources: Array<{ id: string; title: string }>;
    activities: Array<{ id: string; createdAt: string; summary: string }>;
  };
};

export function ThemePage() {
  const view = useView<ThemeView>();
  const [query] = useSearchParams();
  if (view.status === "loading") return <p className="text-sm text-muted" role="status">Loading the workspace…</p>;
  if (view.status !== "ready") return <p className="text-sm">That page is not available.</p>;
  const { theme, canPost, canNote } = view.data;
  return (
    <div className="space-y-8">
      {query.get("error") ? <Alert tone="danger">{query.get("error")}</Alert> : null}
      {query.get("notice") ? <Alert tone="ok">{query.get("notice")}</Alert> : null}
      <PageHeader eyebrow={`Workspace ${theme.sortOrder}`} title={theme.name} description={theme.summary} />
      <p className="max-w-3xl text-sm leading-7">{theme.objectives}</p>
      <p className="text-sm text-muted">Facilitator: {theme.facilitator?.name ?? "Not assigned"}</p>
      <section>
        <h2 className="font-serif text-2xl text-navy">Members</h2>
        <ul className="mt-3 grid gap-3 md:grid-cols-2">
          {theme.memberships.map((membership) => (
            <li key={membership.id} className="rounded-md border border-line bg-white p-4 text-sm">
              <p className="font-semibold">{membership.name}</p>
              <p className="text-muted">{label(membership.role)}{membership.primary ? " · Primary team" : ""}{membership.title ? ` · ${membership.title}` : ""}</p>
              {membership.institution ? <p className="text-muted">{membership.institution}</p> : null}
              {membership.expertise.length ? <p className="mt-1 text-muted">{membership.expertise.join(", ")}</p> : null}
            </li>
          ))}
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
          <ActionForm name="theme.comment" className="mt-4 space-y-3">
            <input type="hidden" name="themeId" value={theme.id} />
            <textarea className="min-h-24 w-full rounded-md border border-line px-3 py-2 text-sm" name="body" aria-label="Discussion post" required />
            <SubmitButton>Post</SubmitButton>
          </ActionForm>
        ) : <p className="mt-3 text-sm text-muted">Join this workspace before posting.</p>}
      </section>
      <section>
        <h2 className="font-serif text-2xl text-navy">Decisions and meeting notes</h2>
        <ul className="mt-3 space-y-3">{theme.notes.map((item) => <li key={item.id} className="rounded-md border border-line bg-white p-4 text-sm"><p className="text-xs uppercase tracking-[0.12em] text-muted">{item.kind === "DECISION" ? "Decision" : "Meeting note"}</p><p className="font-semibold">{item.title}</p><p>{item.body}</p><p className="text-muted">{item.author.name}</p></li>)}</ul>
        {canNote ? (
          <ActionForm name="theme.note" className="mt-4 grid gap-3">
            <input type="hidden" name="themeId" value={theme.id} />
            <select className="rounded-md border border-line px-3 py-2 text-sm" name="kind" aria-label="Note type"><option value="DECISION">Decision</option><option value="MEETING">Meeting note</option></select>
            <input className="rounded-md border border-line px-3 py-2 text-sm" name="title" aria-label="Note title" required />
            <textarea className="min-h-20 rounded-md border border-line px-3 py-2 text-sm" name="body" aria-label="Note" required />
            <SubmitButton variant="secondary">Save note</SubmitButton>
          </ActionForm>
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
