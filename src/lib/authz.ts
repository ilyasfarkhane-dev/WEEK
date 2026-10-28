import type {
  ApprovalState,
  AppRole,
  Confidentiality,
  HelpRequestKind,
  ProjectStage,
  ResourceVerification,
  UserStatus,
  Visibility,
} from "@prisma/client";

export type Actor = {
  id: string;
  status: UserStatus;
  roles: AppRole[];
  institutionId: string | null;
  themeIds: string[];
  facilitatedThemeIds: string[];
  primaryThemeId: string | null;
};

export type AccessLevel = "none" | "summary" | "full" | "edit";

export type ProjectAccessInput = {
  leadId: string;
  themeId: string;
  visibility: Visibility;
  confidentiality: Confidentiality;
  memberIds: string[];
  grantPermission: string | null;
};

export type ChallengeAccessInput = {
  ownerId: string;
  createdById: string;
  themeId: string;
  visibility: Visibility;
  confidentiality: Confidentiality;
  grantPermission: string | null;
};

export type HelpAccessInput = {
  requesterId: string;
  assigneeId: string | null;
  themeId: string | null;
  visibility: Visibility;
  kind: HelpRequestKind;
};

export type ResourceAccessInput = {
  createdById: string;
  themeId: string | null;
  visibility: Visibility;
  verification: ResourceVerification;
  archived: boolean;
};

export type ProfileAccessInput = {
  userId: string;
  visibility: "PROGRAMME" | "TEAM" | "PRIVATE";
  themeIds: string[];
};

const COMMUNITY: AppRole[] = [
  "PLATFORM_ADMIN",
  "PROGRAMME_MANAGER",
  "THEMATIC_FACILITATOR",
  "PARTICIPANT",
];

export function hasRole(actor: Actor, role: AppRole) {
  return actor.roles.includes(role);
}

export function hasAnyRole(actor: Actor, roles: AppRole[]) {
  return roles.some((role) => actor.roles.includes(role));
}

export function isPlatformAdmin(actor: Actor) {
  return hasRole(actor, "PLATFORM_ADMIN");
}

export function isProgrammeManager(actor: Actor) {
  return hasRole(actor, "PROGRAMME_MANAGER");
}

export function isOperator(actor: Actor) {
  return isPlatformAdmin(actor) || isProgrammeManager(actor);
}

export function isCommunityMember(actor: Actor) {
  return hasAnyRole(actor, COMMUNITY);
}

export function sharesTheme(actor: Actor, themeId: string | null) {
  if (!themeId) return false;
  return actor.themeIds.includes(themeId) || actor.facilitatedThemeIds.includes(themeId);
}

function active(actor: Actor) {
  return actor.status === "ACTIVE";
}

export function projectAccess(actor: Actor, project: ProjectAccessInput): AccessLevel {
  if (!active(actor)) return "none";
  if (isPlatformAdmin(actor)) return "edit";

  const member = project.leadId === actor.id || project.memberIds.includes(actor.id);
  const facilitator = actor.facilitatedThemeIds.includes(project.themeId);
  const grant = project.grantPermission;

  if (project.confidentiality === "RESTRICTED" || project.visibility === "RESTRICTED") {
    if (member || grant === "EDIT") return "edit";
    if (grant === "VIEW") return "full";
    if (isProgrammeManager(actor)) return "summary";
    return "none";
  }

  if (member || facilitator || grant === "EDIT") return "edit";
  if (grant === "VIEW") return "full";

  if (project.confidentiality === "CONFIDENTIAL" || project.visibility === "PRIVATE") {
    if (isProgrammeManager(actor)) return "summary";
    return "none";
  }

  if (project.visibility === "TEAM") {
    if (sharesTheme(actor, project.themeId) && isCommunityMember(actor)) return "full";
    if (isProgrammeManager(actor)) return "summary";
    return "none";
  }

  if (isCommunityMember(actor) || isProgrammeManager(actor)) return "full";
  return "none";
}

export function canEditProject(level: AccessLevel) {
  return level === "edit";
}

export function canReadProjectNarrative(level: AccessLevel) {
  return level === "full" || level === "edit";
}

export function challengeAccess(actor: Actor, challenge: ChallengeAccessInput): AccessLevel {
  if (!active(actor)) return "none";
  if (isPlatformAdmin(actor)) return "edit";
  const owner = challenge.ownerId === actor.id || challenge.createdById === actor.id;
  const facilitator = actor.facilitatedThemeIds.includes(challenge.themeId);
  if (challenge.confidentiality === "RESTRICTED" || challenge.visibility === "RESTRICTED") {
    if (owner || challenge.grantPermission === "EDIT") return "edit";
    if (challenge.grantPermission === "VIEW") return "full";
    if (isProgrammeManager(actor)) return "summary";
    return "none";
  }
  if (owner || facilitator || challenge.grantPermission === "EDIT") return "edit";
  if (challenge.grantPermission === "VIEW") return "full";
  if (challenge.confidentiality === "CONFIDENTIAL" || challenge.visibility === "PRIVATE") {
    return isProgrammeManager(actor) ? "summary" : "none";
  }
  if (challenge.visibility === "TEAM") {
    if (sharesTheme(actor, challenge.themeId) && isCommunityMember(actor)) return "full";
    return isProgrammeManager(actor) ? "summary" : "none";
  }
  if (isCommunityMember(actor)) return owner ? "edit" : "full";
  return "none";
}

