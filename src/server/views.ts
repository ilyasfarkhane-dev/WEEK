import type { ChallengeStatus, ProjectStage } from "@prisma/client";
import { canCreateChallenge, canEditProject, canManageEvents, canReadProjectNarrative, hasFormalApproval, hasRole, isCommunityMember, isOperator, profileAccess, projectAccess } from "@/lib/authz";
import { prisma } from "@/lib/db";
import { requireActor, requireUser, toActor } from "@/server/actor";
import { challengeWhere, eventWhere, helpWhere, projectWhere, resourceWhere } from "@/server/access";
import { loadProgrammeMetrics } from "@/server/metrics-query";
import { loadProject } from "@/server/records";

function one(query: Record<string, unknown>, name: string) {
  const value = query[name];
  return typeof value === "string" ? value : undefined;
}

export async function loadView(pathname: string, query: Record<string, unknown>) {
  if (pathname === "/dashboard") return loadDashboard();
  if (pathname === "/themes") return loadThemes();
  if (pathname === "/challenges") return loadChallenges(query);
  if (pathname === "/projects") return loadProjects(query);
  if (pathname === "/help-requests") return loadHelp(query);
  if (pathname === "/knowledge") return loadKnowledge(query);
  if (pathname === "/events") return loadEvents();
  if (pathname === "/community") return { ok: true };
  if (pathname === "/community/members") return loadMembers(query);
  if (pathname === "/notifications") return loadNotifications();
  const theme = pathname.match(/^\/themes\/([^/]+)$/);
  if (theme) return loadTheme(decodeURIComponent(theme[1]));
  const project = pathname.match(/^\/projects\/([^/]+)$/);
  if (project && project[1] !== "new") return loadProjectPage(decodeURIComponent(project[1]));
  return { notFound: true };
}

async function loadDashboard() {
  const user = await requireUser();
  const actor = toActor(user);
  const primary = actor.primaryThemeId ? await prisma.theme.findUnique({ where: { id: actor.primaryThemeId } }) : null;
  const [projects, actions, events, posts, requests, notifications, resources, announcements] = await Promise.all([
    prisma.project.findMany({
      where: { ...projectWhere(actor), status: { in: ["ACTIVE", "PAUSED"] } },
      include: { theme: true },
      orderBy: { updatedAt: "desc" },
      take: 5,
    }),
    prisma.actionItem.findMany({
      where: { ownerId: actor.id, status: { in: ["OPEN", "IN_PROGRESS"] } },
      orderBy: { dueOn: "asc" },
      take: 6,
    }),
    prisma.event.findMany({
      where: { startsAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }, OR: [{ visibility: "PROGRAMME" }, { themeId: { in: actor.themeIds.length ? actor.themeIds : ["__none__"] } }, { registrations: { some: { userId: actor.id } } }] },
      orderBy: { startsAt: "asc" },
      take: 5,
    }),
    prisma.comment.findMany({
      where: { deletedAt: null, themeId: { in: actor.themeIds.length ? actor.themeIds : ["__none__"] } },
      include: { author: { select: { name: true } }, theme: true },
      orderBy: { createdAt: "desc" },
      take: 4,
    }),
    prisma.helpRequest.findMany({
      where: { status: { in: ["OPEN", "MATCHED", "IN_DISCUSSION"] }, OR: [{ requesterId: actor.id }, { themeId: { in: actor.themeIds.length ? actor.themeIds : ["__none__"] }, visibility: { in: ["TEAM", "PROGRAMME"] } }] },
      orderBy: { createdAt: "desc" },
      take: 4,
    }),
    prisma.notification.findMany({ where: { userId: actor.id }, orderBy: { createdAt: "desc" }, take: 5 }),
    prisma.resource.findMany({ where: { featured: true, verification: "VERIFIED", archivedAt: null, visibility: "PROGRAMME" }, take: 3 }),
    prisma.announcement.findMany({ where: { OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }] }, orderBy: { createdAt: "desc" }, take: 2 }),
  ]);
  const tagIds = (await prisma.userExpertise.findMany({ where: { userId: actor.id } })).map((item) => item.tagId);
  const peers = tagIds.length
    ? await prisma.user.findMany({
        where: { id: { not: actor.id }, status: "ACTIVE", deletedAt: null, profile: { profileVisibility: "PROGRAMME" }, expertise: { some: { tagId: { in: tagIds } } } },
        include: { profile: true, institution: true, expertise: { include: { tag: true } } },
        take: 4,
      })
    : [];
  const manager = isOperator(actor) || hasRole(actor, "INSTITUTIONAL_SPONSOR");
  const metrics = manager ? await loadProgrammeMetrics({}) : null;
  return {
    firstName: user.name.split(" ")[0],
    primaryName: primary?.name ?? null,
    metrics,
    announcements,
    projects,
    actions,
    events,
    posts,
    requests,
    notifications,
    resources,
    peers: peers.map((peer) => ({
      id: peer.id,
      name: peer.name,
      profile: peer.profile ? { title: peer.profile.title } : null,
      institution: peer.institution ? { name: peer.institution.name } : null,
      expertise: peer.expertise.map((item) => ({ tag: { label: item.tag.label } })),
    })),
  };
}

