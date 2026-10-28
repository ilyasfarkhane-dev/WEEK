import type { Prisma, ProjectStage } from "@prisma/client";
import { prisma } from "@/lib/db";
import { asCanvasContent, completion, type CanvasField } from "@/lib/canvas";
import { CONTRIBUTION_DEFINITION, countByStage, readTargets, workingDaysBetween, helpResponseWithinTarget } from "@/lib/metrics";

export type MetricFilters = {
  from?: Date;
  to?: Date;
  themeId?: string;
  countryCode?: string;
  institutionId?: string;
  stage?: ProjectStage;
};

function createdRange(filters: MetricFilters): Prisma.DateTimeFilter | undefined {
  if (!filters.from && !filters.to) return undefined;
  return { gte: filters.from, lte: filters.to };
}

export async function loadProgrammeMetrics(filters: MetricFilters) {
  const settings = await prisma.programmeSettings.findUnique({ where: { id: "default" } });
  const targets = readTargets(settings?.targets);
  const range = createdRange(filters);
  const projectFilter: Prisma.ProjectWhereInput = {
    ...(filters.themeId ? { themeId: filters.themeId } : {}),
    ...(filters.countryCode ? { countryCode: filters.countryCode } : {}),
    ...(filters.institutionId ? { institutionId: filters.institutionId } : {}),
    ...(filters.stage ? { stage: filters.stage } : {}),
    ...(range ? { createdAt: range } : {}),
  };

  const [
    participants,
    onboarded,
    projects,
    helpRequests,
    resources,
    attendances,
    approvals,
    canvases,
    challenges,
    comments,
    versions,
    responses,
    completedActions,
    contributedResources,
  ] = await Promise.all([
    prisma.user.count({ where: { deletedAt: null, roles: { some: { role: "PARTICIPANT" } } } }),
    prisma.user.count({
      where: { deletedAt: null, roles: { some: { role: "PARTICIPANT" } }, onboardingCompletedAt: { not: null } },
    }),
    prisma.project.findMany({
      where: projectFilter,
      select: { id: true, stage: true, status: true, themeId: true, countryCode: true, institutionId: true, createdAt: true },
    }),
    prisma.helpRequest.findMany({
      where: { ...(range ? { createdAt: range } : {}), ...(filters.themeId ? { themeId: filters.themeId } : {}) },
      include: { responses: { orderBy: { createdAt: "asc" }, take: 1 } },
    }),
    prisma.resource.count({
      where: { archivedAt: null, ...(range ? { createdAt: range } : {}), ...(filters.themeId ? { themeId: filters.themeId } : {}) },
    }),
    prisma.eventRegistration.count({
      where: { status: "ATTENDED", ...(range ? { updatedAt: range } : {}) },
    }),
    prisma.institutionalApproval.findMany({
      where: { isFormal: true, ...(filters.institutionId ? { institutionId: filters.institutionId } : {}) },
      select: { state: true, decidedAt: true, projectId: true },
    }),
    prisma.solutionCanvas.findMany({
      where: { project: projectFilter },
      include: {
        comments: { include: { author: { include: { roles: true } } } },
        project: { select: { themeId: true } },
      },
    }),
    prisma.challenge.findMany({ where: { ...(range ? { createdAt: range } : {}) }, select: { createdById: true } }),
    prisma.comment.findMany({ where: { deletedAt: null, ...(range ? { createdAt: range } : {}) }, select: { authorId: true } }),
    prisma.canvasVersion.findMany({
      where: { note: { not: "Canvas opened" }, ...(range ? { createdAt: range } : {}) },
      select: { authorId: true },
    }),
    prisma.helpResponse.findMany({ where: { ...(range ? { createdAt: range } : {}) }, select: { authorId: true } }),
    prisma.actionItem.findMany({
      where: { status: "DONE", completedAt: range ?? { not: null } },
      select: { ownerId: true },
    }),
    prisma.resource.findMany({ where: { ...(range ? { createdAt: range } : {}) }, select: { createdById: true } }),
  ]);

  const contributorIds = new Set<string>();
  for (const row of challenges) contributorIds.add(row.createdById);
  for (const row of comments) contributorIds.add(row.authorId);
  for (const row of versions) contributorIds.add(row.authorId);
  for (const row of responses) contributorIds.add(row.authorId);
  for (const row of completedActions) if (row.ownerId) contributorIds.add(row.ownerId);
  for (const row of contributedResources) contributorIds.add(row.createdById);
  for (const request of helpRequests) contributorIds.add(request.requesterId);

  const fields = await prisma.canvasFieldDefinition.findMany();
  const canvasFields = fields as CanvasField[];
  const reviewedCanvases = canvases.filter((canvas) => {
    const content = asCanvasContent(canvas.workingJson);
    const progress = completion(content, canvasFields);
    const reviewed = canvas.comments.some((comment) =>
      comment.author.roles.some((role) => role.role === "THEMATIC_FACILITATOR" || role.role === "PROGRAMME_MANAGER" || role.role === "PLATFORM_ADMIN"),
    );
    return reviewed && progress.ratio === 1;
  }).length;

  const actionable = helpRequests.filter((request) => request.kind !== "EXPERTISE_OFFERED");
  const answeredOnTime = actionable.filter((request) =>
    helpResponseWithinTarget(
      request.createdAt,
      request.responses[0]?.createdAt ?? null,
      targets.helpResponseWorkingDays,
    ),
  ).length;

  const summit = settings?.summitStartsOn ?? null;
  const day30 = summit ? new Date(summit.getTime() + 30 * 24 * 60 * 60 * 1000) : null;
  const day61 = summit ? new Date(summit.getTime() + 61 * 24 * 60 * 60 * 1000) : null;
  const day90 = summit ? new Date(summit.getTime() + 90 * 24 * 60 * 60 * 1000) : null;
  const approved = approvals.filter((approval) => approval.state === "APPROVED");
  const sponsorsByDay30 = day30
    ? approved.filter((approval) => approval.decidedAt && approval.decidedAt <= day30).length
    : null;
  const testsWithin90 = day90
    ? projects.filter((project) => ["TESTING", "EVIDENCE_REVIEWED", "DECISION_RECORDED"].includes(project.stage) && project.createdAt <= day90).length
    : null;

  let contributorsLate: number | null = null;
  if (day61 && day90) {
    const late = await contributorSet(day61, day90);
    contributorsLate = late.size;
  }

  const activeSince = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const contributorList = [...contributorIds].slice(0, 500);
  const activeParticipants = await prisma.user.count({
    where: {
      deletedAt: null,
      roles: { some: { role: "PARTICIPANT" } },
      OR: [
        { lastActiveAt: { gte: activeSince } },
        ...(contributorList.length ? [{ id: { in: contributorList } }] : []),
      ],
    },
  });

  return {
    definition: CONTRIBUTION_DEFINITION,
    targets,
    phase: settings?.phase ?? "PRE_SUMMIT",
    phaseLabel: settings?.phaseLabel ?? "",
    demonstration: settings?.demonstration ?? false,
    summit,
    windowNote: summit && new Date() < (day90 ?? summit)
      ? "One or more target windows are still open or have not started. Counts are recorded activity, not a completed result."
      : "Counts describe records stored in the platform. They do not show that the programme caused an outcome.",
    stock: {
      participants,
      onboarded,
      onboardingRate: participants === 0 ? null : onboarded / participants,
      activeParticipants,
    },
    flow: {
      contributors: contributorIds.size,
      helpPublished: helpRequests.length,
      helpAnswered: helpRequests.filter((request) => request.responses.length > 0).length,
      helpOnTime: actionable.length === 0 ? null : answeredOnTime,
      helpOnTimeDenominator: actionable.length,
      resources,
      attendances,
    },
    projects: {
      total: projects.length,
      byStage: countByStage(projects.map((project) => project.stage)),
      paused: projects.filter((project) => project.status === "PAUSED").length,
      closed: projects.filter((project) => project.status === "CLOSED" || project.status === "ARCHIVED").length,
      canvases: canvases.length,
      reviewedCanvases,
      sponsorsConfirmed: approved.length,
      sponsorsByDay30,
      testsWithin90,
      contributorsDays61to90: contributorsLate,
    },
    outcomes: await prisma.outcomeMeasurement.groupBy({
      by: ["evidenceLevel"],
      _count: { _all: true },
      where: { project: projectFilter },
    }),
    helpMedianDays: median(
      helpRequests
        .filter((request) => request.responses[0])
        .map((request) => workingDaysBetween(request.createdAt, request.responses[0].createdAt)),
    ),
  };
}

