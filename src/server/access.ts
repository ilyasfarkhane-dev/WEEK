import type { Prisma } from "@prisma/client";
import {
  isCommunityMember,
  isOperator,
  isPlatformAdmin,
  isProgrammeManager,
  hasRole,
  type Actor,
} from "@/lib/authz";

export function projectWhere(actor: Actor): Prisma.ProjectWhereInput {
  if (isPlatformAdmin(actor) || isProgrammeManager(actor)) return {};
  const community = isCommunityMember(actor);
  const expertOnly = hasRole(actor, "EXPERT") && !community;
  return {
    OR: [
      { leadId: actor.id },
      { members: { some: { userId: actor.id } } },
      { grants: { some: { userId: actor.id } } },
      ...(actor.facilitatedThemeIds.length
        ? [
            {
              themeId: { in: actor.facilitatedThemeIds },
              confidentiality: { not: "RESTRICTED" as const },
              visibility: { not: "RESTRICTED" as const },
            },
          ]
        : []),
      ...(community
        ? [
            { confidentiality: "INTERNAL" as const, visibility: "PROGRAMME" as const },
            {
              confidentiality: "INTERNAL" as const,
              visibility: "TEAM" as const,
              themeId: { in: actor.themeIds.length ? actor.themeIds : ["__none__"] },
            },
          ]
        : []),
      ...(expertOnly ? [{ id: "__no_expert_catalogue__" }] : []),
    ],
  };
}

export function challengeWhere(actor: Actor): Prisma.ChallengeWhereInput {
  if (isOperator(actor)) return { archivedAt: null };
  const community = isCommunityMember(actor);
  return {
    archivedAt: null,
    OR: [
      { ownerId: actor.id },
      { createdById: actor.id },
      { grants: { some: { userId: actor.id } } },
      ...(actor.facilitatedThemeIds.length
        ? [
            {
              themeId: { in: actor.facilitatedThemeIds },
              confidentiality: { not: "RESTRICTED" as const },
              visibility: { not: "RESTRICTED" as const },
            },
          ]
        : []),
      ...(community
        ? [
            { confidentiality: "INTERNAL" as const, visibility: "PROGRAMME" as const },
            {
              confidentiality: "INTERNAL" as const,
              visibility: "TEAM" as const,
              themeId: { in: actor.themeIds.length ? actor.themeIds : ["__none__"] },
            },
          ]
        : []),
    ],
  };
}

export function helpWhere(actor: Actor): Prisma.HelpRequestWhereInput {
  if (isOperator(actor)) return {};
  const community = isCommunityMember(actor);
  const expertOnly = hasRole(actor, "EXPERT") && !community;
  return {
    OR: [
      { requesterId: actor.id },
      { assigneeId: actor.id },
      ...(community
        ? [
            { visibility: "PROGRAMME" as const },
            {
              visibility: "TEAM" as const,
              themeId: { in: actor.themeIds.length ? actor.themeIds : ["__none__"] },
            },
          ]
        : []),
      ...(expertOnly ? [{ kind: "EXPERT_REVIEW" as const, visibility: "PROGRAMME" as const }] : []),
    ],
  };
}

export function resourceWhere(actor: Actor): Prisma.ResourceWhereInput {
  if (isPlatformAdmin(actor)) return {};
  if (isProgrammeManager(actor)) return { archivedAt: null };
  const community = isCommunityMember(actor);
  const guestReader = hasRole(actor, "EXPERT") || hasRole(actor, "INSTITUTIONAL_SPONSOR");
  return {
    archivedAt: null,
    OR: [
      { createdById: actor.id },
      ...(community
        ? [
            { verification: { not: "DRAFT" as const }, visibility: "PROGRAMME" as const },
            {
              verification: { not: "DRAFT" as const },
              visibility: "TEAM" as const,
              themeId: { in: actor.themeIds.length ? actor.themeIds : ["__none__"] },
            },
          ]
        : []),
      ...(guestReader
        ? [{ verification: "VERIFIED" as const, visibility: "PROGRAMME" as const }]
        : []),
    ],
  };
}

export function eventWhere(actor: Actor): Prisma.EventWhereInput {
  if (isOperator(actor)) return {};
  if (!isCommunityMember(actor)) {
    return {
      OR: [{ hostId: actor.id }, { registrations: { some: { userId: actor.id } } }],
    };
  }
  return {
    OR: [
      { hostId: actor.id },
      { registrations: { some: { userId: actor.id } } },
      { visibility: "PROGRAMME" },
      {
        visibility: "TEAM",
        themeId: { in: actor.themeIds.length ? actor.themeIds : ["__none__"] },
      },
    ],
  };
}
