"use server";

import { revalidatePath } from "next/cache";
import type { Confidentiality, Prisma, Visibility } from "@prisma/client";
import { prisma } from "@/lib/db";
import { canvasHash } from "@/lib/canvas";
import {
  canCreateChallenge,
  canCreateProject,
  canEditProject,
  canReadProjectNarrative,
  canReviewChallenge,
  isOperator,
  projectAccess,
  stageChangeAllowed,
  type Actor,
} from "@/lib/authz";
import {
  actionSchema,
  actionStatusSchema,
  approvalSchema,
  canvasSaveSchema,
  challengeSchema,
  commentSchema,
  commitmentSchema,
  grantSchema,
  outcomeSchema,
  projectSchema,
  projectUpdateSchema,
  reviewSchema,
  stageSchema,
} from "@/lib/validators";
import { requireActor } from "@/server/actor";
import { recordActivity } from "@/server/activity";
import { audit } from "@/server/audit";
import { nextCode } from "@/server/codes";
import { notify } from "@/server/notify";
import { loadChallenge, loadProject } from "@/server/records";
import { fail, ok } from "@/server/result";
import { clampSensitivity } from "@/server/sensitivity";
import { parseDateInput } from "@/lib/format";

export async function createChallengeAction(input: unknown) {
  const { actor } = await requireActor();
  if (!canCreateChallenge(actor)) return fail("You do not have permission to submit a challenge.");
  const parsed = challengeSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Check the challenge form.");
  const theme = await prisma.theme.findFirst({ where: { id: parsed.data.themeId, archivedAt: null } });
  if (!theme) return fail("Choose an active thematic workspace.");
  if (!isOperator(actor) && !actor.themeIds.includes(theme.id) && !actor.facilitatedThemeIds.includes(theme.id)) {
    return fail("Submit a challenge to a workspace you belong to.");
  }
  const sensitivity = clampSensitivity(actor, parsed.data.visibility, parsed.data.confidentiality);
  const code = await nextCode("CH");
  const challenge = await prisma.challenge.create({
    data: {
      code,
      title: parsed.data.title,
      problemStatement: parsed.data.problemStatement,
      institutionId: parsed.data.institutionId,
      countryCode: parsed.data.countryCode,
      context: parsed.data.context,
      affectedUsers: parsed.data.affectedUsers,
      evidence: parsed.data.evidence,
      previousAttempts: parsed.data.previousAttempts,
      expectedBenefit: parsed.data.expectedBenefit,
      themeId: theme.id,
      expertiseRequired: parsed.data.expertiseRequired,
      ownerId: actor.id,
      createdById: actor.id,
      visibility: sensitivity.visibility,
      confidentiality: sensitivity.confidentiality,
      status: "SUBMITTED",
    },
  });
  await audit(actor.id, "challenge.create", "Challenge", challenge.id);
  const facilitators = await prisma.workspaceMembership.findMany({
    where: { themeId: theme.id, role: "FACILITATOR" },
  });
  for (const facilitator of facilitators) {
    await notify({
      userId: facilitator.userId,
      type: "REVIEW_REQUEST",
      title: "Challenge submitted for review",
      body: challenge.title,
      href: `/challenges/${challenge.id}`,
      dedupeKey: `challenge-review:${challenge.id}:${facilitator.userId}`,
    });
  }
  revalidatePath("/challenges");
  return ok("Challenge submitted.", { id: challenge.id });
}