async function loadThemes() {
  const { actor } = await requireActor();
  const themes = await prisma.theme.findMany({
    where: { archivedAt: null },
    orderBy: { sortOrder: "asc" },
    include: { _count: { select: { memberships: true, projects: true } }, facilitator: { select: { name: true } } },
  });
  return { themes: themes.map((theme) => ({ ...theme, mine: actor.themeIds.includes(theme.id) })) };
}

const CHALLENGE_STATUSES: ChallengeStatus[] = ["SUBMITTED", "UNDER_REVIEW", "SELECTED", "MERGED", "REFERRED", "RETAINED", "CLOSED"];

async function loadChallenges(query: Record<string, unknown>) {
  const { actor } = await requireActor();
  const page = Math.max(1, Number(one(query, "page")) || 1);
  const status = CHALLENGE_STATUSES.find((item) => item === one(query, "status"));
  const q = one(query, "q")?.trim();
  const where = {
    AND: [
      challengeWhere(actor),
      status ? { status } : {},
      one(query, "country") ? { countryCode: one(query, "country") } : {},
      one(query, "theme") ? { theme: { slug: one(query, "theme") } } : {},
      q ? { OR: [{ title: { contains: q, mode: "insensitive" as const } }, { code: { contains: q, mode: "insensitive" as const } }, { problemStatement: { contains: q, mode: "insensitive" as const } }] } : {},
    ],
  };
  const [total, rows, themes, countries] = await Promise.all([
    prisma.challenge.count({ where }),
    prisma.challenge.findMany({ where, include: { theme: true, country: true, institution: true }, orderBy: one(query, "sort") === "title" ? { title: "asc" } : { updatedAt: "desc" }, skip: (page - 1) * 20, take: 20 }),
    prisma.theme.findMany({ where: { archivedAt: null }, orderBy: { sortOrder: "asc" } }),
    prisma.country.findMany({ orderBy: { name: "asc" } }),
  ]);
  return { page, pages: Math.max(1, Math.ceil(total / 20)), rows, themes, countries, q: q ?? "", status: status ?? "", theme: one(query, "theme") ?? "", country: one(query, "country") ?? "", canCreate: canCreateChallenge(actor) };
}

const PROJECT_STAGES: ProjectStage[] = ["PROBLEM_DEFINED", "PROPOSAL_DEVELOPED", "AUTHORIZATION_SOUGHT", "TEST_APPROVED", "TESTING", "EVIDENCE_REVIEWED", "DECISION_RECORDED"];

async function loadProjects(query: Record<string, unknown>) {
  const { actor } = await requireActor();
  const page = Math.max(1, Number(one(query, "page")) || 1);
  const stage = PROJECT_STAGES.find((item) => item === one(query, "stage"));
  const q = one(query, "q")?.trim();
  const where = {
    AND: [
      projectWhere(actor),
      { archivedAt: null },
      stage ? { stage } : {},
      one(query, "country") ? { countryCode: one(query, "country") } : {},
      one(query, "theme") ? { theme: { slug: one(query, "theme") } } : {},
      q ? { OR: [{ title: { contains: q, mode: "insensitive" as const } }, { code: { contains: q, mode: "insensitive" as const } }] } : {},
    ],
  };
  const [total, rows, themes] = await Promise.all([
    prisma.project.count({ where }),
    prisma.project.findMany({ where, include: { theme: true, country: true, institution: true, members: true, grants: true }, orderBy: { updatedAt: "desc" }, skip: (page - 1) * 20, take: 20 }),
    prisma.theme.findMany({ where: { archivedAt: null }, orderBy: { sortOrder: "asc" } }),
  ]);
  return {
    page,
    pages: Math.max(1, Math.ceil(total / 20)),
    themes,
    q: q ?? "",
    stage: stage ?? "",
    theme: one(query, "theme") ?? "",
    canCreate: isCommunityMember(actor),
    rows: rows.map((project) => {
      const grant = project.grants.find((item) => item.userId === actor.id);
      const level = projectAccess(actor, { leadId: project.leadId, themeId: project.themeId, visibility: project.visibility, confidentiality: project.confidentiality, memberIds: project.members.map((member) => member.userId), grantPermission: grant?.permission ?? null });
      return { id: project.id, code: project.code, stage: project.stage, status: project.status, title: level === "summary" ? "Restricted project record" : project.title, theme: project.theme.name, country: project.country.name, institution: project.institution.name };
    }),
  };
}

