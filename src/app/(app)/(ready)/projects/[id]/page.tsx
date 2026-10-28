import Link from "next/link";
import { notFound } from "next/navigation";
import { DefinitionList, PageHeader } from "@/components/chrome";
import { Alert, Badge } from "@/components/ui/primitives";
import { SubmitButton } from "@/components/submit-button";
import { buttonClass } from "@/components/ui/button";
import { canEditProject, canReadProjectNarrative, hasFormalApproval, isOperator } from "@/lib/authz";
import { formatDate, formatDateTime } from "@/lib/format";
import { label } from "@/lib/labels";
import { prisma } from "@/lib/db";
import { requireActor } from "@/server/actor";
import { finish } from "@/server/result";
import { loadProject } from "@/server/records";
import {
  addActionItemAction,
  changeStageAction,
  grantProjectAccessAction,
  recordApprovalAction,
  recordCommitmentAction,
  recordOutcomeAction,
  setProjectStatusAction,
  updateActionStatusAction,
  updateProjectAction,
} from "@/server/actions/collaboration";

const STAGES = ["PROBLEM_DEFINED", "PROPOSAL_DEVELOPED", "AUTHORIZATION_SOUGHT", "TEST_APPROVED", "TESTING", "EVIDENCE_REVIEWED", "DECISION_RECORDED"] as const;

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return { title: `Project ${id.slice(0, 8)}` };
}