export function canReviewChallenge(actor: Actor, themeId: string) {
  if (!active(actor)) return false;
  if (isOperator(actor)) return true;
  return actor.facilitatedThemeIds.includes(themeId);
}

export function canViewHelp(actor: Actor, request: HelpAccessInput) {
  if (!active(actor)) return false;
  if (isOperator(actor)) return true;
  if (request.requesterId === actor.id || request.assigneeId === actor.id) return true;
  if (request.visibility === "PRIVATE" || request.visibility === "RESTRICTED") return false;
  const expertOnly =
    hasRole(actor, "EXPERT") &&
    !isCommunityMember(actor) &&
    !hasRole(actor, "INSTITUTIONAL_SPONSOR");
  if (expertOnly) {
    return request.kind === "EXPERT_REVIEW" && request.visibility === "PROGRAMME";
  }
  if (!isCommunityMember(actor)) return false;
  if (request.visibility === "TEAM") return sharesTheme(actor, request.themeId);
  return request.visibility === "PROGRAMME";
}

export function canViewResource(actor: Actor, resource: ResourceAccessInput) {
  if (!active(actor)) return false;
  if (resource.archived && !isPlatformAdmin(actor)) return false;
  if (resource.verification === "DRAFT") {
    return resource.createdById === actor.id || isOperator(actor);
  }
  if (isOperator(actor)) return true;
  if (resource.visibility === "PRIVATE") return resource.createdById === actor.id;
  if (resource.visibility === "RESTRICTED") return false;
  if (resource.visibility === "TEAM") {
    return isCommunityMember(actor) && sharesTheme(actor, resource.themeId);
  }
  if (resource.verification === "VERIFIED") {
    return (
      isCommunityMember(actor) ||
      hasRole(actor, "EXPERT") ||
      hasRole(actor, "INSTITUTIONAL_SPONSOR")
    );
  }
  return isCommunityMember(actor);
}

export function profileAccess(actor: Actor, profile: ProfileAccessInput): "none" | "limited" | "full" {
  if (!active(actor)) return "none";
  if (actor.id === profile.userId || isOperator(actor)) return "full";
  if (profile.themeIds.some((id) => actor.facilitatedThemeIds.includes(id))) return "full";
  if (profile.visibility === "PRIVATE") return "none";
  if (profile.visibility === "TEAM") {
    return profile.themeIds.some((id) => actor.themeIds.includes(id)) ? "limited" : "none";
  }
  if (!isCommunityMember(actor) && !hasRole(actor, "EXPERT") && !hasRole(actor, "INSTITUTIONAL_SPONSOR")) {
    return "none";
  }
  if (!isCommunityMember(actor)) return "none";
  return "limited";
}

export function canViewEvent(
  actor: Actor,
  event: { themeId: string | null; visibility: Visibility; hostId: string | null; registered: boolean },
) {
  if (!active(actor)) return false;
  if (isOperator(actor) || event.hostId === actor.id || event.registered) return true;
  if (!isCommunityMember(actor)) return false;
  if (event.visibility === "PRIVATE" || event.visibility === "RESTRICTED") return false;
  if (event.visibility === "TEAM") return sharesTheme(actor, event.themeId);
  return true;
}

export function canViewAnalytics(actor: Actor) {
  return active(actor) && (isOperator(actor) || hasRole(actor, "INSTITUTIONAL_SPONSOR"));
}

export type AdminSection =
  | "home"
  | "users"
  | "institutions"
  | "themes"
  | "projects"
  | "resources"
  | "events"
  | "analytics"
  | "audit"
  | "settings"
  | "email";

export function canAccessAdmin(actor: Actor, section: AdminSection) {
  if (!active(actor)) return false;
  if (section === "analytics") return canViewAnalytics(actor);
  if (section === "audit" || section === "settings" || section === "email") {
    return isPlatformAdmin(actor);
  }
  if (section === "users") return isOperator(actor);
  return isOperator(actor);
}

export function canManageEvents(actor: Actor) {
  return isOperator(actor);
}

export function canCurateResources(actor: Actor) {
  return isOperator(actor);
}

export function canCreateChallenge(actor: Actor) {
  return isCommunityMember(actor);
}

export function canCreateProject(actor: Actor, themeId: string) {
  if (isOperator(actor)) return true;
  if (!isCommunityMember(actor)) return false;
  return sharesTheme(actor, themeId);
}

export type ApprovalLike = { state: ApprovalState; isFormal: boolean };

export function hasFormalApproval(approvals: ApprovalLike[]) {
  return approvals.some((approval) => approval.isFormal && approval.state === "APPROVED");
}

export function stageRequiresFormalApproval(stage: ProjectStage) {
  return stage === "TEST_APPROVED" || stage === "TESTING";
}

export function stageChangeAllowed(next: ProjectStage, approvals: ApprovalLike[]) {
  if (!stageRequiresFormalApproval(next)) return true;
  return hasFormalApproval(approvals);
}

export function canSuspendUsers(actor: Actor) {
  return isPlatformAdmin(actor);
}