async function loadHelp(query: Record<string, unknown>) {
  const { actor } = await requireActor();
  const page = Math.max(1, Number(one(query, "page")) || 1);
  const q = one(query, "q")?.trim();
  const where = {
    AND: [
      helpWhere(actor),
      one(query, "status") ? { status: one(query, "status") as "OPEN" } : {},
      one(query, "theme") ? { theme: { slug: one(query, "theme") } } : {},
      q ? { OR: [{ title: { contains: q, mode: "insensitive" as const } }, { skillsRequired: { contains: q, mode: "insensitive" as const } }, { description: { contains: q, mode: "insensitive" as const } }] } : {},
    ],
  };
  const [total, rows] = await Promise.all([
    prisma.helpRequest.count({ where }),
    prisma.helpRequest.findMany({ where, include: { theme: true, requester: { include: { institution: true } } }, orderBy: { updatedAt: "desc" }, skip: (page - 1) * 20, take: 20 }),
  ]);
  return { page, pages: Math.max(1, Math.ceil(total / 20)), q: q ?? "", canCreate: isCommunityMember(actor), rows };
}

async function loadKnowledge(query: Record<string, unknown>) {
  const { actor } = await requireActor();
  const q = one(query, "q")?.trim();
  const rows = await prisma.resource.findMany({
    where: {
      AND: [
        resourceWhere(actor),
        one(query, "type") ? { type: one(query, "type") as "TEMPLATE" } : {},
        one(query, "theme") ? { theme: { slug: one(query, "theme") } } : {},
        q ? { OR: [{ title: { contains: q, mode: "insensitive" as const } }, { description: { contains: q, mode: "insensitive" as const } }] } : {},
      ],
    },
    include: { theme: true },
    orderBy: [{ featured: "desc" }, { updatedAt: "desc" }],
    take: 50,
  });
  return { q: q ?? "", canCreate: isCommunityMember(actor), rows };
}

async function loadEvents() {
  const { actor } = await requireActor();
  const events = await prisma.event.findMany({
    where: eventWhere(actor),
    include: { theme: true, _count: { select: { registrations: true } } },
    orderBy: { startsAt: "asc" },
  });
  return { canManage: canManageEvents(actor), events };
}

async function loadMembers(query: Record<string, unknown>) {
  const { actor } = await requireActor();
  const q = one(query, "q")?.trim();
  const people = await prisma.user.findMany({
    where: {
      status: "ACTIVE",
      deletedAt: null,
      ...(one(query, "country") ? { profile: { countryCode: one(query, "country") } } : {}),
      ...(one(query, "institution") ? { institutionId: one(query, "institution") } : {}),
      ...(one(query, "theme") ? { memberships: { some: { theme: { slug: one(query, "theme") } } } } : {}),
      ...(q ? { OR: [{ name: { contains: q, mode: "insensitive" as const } }, { profile: { title: { contains: q, mode: "insensitive" as const } } }] } : {}),
    },
    include: { profile: true, institution: true, expertise: { include: { tag: true } }, memberships: { include: { theme: true } } },
    orderBy: { name: "asc" },
    take: 80,
  });
  const [countries, institutions, themes] = await Promise.all([
    prisma.country.findMany({ orderBy: { name: "asc" } }),
    prisma.institution.findMany({ where: { archivedAt: null }, orderBy: { name: "asc" } }),
    prisma.theme.findMany({ where: { archivedAt: null }, orderBy: { sortOrder: "asc" } }),
  ]);
  return {
    q: q ?? "",
    country: one(query, "country") ?? "",
    institution: one(query, "institution") ?? "",
    theme: one(query, "theme") ?? "",
    countries,
    institutions,
    themes,
    people: people.filter((person) => person.profile && profileAccess(actor, { userId: person.id, visibility: person.profile.profileVisibility, themeIds: person.memberships.map((membership) => membership.themeId) }) !== "none").map((person) => ({
      id: person.id,
      name: person.name,
      title: person.profile?.title ?? "",
      institution: person.institution?.name ?? "",
      expertise: person.expertise.map((item) => item.tag.label),
      themes: person.memberships.map((membership) => membership.theme.name),
      visibility: person.profile?.profileVisibility ?? "",
    })),
  };
}