export async function reviewChallengeAction(input: unknown) {
  const { actor } = await requireActor();
  const parsed = reviewSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Add a review note.");
  const loaded = await loadChallenge(actor, parsed.data.challengeId);
  if (!loaded || !canReadProjectNarrative(loaded.level)) return fail("You cannot review this challenge.");
  if (!canReviewChallenge(actor, loaded.challenge.themeId)) return fail("Only a facilitator or programme manager can record this review.");
  if (parsed.data.status === "MERGED" && !parsed.data.mergedIntoId) {
    return fail("Choose the challenge that this one merges into.");
  }
  await prisma.$transaction([
    prisma.challenge.update({
      where: { id: loaded.challenge.id },
      data: {
        status: parsed.data.status,
        mergedIntoId: parsed.data.status === "MERGED" ? parsed.data.mergedIntoId : null,
      },
    }),
    prisma.challengeReview.create({
      data: {
        challengeId: loaded.challenge.id,
        reviewerId: actor.id,
        fromStatus: loaded.challenge.status,
        toStatus: parsed.data.status,
        decisionNote: parsed.data.decisionNote,
      },
    }),
  ]);
  await notify({
    userId: loaded.challenge.ownerId,
    type: "REVIEW_REQUEST",
    title: "Your challenge was reviewed",
    body: parsed.data.decisionNote,
    href: `/challenges/${loaded.challenge.id}`,
    dedupeKey: `challenge-reviewed:${loaded.challenge.id}:${parsed.data.status}:${Date.now()}`,
  });
  await audit(actor.id, "challenge.review", "Challenge", loaded.challenge.id, { status: parsed.data.status });
  revalidatePath(`/challenges/${loaded.challenge.id}`);
  return ok("Review recorded. The contributor has an in-app notification.");
}

export async function createProjectAction(input: unknown) {
  const { actor } = await requireActor();
  const parsed = projectSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Check the project form.");
  if (!canCreateProject(actor, parsed.data.themeId)) return fail("You cannot open a project in that workspace.");
  const sensitivity = clampSensitivity(actor, parsed.data.visibility, parsed.data.confidentiality);
  if (parsed.data.challengeId) {
    const linked = await loadChallenge(actor, parsed.data.challengeId);
    if (!linked || !canReadProjectNarrative(linked.level)) return fail("You cannot link that challenge.");
    if (linked.challenge.themeId !== parsed.data.themeId) return fail("The challenge belongs to a different workspace.");
  }
  const collaboratorIds = [...new Set(parsed.data.collaboratorIds ?? [])].filter((id) => id !== actor.id);
  if (collaboratorIds.length) {
    const members = await prisma.workspaceMembership.findMany({
      where: { themeId: parsed.data.themeId, userId: { in: collaboratorIds } },
    });
    if (members.length !== collaboratorIds.length) return fail("Collaborators must already belong to the workspace.");
  }
  const fields = await prisma.canvasFieldDefinition.findMany({ where: { active: true }, orderBy: { sortOrder: "asc" } });
  const content = Object.fromEntries(fields.map((field) => [field.key, ""]));
  const code = await nextCode("PR");
  const project = await prisma.project.create({
    data: {
      code,
      title: parsed.data.title,
      summary: parsed.data.summary,
      institutionId: parsed.data.institutionId,
      countryCode: parsed.data.countryCode,
      themeId: parsed.data.themeId,
      leadId: actor.id,
      challengeId: parsed.data.challengeId || null,
      visibility: sensitivity.visibility,
      confidentiality: sensitivity.confidentiality,
      members: {
        create: [
          { userId: actor.id, role: "LEAD" },
          ...collaboratorIds.map((userId) => ({ userId, role: "COLLABORATOR" })),
        ],
      },
      canvas: {
        create: {
          workingJson: content,
          updatedById: actor.id,
          versions: {
            create: {
              versionNumber: 1,
              content,
              fieldSnapshot: fields.map((field) => ({
                key: field.key,
                label: field.label,
                helpText: field.helpText,
                sortOrder: field.sortOrder,
                required: field.required,
                active: field.active,
              })),
              contentHash: canvasHash(content),
              authorId: actor.id,
              note: "Canvas opened",
            },
          },
        },
      },
    },
  });
  await recordActivity({ summary: `Opened project ${project.code}`, actorId: actor.id, projectId: project.id, themeId: project.themeId });
  await audit(actor.id, "project.create", "Project", project.id);
  for (const userId of collaboratorIds) {
    await notify({
      userId,
      type: "WORKSPACE_ASSIGNMENT",
      title: "You were added to a project",
      body: project.title,
      href: `/projects/${project.id}`,
      dedupeKey: `project-member:${project.id}:${userId}`,
    });
  }
  revalidatePath("/projects");
  return ok("Project opened.", { id: project.id });
}

