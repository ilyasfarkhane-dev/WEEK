import { useSearchParams } from "react-router-dom";
import { Link } from "@/components/link";
import { ActionForm } from "@/components/action-form";
import { DefinitionList, PageHeader } from "@/components/chrome";
import { SubmitButton } from "@/components/submit-button";
import { Alert, Badge } from "@/components/ui/primitives";
import { buttonClass } from "@/components/ui/button";
import { useView } from "@/client/use-view";
import { formatDate, formatDateTime } from "@/lib/format";
import { label } from "@/lib/labels";

const STAGES = ["PROBLEM_DEFINED", "PROPOSAL_DEVELOPED", "AUTHORIZATION_SOUGHT", "TEST_APPROVED", "TESTING", "EVIDENCE_REVIEWED", "DECISION_RECORDED"] as const;

type ProjectView = {
  narrative: boolean;
  editable: boolean;
  operator: boolean;
  viewerId: string;
  approved: boolean;
  institutions: Array<{ id: string; name: string }>;
  people: Array<{ id: string; name: string; email: string }>;
  project: {
    id: string;
    code: string;
    title: string;
    summary: string;
    baseline: string;
    successIndicators: string;
    resourcesNeeded: string;
    risks: string;
    dependencies: string;
    resultsSummary: string;
    lessonsLearned: string;
    stage: string;
    status: string;
    finalDecision: string;
    decisionJustification: string;
    theme: { name: string };
    lead: { name: string };
    institution: { name: string };
    country: { name: string };
    canvas: { id: string } | null;
    challenge: { id: string; code: string } | null;
    approvals: Array<{ id: string; state: string; sponsorName: string; decisionNote: string | null; decidedAt: string | null; requestedAt: string | null; createdAt: string; institution: { name: string } }>;
    commitments: Array<{ id: string; statement: string; createdAt: string; user: { name: string } }>;
    actions: Array<{ id: string; title: string; status: string; dueOn: string | null; ownerId: string | null; owner: { name: string } | null }>;
    members: Array<{ userId: string; user: { name: string } }>;
    outcomes: Array<{ id: string; evidenceLevel: string; indicator: string; valueText: string; definition: string; notes: string | null }>;
    activities: Array<{ id: string; createdAt: string; summary: string; actor: { name: string } | null }>;
  };
};

