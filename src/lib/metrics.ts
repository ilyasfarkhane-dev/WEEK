import type { ProjectStage } from "@prisma/client";

export const DEFAULT_TARGETS: ProgrammeTargets = {
  substantiveContributorsBeforeEvent: 60,
  cohortSize: 80,
  reviewedCanvases: 8,
  helpResponseWorkingDays: 5,
  sponsorsByDay30: 4,
  contributorsDays61to90: 32,
  authorizedTestsWithin90Days: 2,
};

export type ProgrammeTargets = {
  substantiveContributorsBeforeEvent: number;
  cohortSize: number;
  reviewedCanvases: number;
  helpResponseWorkingDays: number;
  sponsorsByDay30: number;
  contributorsDays61to90: number;
  authorizedTestsWithin90Days: number;
};

export type TargetKey = keyof ProgrammeTargets;

/**
 * A meaningful contribution is a stored record the person authored:
 * a challenge, discussion comment, canvas version, help request, help response,
 * completed action, or knowledge resource. Signing in is not a contribution.
 */
export const CONTRIBUTION_DEFINITION =
  "A meaningful contribution is a challenge, discussion comment, canvas version, help request, help response, completed action, or knowledge resource recorded in the selected period.";

export function ratio(numerator: number, denominator: number) {
  if (denominator <= 0) return null;
  return numerator / denominator;
}

export function workingDaysBetween(start: Date, end: Date) {
  let count = 0;
  const cursor = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate()));
  const last = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate()));
  while (cursor < last) {
    cursor.setUTCDate(cursor.getUTCDate() + 1);
    const day = cursor.getUTCDay();
    if (day !== 0 && day !== 6) count += 1;
  }
  return count;
}

export function helpResponseWithinTarget(createdAt: Date, firstResponseAt: Date | null, workingDays: number) {
  if (!firstResponseAt) return false;
  return workingDaysBetween(createdAt, firstResponseAt) <= workingDays;
}

export type TargetComparison = "insufficient" | "met" | "not_yet";

export function compareTarget(observed: number | null, target: number | null): TargetComparison {
  if (observed === null || target === null) return "insufficient";
  return observed >= target ? "met" : "not_yet";
}

export const STAGE_ORDER: ProjectStage[] = [
  "PROBLEM_DEFINED",
  "PROPOSAL_DEVELOPED",
  "AUTHORIZATION_SOUGHT",
  "TEST_APPROVED",
  "TESTING",
  "EVIDENCE_REVIEWED",
  "DECISION_RECORDED",
];

export function countByStage(stages: ProjectStage[]) {
  const counts = Object.fromEntries(STAGE_ORDER.map((stage) => [stage, 0])) as Record<ProjectStage, number>;
  for (const stage of stages) counts[stage] += 1;
  return counts;
}


export function readTargets(value: unknown): ProgrammeTargets {
  const source = value && typeof value === "object" ? (value as Record<string, unknown>) : {};
  return {
    substantiveContributorsBeforeEvent: numberOr(source.substantiveContributorsBeforeEvent, 60),
    cohortSize: numberOr(source.cohortSize, 80),
    reviewedCanvases: numberOr(source.reviewedCanvases, 8),
    helpResponseWorkingDays: numberOr(source.helpResponseWorkingDays, 5),
    sponsorsByDay30: numberOr(source.sponsorsByDay30, 4),
    contributorsDays61to90: numberOr(source.contributorsDays61to90, 32),
    authorizedTestsWithin90Days: numberOr(source.authorizedTestsWithin90Days, 2),
  };
}

function numberOr(value: unknown, fallback: number) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}