export async function updateProjectAction(input: unknown) {
  const { actor } = await requireActor();
  const parsed = projectUpdateSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Check the project details.");
  const loaded = await loadProject(actor, parsed.data.projectId);
  if (!loaded || !canEditProject(loaded.level)) return fail("You cannot edit this project.");
  await prisma.project.update({
    where: { id: loaded.project.id },
    data: {
      summary: parsed.data.summary,
      baseline: parsed.data.baseline,
      successIndicators: parsed.data.successIndicators,
      resourcesNeeded: parsed.data.resourcesNeeded,
      risks: parsed.data.risks,
      dependencies: parsed.data.dependencies,
      resultsSummary: parsed.data.resultsSummary,
      lessonsLearned: parsed.data.lessonsLearned,
    },
  });
  await audit(actor.id, "project.update", "Project", loaded.project.id);
  revalidatePath(`/projects/${loaded.project.id}`);
  return ok("Project record saved.");
}

export async function changeStageAction(input: unknown) {
  const { actor } = await requireActor();
  const parsed = stageSchema.safeParse(input);
  if (!parsed.success) return fail("Choose a lifecycle stage.");
  const loaded = await loadProject(actor, parsed.data.projectId);
  if (!loaded || !canEditProject(loaded.level)) return fail("You cannot change this project's stage.");
  if (!stageChangeAllowed(parsed.data.stage, loaded.project.approvals)) {
    return fail("A test cannot be approved or started until a formal institutional authorization is recorded. A participant commitment is not an authorization.");
  }
  if (parsed.data.stage === "DECISION_RECORDED" && (!parsed.data.finalDecision || parsed.data.finalDecision === "UNDECIDED")) {
    return fail("Record whether the project will continue, be revised, or stop.");
  }
  if (parsed.data.stage === "DECISION_RECORDED" && !(parsed.data.decisionJustification ?? "").trim()) {
    return fail("Add the justification for the decision.");
  }
  await prisma.project.update({
    where: { id: loaded.project.id },
    data: {
      stage: parsed.data.stage,
      finalDecision: parsed.data.finalDecision ?? loaded.project.finalDecision,
      decisionJustification: parsed.data.decisionJustification ?? loaded.project.decisionJustification,
    },
  });
  await recordActivity({
    summary: `Stage changed to ${parsed.data.stage}`,
    actorId: actor.id,
    projectId: loaded.project.id,
    themeId: loaded.project.themeId,
  });
  const recipients = new Set(loaded.project.members.map((member) => member.userId));
  for (const userId of recipients) {
    if (userId === actor.id) continue;
    await notify({
      userId,
      type: "PROJECT_STAGE",
      title: "Project stage changed",
      body: loaded.project.title,
      href: `/projects/${loaded.project.id}`,
      dedupeKey: `stage:${loaded.project.id}:${parsed.data.stage}:${userId}:${Date.now()}`,
    });
  }
  await audit(actor.id, "project.stage", "Project", loaded.project.id, { stage: parsed.data.stage });
  revalidatePath(`/projects/${loaded.project.id}`);
  return ok("Lifecycle stage updated.");
}

export async function setProjectStatusAction(input: { projectId: string; status: "ACTIVE" | "PAUSED" | "ARCHIVED" | "CLOSED" }) {
  const { actor } = await requireActor();
  const loaded = await loadProject(actor, input.projectId);
  if (!loaded || !canEditProject(loaded.level)) return fail("You cannot change this project's status.");
  await prisma.project.update({
    where: { id: loaded.project.id },
    data: {
      status: input.status,
      pausedAt: input.status === "PAUSED" ? new Date() : loaded.project.pausedAt,
      closedAt: input.status === "CLOSED" || input.status === "ARCHIVED" ? new Date() : null,
      archivedAt: input.status === "ARCHIVED" ? new Date() : null,
    },
  });
  await recordActivity({ summary: `Project marked ${input.status.toLowerCase()}`, actorId: actor.id, projectId: loaded.project.id });
  await audit(actor.id, "project.status", "Project", loaded.project.id, { status: input.status });
  revalidatePath(`/projects/${loaded.project.id}`);
  return ok("Project status updated. History is retained.");
}