export function ProjectPage() {
  const view = useView<ProjectView>();
  const [query] = useSearchParams();
  if (view.status === "loading") return <p className="text-sm text-muted" role="status">Loading the workspace…</p>;
  if (view.status !== "ready") return <p className="text-sm">That page is not available.</p>;
  const { project, narrative, editable, operator, viewerId, approved, institutions, people } = view.data;
  return (
    <div className="space-y-8">
      {query.get("error") ? <Alert tone="danger">{query.get("error")}</Alert> : null}
      {query.get("notice") ? <Alert tone="ok">{query.get("notice")}</Alert> : null}
      <PageHeader
        eyebrow={project.code}
        title={narrative ? project.title : "Restricted project record"}
        description={narrative ? project.summary : "The title and narrative are limited. Operational status is visible because your role coordinates the programme."}
        actions={narrative && project.canvas ? <Link className={buttonClass()} href={`/projects/${project.id}/canvas`}>Open Solution Canvas</Link> : null}
      />
      <DefinitionList items={[
        { term: "Stage", detail: label(project.stage) },
        { term: "Status", detail: label(project.status) },
        { term: "Workspace", detail: project.theme.name },
        { term: "Lead", detail: project.lead.name },
        { term: "Institution", detail: `${project.institution.name}, ${project.country.name}` },
        { term: "Formal authorization", detail: approved ? "An approval is recorded" : "No formal approval recorded" },
      ]} />
      {!approved ? <p className="text-sm text-warn">This project cannot move to “Test approved” or “Testing” until a formal institutional authorization is recorded. A participant commitment is not that authorization.</p> : null}
      {narrative ? (
        <>
          {project.challenge ? <p className="text-sm">Linked challenge: <Link className="font-semibold text-teal" href={`/challenges/${project.challenge.id}`}>{project.challenge.code}</Link></p> : null}
          {editable ? (
            <ActionForm name="project.save" className="space-y-3 rounded-lg border border-line bg-white p-5">
              <h2 className="font-serif text-2xl text-navy">Project record</h2>
              <input type="hidden" name="projectId" value={project.id} />
              {([
                ["summary", "Summary", project.summary],
                ["baseline", "Baseline", project.baseline],
                ["successIndicators", "Success indicators", project.successIndicators],
                ["resourcesNeeded", "Resources", project.resourcesNeeded],
                ["risks", "Risks", project.risks],
                ["dependencies", "Dependencies", project.dependencies],
                ["resultsSummary", "Results and evidence", project.resultsSummary],
                ["lessonsLearned", "Lessons learned", project.lessonsLearned],
              ] as const).map(([name, title, value]) => (
                <label key={name} className="block text-sm">
                  <span className="font-semibold">{title}</span>
                  <textarea className="mt-1 min-h-20 w-full rounded-md border border-line px-3 py-2" name={name} defaultValue={value} />
                </label>
              ))}
              <SubmitButton>Save record</SubmitButton>
            </ActionForm>
          ) : null}
          <section>
            <h2 className="font-serif text-2xl text-navy">Institutional authorization</h2>
            <p className="mt-2 text-sm text-muted">Record an authorization that an official has given outside this platform. Saving it here does not create legal authority by itself.</p>
            <ul className="mt-3 space-y-2">
              {project.approvals.length === 0 ? <li className="text-sm text-muted">None recorded.</li> : project.approvals.map((item) => (
                <li key={item.id} className="rounded-md border border-line bg-white p-4 text-sm">
                  <Badge tone={item.state === "APPROVED" ? "ok" : "gold"}>{label(item.state)}</Badge>
                  <p className="mt-2 font-semibold">{item.sponsorName} · {item.institution.name}</p>
                  {item.decisionNote ? <p className="mt-1">{item.decisionNote}</p> : null}
                  <p className="mt-1 text-muted">{formatDateTime(item.decidedAt ?? item.requestedAt ?? item.createdAt)}</p>
                </li>
              ))}
            </ul>
            {editable ? (
              <ActionForm name="project.approval" className="mt-4 grid gap-3 rounded-lg border border-line bg-white p-5">
                <input type="hidden" name="projectId" value={project.id} />
                <select className="rounded-md border border-line px-3 py-2 text-sm" name="institutionId" aria-label="Authorizing institution">{institutions.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select>
                <input className="rounded-md border border-line px-3 py-2 text-sm" name="sponsorName" placeholder="Name of the authorizing official" aria-label="Sponsor name" required />
                <select className="rounded-md border border-line px-3 py-2 text-sm" name="state" aria-label="Authorization state">
                  {["REQUESTED", "APPROVED", "CONDITIONAL", "REJECTED"].map((item) => <option key={item} value={item}>{label(item)}</option>)}
                </select>
                <textarea className="min-h-20 rounded-md border border-line px-3 py-2 text-sm" name="decisionNote" placeholder="What was decided, and by whom?" aria-label="Decision note" />
                <SubmitButton>Record authorization</SubmitButton>
              </ActionForm>
            ) : null}
          </section>
          <section>
            <h2 className="font-serif text-2xl text-navy">Participant commitments</h2>
            <ul className="mt-3 space-y-2">{project.commitments.map((item) => <li key={item.id} className="rounded-md border border-line bg-white p-4 text-sm"><p>{item.statement}</p><p className="mt-1 text-muted">{item.user.name} · {formatDate(item.createdAt)}</p></li>)}</ul>
            {editable ? (
              <ActionForm name="project.commitment" className="mt-3 space-y-3">
                <input type="hidden" name="projectId" value={project.id} />
                <textarea className="min-h-20 w-full rounded-md border border-line px-3 py-2 text-sm" name="statement" aria-label="Commitment" required minLength={10} placeholder="What are you personally committing to do?" />
                <SubmitButton variant="secondary">Record my commitment</SubmitButton>
              </ActionForm>
            ) : null}
          </section>
        </>
      ) : (
        <p className="text-sm">Authorization count: {project.approvals.length}. Notes are hidden.</p>
      )}
      {editable ? (
        <ActionForm name="project.stage" className="grid gap-3 rounded-lg border border-line bg-white p-5 md:grid-cols-2">
          <h2 className="font-serif text-2xl text-navy md:col-span-2">Lifecycle</h2>
          <input type="hidden" name="projectId" value={project.id} />
          <select className="rounded-md border border-line px-3 py-2 text-sm" name="stage" defaultValue={project.stage} aria-label="Stage">
            {STAGES.map((item) => <option key={item} value={item}>{label(item)}</option>)}
          </select>
          <select className="rounded-md border border-line px-3 py-2 text-sm" name="finalDecision" defaultValue={project.finalDecision} aria-label="Final decision">
            {["UNDECIDED", "CONTINUE", "REVISE", "STOP"].map((item) => <option key={item} value={item}>{label(item)}</option>)}
          </select>
          <textarea className="min-h-20 rounded-md border border-line px-3 py-2 text-sm md:col-span-2" name="decisionJustification" defaultValue={project.decisionJustification} aria-label="Decision justification" />
          <SubmitButton>Update stage</SubmitButton>
          <p className="text-sm text-muted">Test approved and Testing stay blocked until a formal approval exists.</p>
        </ActionForm>
      ) : null}
      {editable ? (
        <ActionForm name="project.status" className="flex flex-wrap items-end gap-3">
          <input type="hidden" name="projectId" value={project.id} />
          <label className="text-sm font-semibold">Project status
            <select className="mt-1 block rounded-md border border-line px-3 py-2" name="status" defaultValue={project.status}>
              {["ACTIVE", "PAUSED", "CLOSED", "ARCHIVED"].map((item) => <option key={item} value={item}>{label(item)}</option>)}
            </select>
          </label>
          <SubmitButton variant="secondary">Update status</SubmitButton>
        </ActionForm>
      ) : null}
      <section>
        <h2 className="font-serif text-2xl text-navy">Actions</h2>
        <ul className="mt-3 space-y-3">
          {project.actions.map((action) => (
            <li key={action.id} className="rounded-md border border-line bg-white p-4 text-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-semibold">{action.title}</p>
                <Badge tone={action.dueOn && new Date(action.dueOn) < new Date() && action.status !== "DONE" ? "danger" : "neutral"}>{label(action.status)}</Badge>
              </div>
              <p className="text-muted">{action.owner?.name ?? "Unassigned"} · {action.dueOn ? formatDate(action.dueOn) : "No deadline"}</p>
              {action.ownerId === viewerId || editable ? (
                <ActionForm name="project.actionStatus" className="mt-2 flex gap-2">
                  <input type="hidden" name="actionId" value={action.id} />
                  <select className="rounded-md border border-line px-2 py-1" name="status" defaultValue={action.status} aria-label={`Status for ${action.title}`}>
                    {["OPEN", "IN_PROGRESS", "DONE", "CANCELLED"].map((item) => <option key={item} value={item}>{label(item)}</option>)}
                  </select>
                  <SubmitButton variant="secondary">Save</SubmitButton>
                </ActionForm>
              ) : null}
            </li>
          ))}
        </ul>
        {editable ? (
          <ActionForm name="project.action" className="mt-4 grid gap-3 md:grid-cols-2">
            <input type="hidden" name="projectId" value={project.id} />
            <input className="rounded-md border border-line px-3 py-2 text-sm" name="title" placeholder="Action" aria-label="Action title" required />
            <select className="rounded-md border border-line px-3 py-2 text-sm" name="ownerId" aria-label="Owner">{project.members.map((member) => <option key={member.userId} value={member.userId}>{member.user.name}</option>)}</select>
            <input className="rounded-md border border-line px-3 py-2 text-sm" type="date" name="dueOn" aria-label="Due date" />
            <textarea className="min-h-16 rounded-md border border-line px-3 py-2 text-sm md:col-span-2" name="description" aria-label="Action description" />
            <SubmitButton>Assign action</SubmitButton>
          </ActionForm>
        ) : null}
      </section>
      {narrative ? (
        <section>
          <h2 className="font-serif text-2xl text-navy">Outcomes</h2>
          <p className="mt-2 text-sm text-muted">Self-reported results are labelled as such. They are not treated as verified evidence.</p>
          <ul className="mt-3 space-y-2">{project.outcomes.map((item) => (
            <li key={item.id} className="rounded-md border border-line bg-white p-4 text-sm">
              <Badge tone={item.evidenceLevel === "VERIFIED" ? "ok" : item.evidenceLevel === "INSUFFICIENT" ? "gold" : "neutral"}>{label(item.evidenceLevel)}</Badge>
              <p className="mt-2 font-semibold">{item.indicator}: {item.valueText}</p>
              <p>{item.definition}</p>
              {item.notes ? <p className="text-muted">{item.notes}</p> : null}
            </li>
          ))}</ul>
          {editable ? (
            <ActionForm name="project.outcome" className="mt-4 grid gap-3">
              <input type="hidden" name="projectId" value={project.id} />
              <input className="rounded-md border border-line px-3 py-2 text-sm" name="indicator" placeholder="Indicator" aria-label="Indicator" required />
              <input className="rounded-md border border-line px-3 py-2 text-sm" name="definition" placeholder="How is it defined?" aria-label="Definition" required />
              <input className="rounded-md border border-line px-3 py-2 text-sm" name="valueText" placeholder="Recorded value" aria-label="Value" required />
              <select className="rounded-md border border-line px-3 py-2 text-sm" name="evidenceLevel" aria-label="Evidence level">
                <option value="SELF_REPORTED">Self-reported</option>
                <option value="INSUFFICIENT">Insufficient data</option>
                <option value="VERIFIED">Verified</option>
              </select>
              <textarea className="min-h-16 rounded-md border border-line px-3 py-2 text-sm" name="notes" aria-label="Notes" />
              <SubmitButton variant="secondary">Add outcome</SubmitButton>
            </ActionForm>
          ) : null}
        </section>
      ) : null}
      {editable ? (
        <ActionForm name="project.grant" className="grid gap-3 rounded-lg border border-line bg-white p-5">
          <h2 className="font-serif text-2xl text-navy">Grant access</h2>
          <p className="text-sm text-muted">Use this for an expert or sponsor. Membership of the programme does not reveal this project.</p>
          <input type="hidden" name="projectId" value={project.id} />
          <select className="rounded-md border border-line px-3 py-2 text-sm" name="userId" aria-label="Person">{people.map((person) => <option key={person.id} value={person.id}>{person.name}{operator && person.email ? ` · ${person.email}` : ""}</option>)}</select>
          <select className="rounded-md border border-line px-3 py-2 text-sm" name="permission" aria-label="Permission"><option value="VIEW">View</option><option value="EDIT">Edit</option></select>
          <input className="rounded-md border border-line px-3 py-2 text-sm" name="note" placeholder="Why this access is needed" aria-label="Note" />
          <SubmitButton variant="secondary">Grant access</SubmitButton>
        </ActionForm>
      ) : null}
      <section>
        <h2 className="font-serif text-2xl text-navy">Activity</h2>
        <ol className="mt-3 space-y-2">{project.activities.map((item) => <li key={item.id} className="text-sm"><span className="text-muted">{formatDateTime(item.createdAt)}</span> · {item.summary}{item.actor ? ` · ${item.actor.name}` : ""}</li>)}</ol>
      </section>
      <p className="text-sm"><a className="font-semibold text-teal" href={`/api/projects/${project.id}/export`}>Export project CSV</a>{narrative ? <> · <a className="font-semibold text-teal" href={`/api/projects/${project.id}/canvas/pdf`}>Canvas PDF</a> · <a className="font-semibold text-teal" href={`/api/projects/${project.id}/canvas/export`}>Canvas JSON</a></> : null}</p>
    </div>
  );
}