async function loadTheme(slug: string) {
  const { actor } = await requireActor();
  const theme = await prisma.theme.findUnique({
    where: { slug },
    include: {
      facilitator: { select: { name: true } },
      memberships: { include: { user: { include: { profile: true, institution: true, expertise: { include: { tag: true } }, memberships: true } } } },
      projects: { where: { AND: [{ archivedAt: null }, projectWhere(actor)] }, take: 8, orderBy: { updatedAt: "desc" } },
      challenges: { where: { AND: [{ archivedAt: null }, challengeWhere(actor)] }, take: 8, orderBy: { updatedAt: "desc" } },
      resources: { where: resourceWhere(actor), take: 6 },
      events: { where: { startsAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } }, orderBy: { startsAt: "asc" }, take: 6 },
      actions: { where: { status: { in: ["OPEN", "IN_PROGRESS"] } }, include: { owner: { select: { name: true } } }, take: 8 },
      comments: { where: { deletedAt: null }, include: { author: { select: { name: true } } }, orderBy: { createdAt: "desc" }, take: 20 },
      notes: { include: { author: { select: { name: true } } }, orderBy: { createdAt: "desc" }, take: 10 },
      activities: { orderBy: { createdAt: "desc" }, take: 8 },
    },
  });
  if (!theme || theme.archivedAt) return { notFound: true };
  const members = theme.memberships.flatMap((membership) => {
    const access = membership.user.profile
      ? profileAccess(actor, { userId: membership.userId, visibility: membership.user.profile.profileVisibility, themeIds: membership.user.memberships.map((item) => item.themeId) })
      : "none";
    if (access === "none") return [];
    return [{
      id: membership.id,
      name: membership.user.name,
      role: membership.role,
      primary: membership.isPrimary,
      title: membership.user.profile?.title ?? "",
      institution: membership.user.institution?.name ?? "",
      expertise: access === "full" || access === "limited" ? membership.user.expertise.map((item) => item.tag.label) : [],
    }];
  });
  return {
    canPost: isOperator(actor) || actor.themeIds.includes(theme.id) || actor.facilitatedThemeIds.includes(theme.id),
    canNote: actor.facilitatedThemeIds.includes(theme.id) || isOperator(actor),
    theme: { ...theme, memberships: members },
  };
}

async function loadProjectPage(id: string) {
  const { actor } = await requireActor();
  const loaded = await loadProject(actor, id);
  if (!loaded) return { notFound: true };
  const { project, level } = loaded;
  const narrative = canReadProjectNarrative(level);
  const editable = canEditProject(level);
  const institutions = editable ? await prisma.institution.findMany({ where: { archivedAt: null }, orderBy: { name: "asc" } }) : [];
  const people = editable
    ? await prisma.user.findMany({ where: { status: "ACTIVE", deletedAt: null }, select: { id: true, name: true, email: true }, orderBy: { name: "asc" }, take: 100 })
    : [];
  return {
    narrative,
    editable,
    operator: isOperator(actor),
    viewerId: actor.id,
    approved: hasFormalApproval(project.approvals),
    institutions: institutions.map((item) => ({ id: item.id, name: item.name })),
    people: people.map((person) => ({ id: person.id, name: person.name, email: isOperator(actor) ? person.email : "" })),
    project,
  };
}

async function loadNotifications() {
  const { actor } = await requireActor();
  const items = await prisma.notification.findMany({ where: { userId: actor.id }, orderBy: { createdAt: "desc" }, take: 50 });
  const openRequests = await prisma.helpRequest.count({ where: { requesterId: actor.id, status: { in: ["OPEN", "MATCHED", "IN_DISCUSSION"] } } });
  return { items, openRequests };
}