export async function addActionItemAction(input: unknown) {
  const { actor } = await requireActor();
  const parsed = actionSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Check the action.");
  if (!parsed.data.projectId && !parsed.data.themeId && !parsed.data.eventId) {
    return fail("Attach the action to a project, workspace, or event.");
  }
  if (parsed.data.projectId) {
    const loaded = await loadProject(actor, parsed.data.projectId);
    if (!loaded || !canEditProject(loaded.level)) return fail("You cannot assign actions on this project.");
  }
  const action = await prisma.actionItem.create({
    data: {
      title: parsed.data.title,
      description: parsed.data.description,
      ownerId: parsed.data.ownerId,
      createdById: actor.id,
      dueOn: parseDateInput(parsed.data.dueOn),
      projectId: parsed.data.projectId || null,
      themeId: parsed.data.themeId || null,
      eventId: parsed.data.eventId || null,
    },
  });
  await notify({
    userId: parsed.data.ownerId,
    type: "ACTION_ASSIGNMENT",
    title: "An action was assigned to you",
    body: action.title,
    href: parsed.data.projectId ? `/projects/${parsed.data.projectId}` : "/dashboard",
    dedupeKey: `action:${action.id}`,
  });
  await audit(actor.id, "action.create", "ActionItem", action.id);
  revalidatePath("/dashboard");
  return ok("Action assigned.");
}

export async function updateActionStatusAction(input: unknown) {
  const { actor } = await requireActor();
  const parsed = actionStatusSchema.safeParse(input);
  if (!parsed.success) return fail("Choose a status.");
  const action = await prisma.actionItem.findUnique({ where: { id: parsed.data.actionId }, include: { project: { include: { members: true, grants: true } } } });
  if (!action) return fail("Action not found.");
  let allowed = action.ownerId === actor.id || isOperator(actor);
  if (action.project) {
    const grant = action.project.grants.find((item) => item.userId === actor.id);
    const level = projectLevel(actor, action.project, grant?.permission ?? null);
    allowed = allowed || canEditProject(level);
  }
  if (action.themeId && actor.facilitatedThemeIds.includes(action.themeId)) allowed = true;
  if (!allowed) return fail("You cannot update this action.");
  await prisma.actionItem.update({
    where: { id: action.id },
    data: {
      status: parsed.data.status,
      completedAt: parsed.data.status === "DONE" ? new Date() : null,
    },
  });
  await audit(actor.id, "action.status", "ActionItem", action.id, { status: parsed.data.status });
  if (action.projectId) revalidatePath(`/projects/${action.projectId}`);
  revalidatePath("/dashboard");
  return ok("Action status saved.");
}

export async function recordApprovalAction(input: unknown) {
  const { actor } = await requireActor();
  const parsed = approvalSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Check the authorization form.");
  const loaded = await loadProject(actor, parsed.data.projectId);
  if (!loaded || !canEditProject(loaded.level)) return fail("You cannot record an authorization on this project.");
  const deciding = parsed.data.state === "APPROVED" || parsed.data.state === "REJECTED" || parsed.data.state === "CONDITIONAL";
  if (deciding && !isOperator(actor) && !actor.facilitatedThemeIds.includes(loaded.project.themeId)) {
    return fail("Only a facilitator or programme manager can record a formal authorization decision.");
  }
  await prisma.institutionalApproval.create({
    data: {
      projectId: loaded.project.id,
      institutionId: parsed.data.institutionId,
      sponsorName: parsed.data.sponsorName,
      state: parsed.data.state,
      isFormal: true,
      requestedById: actor.id,
      decidedByName: deciding ? actor.id : "",
      decisionNote: parsed.data.decisionNote,
      requestedAt: parsed.data.state === "REQUESTED" ? new Date() : null,
      decidedAt: deciding ? new Date() : null,
    },
  });
  await recordActivity({
    summary: `Institutional authorization marked ${parsed.data.state.toLowerCase()}`,
    actorId: actor.id,
    projectId: loaded.project.id,
  });
  await audit(actor.id, "approval.record", "Project", loaded.project.id, { state: parsed.data.state });
  revalidatePath(`/projects/${loaded.project.id}`);
  return ok("Institutional authorization recorded separately from personal commitments.");
}

