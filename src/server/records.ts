import { prisma } from "@/lib/db";
import {
  challengeAccess,
  projectAccess,
  canViewHelp,
  canViewResource,
  type Actor,
} from "@/lib/authz";

export async function loadProject(actor: Actor, id: string) {
  const project = await prisma.project.findUnique({
    where: { id },
    include: {
      theme: true,
      institution: true,
      country: true,
      lead: { select: { id: true, name: true } },
      challenge: { select: { id: true, code: true, title: true, confidentiality: true } },
      members: { include: { user: { select: { id: true, name: true, institution: { select: { name: true } } } } } },
      grants: true,
      approvals: { include: { institution: true }, orderBy: { createdAt: "desc" } },
      commitments: { include: { user: { select: { id: true, name: true } } }, orderBy: { createdAt: "desc" } },
      milestones: { orderBy: { dueOn: "asc" } },
      actions: { include: { owner: { select: { id: true, name: true } } }, orderBy: { dueOn: "asc" } },
      outcomes: { include: { recordedBy: { select: { name: true } } }, orderBy: { recordedAt: "desc" } },
      comments: {
        where: { deletedAt: null },
        include: { author: { select: { name: true } } },
        orderBy: { createdAt: "desc" },
        take: 30,
      },
      activities: { orderBy: { createdAt: "desc" }, take: 40, include: { actor: { select: { name: true } } } },
      canvas: { select: { id: true, workingUpdatedAt: true } },
    },
  });
  if (!project) return null;
  const grant = project.grants.find((item) => item.userId === actor.id);
  const level = projectAccess(actor, {
    leadId: project.leadId,
    themeId: project.themeId,
    visibility: project.visibility,
    confidentiality: project.confidentiality,
    memberIds: project.members.map((member) => member.userId),
    grantPermission: grant?.permission ?? null,
  });
  if (level === "none") return null;
  return { project, level };
}

export async function loadChallenge(actor: Actor, id: string) {
  const challenge = await prisma.challenge.findUnique({
    where: { id },
    include: {
      theme: true,
      institution: true,
      country: true,
      owner: { select: { id: true, name: true } },
      grants: true,
      reviews: { include: { reviewer: { select: { name: true } } }, orderBy: { createdAt: "desc" } },
      projects: { select: { id: true, code: true, title: true, stage: true } },
      comments: {
        where: { deletedAt: null },
        include: { author: { select: { name: true } } },
        orderBy: { createdAt: "asc" },
      },
    },
  });
  if (!challenge || challenge.archivedAt) return null;
  const grant = challenge.grants.find((item) => item.userId === actor.id);
  const level = challengeAccess(actor, {
    ownerId: challenge.ownerId,
    createdById: challenge.createdById,
    themeId: challenge.themeId,
    visibility: challenge.visibility,
    confidentiality: challenge.confidentiality,
    grantPermission: grant?.permission ?? null,
  });
  if (level === "none") return null;
  return { challenge, level };
}

export async function loadHelp(actor: Actor, id: string) {
  const request = await prisma.helpRequest.findUnique({
    where: { id },
    include: {
      theme: true,
      requester: { select: { id: true, name: true, institution: { select: { name: true, countryCode: true } } } },
      assignee: { select: { id: true, name: true } },
      responses: { include: { author: { select: { id: true, name: true } } }, orderBy: { createdAt: "asc" } },
    },
  });
  if (!request) return null;
  const allowed = canViewHelp(actor, {
    requesterId: request.requesterId,
    assigneeId: request.assigneeId,
    themeId: request.themeId,
    visibility: request.visibility,
    kind: request.kind,
  });
  return allowed ? request : null;
}

export async function loadResource(actor: Actor, id: string) {
  const resource = await prisma.resource.findUnique({
    where: { id },
    include: {
      theme: true,
      createdBy: { select: { name: true } },
      projects: { include: { project: { select: { id: true, title: true, code: true } } } },
    },
  });
  if (!resource) return null;
  const allowed = canViewResource(actor, {
    createdById: resource.createdById,
    themeId: resource.themeId,
    visibility: resource.visibility,
    verification: resource.verification,
    archived: Boolean(resource.archivedAt),
  });
  return allowed ? resource : null;
}