export default async function ProjectPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ notice?: string; error?: string }>;
}) {
  const { id } = await params;
  const query = await searchParams;
  const { actor } = await requireActor();
  const loaded = await loadProject(actor, id);
  if (!loaded) notFound();
  const { project, level } = loaded;
  const narrative = canReadProjectNarrative(level);
  const editable = canEditProject(level);
  const approved = hasFormalApproval(project.approvals);
  const institutions = editable ? await prisma.institution.findMany({ where: { archivedAt: null }, orderBy: { name: "asc" } }) : [];
  const people = editable
    ? await prisma.user.findMany({ where: { status: "ACTIVE", deletedAt: null }, select: { id: true, name: true, email: true }, orderBy: { name: "asc" }, take: 100 })
    : [];

  async function saveDetails(formData: FormData) {
    "use server";
    finish(await updateProjectAction({
      projectId: String(formData.get("projectId")),
      summary: String(formData.get("summary") ?? ""),
      baseline: String(formData.get("baseline") ?? ""),
      successIndicators: String(formData.get("successIndicators") ?? ""),
      resourcesNeeded: String(formData.get("resourcesNeeded") ?? ""),
      risks: String(formData.get("risks") ?? ""),
      dependencies: String(formData.get("dependencies") ?? ""),
      resultsSummary: String(formData.get("resultsSummary") ?? ""),
      lessonsLearned: String(formData.get("lessonsLearned") ?? ""),
    }), `/projects/${id}`);
  }
  async function stage(formData: FormData) {
    "use server";
    finish(await changeStageAction({
      projectId: String(formData.get("projectId")),
      stage: String(formData.get("stage")),
      finalDecision: String(formData.get("finalDecision") || "UNDECIDED"),
      decisionJustification: String(formData.get("decisionJustification") ?? ""),
    }), `/projects/${id}`);
  }
  async function status(formData: FormData) {
    "use server";
    const next = String(formData.get("status"));
    if (next === "ACTIVE" || next === "PAUSED" || next === "ARCHIVED" || next === "CLOSED") {
      finish(await setProjectStatusAction({ projectId: String(formData.get("projectId")), status: next }), `/projects/${id}`);
    }
  }
  async function actionItem(formData: FormData) {
    "use server";
    finish(await addActionItemAction({
      title: String(formData.get("title") ?? ""),
      description: String(formData.get("description") ?? ""),
      ownerId: String(formData.get("ownerId") ?? ""),
      dueOn: String(formData.get("dueOn") ?? ""),
      projectId: String(formData.get("projectId") ?? ""),
    }), `/projects/${id}`);
  }
  async function actionStatus(formData: FormData) {
    "use server";
    finish(await updateActionStatusAction({ actionId: String(formData.get("actionId")), status: String(formData.get("status")) }), `/projects/${id}`);
  }
  async function approval(formData: FormData) {
    "use server";
    finish(await recordApprovalAction({
      projectId: String(formData.get("projectId")),
      institutionId: String(formData.get("institutionId")),
      sponsorName: String(formData.get("sponsorName") ?? ""),
      state: String(formData.get("state")),
      decisionNote: String(formData.get("decisionNote") ?? ""),
    }), `/projects/${id}`);
  }
  async function commitment(formData: FormData) {
    "use server";
    finish(await recordCommitmentAction({ projectId: String(formData.get("projectId")), statement: String(formData.get("statement") ?? "") }), `/projects/${id}`);
  }
  async function grant(formData: FormData) {
    "use server";
    finish(await grantProjectAccessAction({
      projectId: String(formData.get("projectId")),
      userId: String(formData.get("userId")),
      permission: String(formData.get("permission")),
      note: String(formData.get("note") ?? ""),
    }), `/projects/${id}`);
  }
  async function outcome(formData: FormData) {
    "use server";
    finish(await recordOutcomeAction({
      projectId: String(formData.get("projectId")),
      indicator: String(formData.get("indicator") ?? ""),
      definition: String(formData.get("definition") ?? ""),
      valueText: String(formData.get("valueText") ?? ""),
      evidenceLevel: String(formData.get("evidenceLevel")),
      notes: String(formData.get("notes") ?? ""),
    }), `/projects/${id}`);
  }

  return (
    <div className="space-y-8">
      {query.error ? <Alert tone="danger">{query.error}</Alert> : null}
      {query.notice ? <Alert tone="ok">{query.notice}</Alert> : null}
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
            <form action={saveDetails} className="space-y-3 rounded-lg border border-line bg-white p-5">
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
            </form>
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
              <form action={approval} className="mt-4 grid gap-3 rounded-lg border border-line bg-white p-5">
                <input type="hidden" name="projectId" value={project.id} />
                <select className="rounded-md border border-line px-3 py-2 text-sm" name="institutionId" aria-label="Authorizing institution">{institutions.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select>
                <input className="rounded-md border border-line px-3 py-2 text-sm" name="sponsorName" placeholder="Name of the authorizing official" aria-label="Sponsor name" required />
                <select className="rounded-md border border-line px-3 py-2 text-sm" name="state" aria-label="Authorization state">
                  {["REQUESTED", "APPROVED", "CONDITIONAL", "REJECTED"].map((item) => <option key={item} value={item}>{label(item)}</option>)}
                </select>
                <textarea className="min-h-20 rounded-md border border-line px-3 py-2 text-sm" name="decisionNote" placeholder="What was decided, and by whom?" aria-label="Decision note" />
                <SubmitButton>Record authorization</SubmitButton>
              </form>
            ) : null}
          </section>
          <section>
            <h2 className="font-serif text-2xl text-navy">Participant commitments</h2>
            <ul className="mt-3 space-y-2">{project.commitments.map((item) => <li key={item.id} className="rounded-md border border-line bg-white p-4 text-sm"><p>{item.statement}</p><p className="mt-1 text-muted">{item.user.name} · {formatDate(item.createdAt)}</p></li>)}</ul>
            {editable ? (
              <form action={commitment} className="mt-3 space-y-3">
                <input type="hidden" name="projectId" value={project.id} />
                <textarea className="min-h-20 w-full rounded-md border border-line px-3 py-2 text-sm" name="statement" aria-label="Commitment" required minLength={10} placeholder="What are you personally committing to do?" />
                <SubmitButton variant="secondary">Record my commitment</SubmitButton>
              </form>
            ) : null}
          </section>
        </>
      ) : (
        <p className="text-sm">Authorization count: {project.approvals.length}. Notes are hidden.</p>
      )}
      {editable ? (
        <form action={stage} className="grid gap-3 rounded-lg border border-line bg-white p-5 md:grid-cols-2">
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
        </form>
      ) : null}
      {editable ? (
        <form action={status} className="flex flex-wrap items-end gap-3">
          <input type="hidden" name="projectId" value={project.id} />
          <label className="text-sm font-semibold">Project status
            <select className="mt-1 block rounded-md border border-line px-3 py-2" name="status" defaultValue={project.status}>
              {["ACTIVE", "PAUSED", "CLOSED", "ARCHIVED"].map((item) => <option key={item} value={item}>{label(item)}</option>)}
            </select>
          </label>
          <SubmitButton variant="secondary">Update status</SubmitButton>
        </form>
      ) : null}
      <section>
        <h2 className="font-serif text-2xl text-navy">Actions</h2>
        <ul className="mt-3 space-y-3">
          {project.actions.map((action) => (
            <li key={action.id} className="rounded-md border border-line bg-white p-4 text-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-semibold">{action.title}</p>
                <Badge tone={action.dueOn && action.dueOn < new Date() && action.status !== "DONE" ? "danger" : "neutral"}>{label(action.status)}</Badge>
              </div>
              <p className="text-muted">{action.owner?.name ?? "Unassigned"} · {action.dueOn ? formatDate(action.dueOn) : "No deadline"}</p>
              {(action.ownerId === actor.id || editable) ? (
                <form action={actionStatus} className="mt-2 flex gap-2">
                  <input type="hidden" name="actionId" value={action.id} />
                  <select className="rounded-md border border-line px-2 py-1" name="status" defaultValue={action.status} aria-label={`Status for ${action.title}`}>
                    {["OPEN", "IN_PROGRESS", "DONE", "CANCELLED"].map((item) => <option key={item} value={item}>{label(item)}</option>)}
                  </select>
                  <SubmitButton variant="secondary">Save</SubmitButton>
                </form>
              ) : null}
            </li>
          ))}
        </ul>
        {editable ? (
          <form action={actionItem} className="mt-4 grid gap-3 md:grid-cols-2">
            <input type="hidden" name="projectId" value={project.id} />
            <input className="rounded-md border border-line px-3 py-2 text-sm" name="title" placeholder="Action" aria-label="Action title" required />
            <select className="rounded-md border border-line px-3 py-2 text-sm" name="ownerId" aria-label="Owner">{project.members.map((member) => <option key={member.userId} value={member.userId}>{member.user.name}</option>)}</select>
            <input className="rounded-md border border-line px-3 py-2 text-sm" type="date" name="dueOn" aria-label="Due date" />
            <textarea className="min-h-16 rounded-md border border-line px-3 py-2 text-sm md:col-span-2" name="description" aria-label="Action description" />
            <SubmitButton>Assign action</SubmitButton>
          </form>
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
            <form action={outcome} className="mt-4 grid gap-3">
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
            </form>
          ) : null}
        </section>
      ) : null}
      {editable ? (
        <form action={grant} className="grid gap-3 rounded-lg border border-line bg-white p-5">
          <h2 className="font-serif text-2xl text-navy">Grant access</h2>
          <p className="text-sm text-muted">Use this for an expert or sponsor. Membership of the programme does not reveal this project.</p>
          <input type="hidden" name="projectId" value={project.id} />
          <select className="rounded-md border border-line px-3 py-2 text-sm" name="userId" aria-label="Person">{people.map((person) => <option key={person.id} value={person.id}>{person.name}{isOperator(actor) ? ` · ${person.email}` : ""}</option>)}</select>
          <select className="rounded-md border border-line px-3 py-2 text-sm" name="permission" aria-label="Permission"><option value="VIEW">View</option><option value="EDIT">Edit</option></select>
          <input className="rounded-md border border-line px-3 py-2 text-sm" name="note" placeholder="Why this access is needed" aria-label="Note" />
          <SubmitButton variant="secondary">Grant access</SubmitButton>
        </form>
      ) : null}
      <section>
        <h2 className="font-serif text-2xl text-navy">Activity</h2>
        <ol className="mt-3 space-y-2">{project.activities.map((item) => <li key={item.id} className="text-sm"><span className="text-muted">{formatDateTime(item.createdAt)}</span> · {item.summary}{item.actor ? ` · ${item.actor.name}` : ""}</li>)}</ol>
      </section>
      <p className="text-sm"><Link className="font-semibold text-teal" href={`/api/projects/${project.id}/export`}>Export project CSV</Link>{narrative ? <> · <Link className="font-semibold text-teal" href={`/api/projects/${project.id}/canvas/pdf`}>Canvas PDF</Link> · <Link className="font-semibold text-teal" href={`/api/projects/${project.id}/canvas/export`}>Canvas JSON</Link></> : null}</p>
    </div>
  );
}