export async function recordCommitmentAction(input: unknown) {
  const { actor } = await requireActor();
  const parsed = commitmentSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Describe the commitment.");
  const loaded = await loadProject(actor, parsed.data.projectId);
  if (!loaded || !canEditProject(loaded.level)) return fail("You cannot record a commitment here.");
  await prisma.participantCommitment.create({
    data: { projectId: loaded.project.id, userId: actor.id, statement: parsed.data.statement },
  });
  await audit(actor.id, "commitment.record", "Project", loaded.project.id);
  revalidatePath(`/projects/${loaded.project.id}`);
  return ok("Personal commitment recorded. It does not authorize a pilot.");
}

export async function grantProjectAccessAction(input: unknown) {
  const { actor } = await requireActor();
  const parsed = grantSchema.safeParse(input);
  if (!parsed.success) return fail("Choose a person and a permission.");
  const loaded = await loadProject(actor, parsed.data.projectId);
  if (!loaded || !canEditProject(loaded.level)) return fail("You cannot grant access to this project.");
  const target = await prisma.user.findFirst({ where: { id: parsed.data.userId, status: "ACTIVE", deletedAt: null } });
  if (!target) return fail("That person does not have an active account.");
  await prisma.projectGrant.upsert({
    where: { projectId_userId: { projectId: loaded.project.id, userId: target.id } },
    create: {
      projectId: loaded.project.id,
      userId: target.id,
      permission: parsed.data.permission,
      note: parsed.data.note,
      grantedById: actor.id,
    },
    update: { permission: parsed.data.permission, note: parsed.data.note, grantedById: actor.id },
  });
  await notify({
    userId: target.id,
    type: "WORKSPACE_ASSIGNMENT",
    title: "You were given access to a project",
    body: loaded.project.title,
    href: `/projects/${loaded.project.id}`,
    dedupeKey: `grant:${loaded.project.id}:${target.id}:${parsed.data.permission}`,
  });
  await audit(actor.id, "project.grant", "Project", loaded.project.id, { userId: target.id, permission: parsed.data.permission });
  revalidatePath(`/projects/${loaded.project.id}`);
  return ok("Access granted for this project only.");
}

export async function recordOutcomeAction(input: unknown) {
  const { actor } = await requireActor();
  const parsed = outcomeSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Check the outcome form.");
  const loaded = await loadProject(actor, parsed.data.projectId);
  if (!loaded || !canEditProject(loaded.level)) return fail("You cannot add an outcome to this project.");
  if (parsed.data.evidenceLevel === "VERIFIED" && !isOperator(actor) && !actor.facilitatedThemeIds.includes(loaded.project.themeId)) {
    return fail("Only a facilitator or programme manager can mark evidence as verified.");
  }
  await prisma.outcomeMeasurement.create({
    data: {
      projectId: loaded.project.id,
      indicator: parsed.data.indicator,
      definition: parsed.data.definition,
      valueText: parsed.data.valueText,
      evidenceLevel: parsed.data.evidenceLevel,
      notes: parsed.data.notes,
      recordedById: actor.id,
    },
  });
  await audit(actor.id, "outcome.record", "Project", loaded.project.id, { evidenceLevel: parsed.data.evidenceLevel });
  revalidatePath(`/projects/${loaded.project.id}`);
  return ok("Outcome recorded with its evidence level.");
}

export async function addCommentAction(input: unknown) {
  const { actor } = await requireActor();
  const parsed = commentSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Write a comment.");
  const targets = [parsed.data.themeId, parsed.data.projectId, parsed.data.challengeId].filter(Boolean);
  if (targets.length !== 1) return fail("A comment must belong to one workspace, project, or challenge.");
  if (parsed.data.projectId) {
    const loaded = await loadProject(actor, parsed.data.projectId);
    if (!loaded || !canReadProjectNarrative(loaded.level)) return fail("You cannot comment on this project.");
  }
  if (parsed.data.challengeId) {
    const loaded = await loadChallenge(actor, parsed.data.challengeId);
    if (!loaded || !canReadProjectNarrative(loaded.level)) return fail("You cannot comment on this challenge.");
  }
  if (parsed.data.themeId) {
    const member = actor.themeIds.includes(parsed.data.themeId) || actor.facilitatedThemeIds.includes(parsed.data.themeId) || isOperator(actor);
    if (!member) return fail("Join the workspace before posting.");
  }
  await prisma.comment.create({
    data: {
      body: parsed.data.body,
      authorId: actor.id,
      themeId: parsed.data.themeId,
      projectId: parsed.data.projectId,
      challengeId: parsed.data.challengeId,
    },
  });
  revalidatePath("/themes");
  return ok("Comment posted.");
}