async function contributorSet(from: Date, to: Date) {
  const range = { gte: from, lte: to };
  const [challenges, comments, versions, help, responses, actions, resources] = await Promise.all([
    prisma.challenge.findMany({ where: { createdAt: range }, select: { createdById: true } }),
    prisma.comment.findMany({ where: { createdAt: range, deletedAt: null }, select: { authorId: true } }),
    prisma.canvasVersion.findMany({ where: { createdAt: range, note: { not: "Canvas opened" } }, select: { authorId: true } }),
    prisma.helpRequest.findMany({ where: { createdAt: range }, select: { requesterId: true } }),
    prisma.helpResponse.findMany({ where: { createdAt: range }, select: { authorId: true } }),
    prisma.actionItem.findMany({ where: { status: "DONE", completedAt: range }, select: { ownerId: true } }),
    prisma.resource.findMany({ where: { createdAt: range }, select: { createdById: true } }),
  ]);
  const ids = new Set<string>();
  challenges.forEach((row) => ids.add(row.createdById));
  comments.forEach((row) => ids.add(row.authorId));
  versions.forEach((row) => ids.add(row.authorId));
  help.forEach((row) => ids.add(row.requesterId));
  responses.forEach((row) => ids.add(row.authorId));
  actions.forEach((row) => row.ownerId && ids.add(row.ownerId));
  resources.forEach((row) => ids.add(row.createdById));
  return ids;
}

function median(values: number[]) {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}