export async function saveCanvasAction(input: unknown) {
  const { actor } = await requireActor();
  const parsed = canvasSaveSchema.safeParse(input);
  if (!parsed.success) return fail("The canvas could not be validated.");
  const canvas = await prisma.solutionCanvas.findUnique({
    where: { id: parsed.data.canvasId },
    include: { versions: { orderBy: { versionNumber: "desc" }, take: 1 }, project: { include: { members: true, grants: true } } },
  });
  if (!canvas) return fail("Canvas not found.");
  const grant = canvas.project.grants.find((item) => item.userId === actor.id);
  const level = projectLevel(actor, canvas.project, grant?.permission ?? null);
  if (!canEditProject(level)) return fail("You cannot edit this canvas.");
  if (canvas.workingUpdatedAt.toISOString() !== parsed.data.updatedAt) {
    return fail("Someone else saved this canvas. Reload before saving so their version is not overwritten.", true);
  }
  const fields = await prisma.canvasFieldDefinition.findMany({ orderBy: { sortOrder: "asc" } });
  const allowed = new Set(fields.map((field) => field.key));
  const content: Record<string, string> = {};
  for (const [key, value] of Object.entries(parsed.data.content)) {
    if (allowed.has(key)) content[key] = value;
  }
  const hash = canvasHash(content);
  const latest = canvas.versions[0];
  const nextVersion = (latest?.versionNumber ?? 0) + 1;
  const changed = latest?.contentHash !== hash;
  const updated = await prisma.solutionCanvas.update({
    where: { id: canvas.id },
    data: {
      workingJson: content,
      workingUpdatedAt: new Date(),
      updatedById: actor.id,
      ...(changed
        ? {
            versions: {
              create: {
                versionNumber: nextVersion,
                content,
                fieldSnapshot: fields.map((field) => ({
                  key: field.key,
                  label: field.label,
                  helpText: field.helpText,
                  sortOrder: field.sortOrder,
                  required: field.required,
                  active: field.active,
                })),
                contentHash: hash,
                authorId: actor.id,
                note: parsed.data.note || "Autosave",
              },
            },
          }
        : {}),
    },
  });
  return ok("Saved.", { updatedAt: updated.workingUpdatedAt.toISOString(), version: changed ? nextVersion : latest?.versionNumber ?? 1 });
}

export async function addCanvasCommentAction(input: { canvasId: string; sectionKey: string; body: string }) {
  const { actor } = await requireActor();
  const body = input.body.trim();
  if (body.length < 2) return fail("Write a comment.");
  const canvas = await prisma.solutionCanvas.findUnique({
    where: { id: input.canvasId },
    include: { project: { include: { members: true, grants: true } } },
  });
  if (!canvas) return fail("Canvas not found.");
  const grant = canvas.project.grants.find((item) => item.userId === actor.id);
  const level = projectLevel(actor, canvas.project, grant?.permission ?? null);
  if (!canReadProjectNarrative(level)) return fail("You cannot comment on this canvas.");
  await prisma.canvasComment.create({
    data: { canvasId: canvas.id, sectionKey: input.sectionKey, authorId: actor.id, body },
  });
  revalidatePath(`/projects/${canvas.projectId}/canvas`);
  return ok("Comment added.");
}

function projectLevel(
  actor: Actor,
  project: {
    leadId: string;
    themeId: string;
    visibility: Visibility;
    confidentiality: Confidentiality;
    members: { userId: string }[];
  },
  grantPermission: string | null,
) {
  return projectAccess(actor, {
    leadId: project.leadId,
    themeId: project.themeId,
    visibility: project.visibility,
    confidentiality: project.confidentiality,
    memberIds: project.members.map((member) => member.userId),
    grantPermission,
  });
}
