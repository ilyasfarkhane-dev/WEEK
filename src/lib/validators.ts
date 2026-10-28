import { z } from "zod";

export const passwordSchema = z
  .string()
  .min(12, "Use at least 12 characters.")
  .max(72, "Use at most 72 characters.")
  .regex(/[a-z]/, "Include a lowercase letter.")
  .regex(/[A-Z]/, "Include an uppercase letter.")
  .regex(/[0-9]/, "Include a number.");

export const loginSchema = z.object({
  email: z.string().trim().email("Enter a valid email address.").max(200),
  password: z.string().min(1, "Enter your password.").max(72),
});

export const invitationAcceptSchema = z.object({
  token: z.string().trim().min(20).max(200),
  password: passwordSchema,
  confirmPassword: z.string(),
}).refine((value) => value.password === value.confirmPassword, {
  message: "The passwords do not match.",
  path: ["confirmPassword"],
});

export const resetRequestSchema = z.object({
  email: z.string().trim().email().max(200),
});

export const resetPasswordSchema = z.object({
  token: z.string().trim().min(20).max(200),
  password: passwordSchema,
  confirmPassword: z.string(),
}).refine((value) => value.password === value.confirmPassword, {
  message: "The passwords do not match.",
  path: ["confirmPassword"],
});

export const profileSchema = z.object({
  fullName: z.string().trim().min(2).max(120),
  title: z.string().trim().max(160),
  institutionId: z.string().trim().min(1, "Choose an institution."),
  countryCode: z.string().trim().length(2),
  biography: z.string().trim().max(2000),
  expertise: z.array(z.string()).max(12),
  themesOfInterest: z.array(z.string()).max(8),
  expertiseOffered: z.string().trim().max(1000),
  supportRequested: z.string().trim().max(1000),
  preferredLanguage: z.enum(["en", "fr", "ar"]),
  profileVisibility: z.enum(["PROGRAMME", "TEAM", "PRIVATE"]),
  acceptRules: z.boolean().optional(),
});

export const onboardingSchema = profileSchema.extend({
  acceptRules: z.boolean().refine((value) => value, "Accept the participation rules to continue."),
});

export const challengeSchema = z.object({
  title: z.string().trim().min(8).max(180),
  problemStatement: z.string().trim().min(20).max(4000),
  institutionId: z.string().min(1),
  countryCode: z.string().length(2),
  context: z.string().trim().min(10).max(4000),
  affectedUsers: z.string().trim().min(5).max(2000),
  evidence: z.string().trim().max(4000),
  previousAttempts: z.string().trim().max(4000),
  expectedBenefit: z.string().trim().min(5).max(2000),
  themeId: z.string().min(1),
  expertiseRequired: z.string().trim().max(1000),
  visibility: z.enum(["PRIVATE", "TEAM", "PROGRAMME", "RESTRICTED"]),
  confidentiality: z.enum(["INTERNAL", "CONFIDENTIAL", "RESTRICTED"]),
});

export const reviewSchema = z.object({
  challengeId: z.string().min(1),
  status: z.enum([
    "SUBMITTED",
    "UNDER_REVIEW",
    "SELECTED",
    "MERGED",
    "REFERRED",
    "RETAINED",
    "CLOSED",
  ]),
  decisionNote: z.string().trim().min(5).max(2000),
  mergedIntoId: z.string().optional(),
});

export const projectSchema = z.object({
  title: z.string().trim().min(8).max(180),
  summary: z.string().trim().min(20).max(4000),
  institutionId: z.string().min(1),
  countryCode: z.string().length(2),
  themeId: z.string().min(1),
  challengeId: z.string().optional(),
  visibility: z.enum(["PRIVATE", "TEAM", "PROGRAMME", "RESTRICTED"]),
  confidentiality: z.enum(["INTERNAL", "CONFIDENTIAL", "RESTRICTED"]),
  collaboratorIds: z.array(z.string()).max(30).optional(),
});

export const projectUpdateSchema = z.object({
  projectId: z.string().min(1),
  summary: z.string().trim().min(20).max(4000),
  baseline: z.string().trim().max(4000),
  successIndicators: z.string().trim().max(4000),
  resourcesNeeded: z.string().trim().max(4000),
  risks: z.string().trim().max(4000),
  dependencies: z.string().trim().max(4000),
  resultsSummary: z.string().trim().max(4000),
  lessonsLearned: z.string().trim().max(4000),
});

export const stageSchema = z.object({
  projectId: z.string().min(1),
  stage: z.enum([
    "PROBLEM_DEFINED",
    "PROPOSAL_DEVELOPED",
    "AUTHORIZATION_SOUGHT",
    "TEST_APPROVED",
    "TESTING",
    "EVIDENCE_REVIEWED",
    "DECISION_RECORDED",
  ]),
  finalDecision: z.enum(["UNDECIDED", "CONTINUE", "REVISE", "STOP"]).optional(),
  decisionJustification: z.string().trim().max(4000).optional(),
});

export const actionSchema = z.object({
  title: z.string().trim().min(3).max(180),
  description: z.string().trim().max(2000),
  ownerId: z.string().min(1),
  dueOn: z.string().optional(),
  projectId: z.string().optional(),
  themeId: z.string().optional(),
  eventId: z.string().optional(),
});

export const actionStatusSchema = z.object({
  actionId: z.string().min(1),
  status: z.enum(["OPEN", "IN_PROGRESS", "DONE", "CANCELLED"]),
});

export const approvalSchema = z.object({
  projectId: z.string().min(1),
  institutionId: z.string().min(1),
  sponsorName: z.string().trim().min(2).max(160),
  state: z.enum(["NOT_REQUESTED", "REQUESTED", "APPROVED", "REJECTED", "CONDITIONAL"]),
  decisionNote: z.string().trim().max(2000),
});

export const commitmentSchema = z.object({
  projectId: z.string().min(1),
  statement: z.string().trim().min(10).max(2000),
});

export const helpSchema = z.object({
  kind: z.enum(["HELP_NEEDED", "EXPERTISE_OFFERED", "PEER_INSTITUTION", "EXPERT_REVIEW", "EXAMPLES"]),
  title: z.string().trim().min(8).max(180),
  description: z.string().trim().min(20).max(4000),
  themeId: z.string().optional(),
  skillsRequired: z.string().trim().max(500),
  visibility: z.enum(["PRIVATE", "TEAM", "PROGRAMME", "RESTRICTED"]),
  priority: z.enum(["LOW", "NORMAL", "HIGH"]),
  responseBy: z.string().optional(),
});

export const helpResponseSchema = z.object({
  requestId: z.string().min(1),
  body: z.string().trim().min(5).max(4000),
  status: z.enum(["OPEN", "MATCHED", "IN_DISCUSSION", "RESOLVED", "CLOSED"]).optional(),
});

export const resourceSchema = z.object({
  title: z.string().trim().min(5).max(180),
  description: z.string().trim().min(10).max(4000),
  type: z.enum(["CASE_STUDY", "TEMPLATE", "POLICY", "RESEARCH", "GUIDE", "WORKSHOP", "LESSON", "PRESENTATION"]),
  themeId: z.string().optional(),
  language: z.enum(["en", "fr", "ar"]),
  source: z.string().trim().max(300),
  attribution: z.string().trim().max(300),
  publishedOn: z.string().optional(),
  authorName: z.string().trim().max(180),
  tags: z.string().trim().max(300),
  visibility: z.enum(["PRIVATE", "TEAM", "PROGRAMME", "RESTRICTED"]),
  verification: z.enum(["DRAFT", "COMMUNITY", "VERIFIED"]),
  featured: z.boolean().optional(),
  externalUrl: z.string().trim().url().max(500).optional().or(z.literal("")),
});

export const eventSchema = z.object({
  title: z.string().trim().min(5).max(180),
  description: z.string().trim().min(10).max(4000),
  kind: z.enum(["ONBOARDING", "SUMMIT", "WORKSHOP", "REVIEW", "CLINIC", "DEMONSTRATION", "OTHER"]),
  startsAt: z.string().min(1),
  endsAt: z.string().min(1),
  timeZone: z.string().trim().min(1).max(80),
  themeId: z.string().optional(),
  projectId: z.string().optional(),
  meetingUrl: z.string().trim().url().max(500).optional().or(z.literal("")),
  preparation: z.string().trim().max(2000),
  hostId: z.string().optional(),
});

export const commentSchema = z.object({
  body: z.string().trim().min(2).max(4000),
  themeId: z.string().optional(),
  projectId: z.string().optional(),
  challengeId: z.string().optional(),
});

export const canvasSaveSchema = z.object({
  canvasId: z.string().min(1),
  updatedAt: z.string().min(1),
  content: z.record(z.string(), z.string().max(8000)),
  note: z.string().max(300).optional(),
});

export const inviteSchema = z.object({
  fullName: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(200),
  roles: z.array(z.enum([
    "PLATFORM_ADMIN",
    "INSTITUTIONAL_SPONSOR",
    "PROGRAMME_MANAGER",
    "THEMATIC_FACILITATOR",
    "PARTICIPANT",
    "EXPERT",
  ])).min(1),
  themeId: z.string().optional(),
  institutionId: z.string().optional(),
});

export const announcementSchema = z.object({
  title: z.string().trim().min(5).max(160),
  body: z.string().trim().min(10).max(4000),
});

export const outcomeSchema = z.object({
  projectId: z.string().min(1),
  indicator: z.string().trim().min(3).max(180),
  definition: z.string().trim().min(3).max(1000),
  valueText: z.string().trim().min(1).max(1000),
  evidenceLevel: z.enum(["SELF_REPORTED", "VERIFIED", "INSUFFICIENT"]),
  notes: z.string().trim().max(2000),
});

export const grantSchema = z.object({
  projectId: z.string().min(1),
  userId: z.string().min(1),
  permission: z.enum(["VIEW", "EDIT"]),
  note: z.string().trim().max(500),
});

export const targetsSchema = z.object({
  substantiveContributorsBeforeEvent: z.coerce.number().int().min(0).max(500),
  cohortSize: z.coerce.number().int().min(1).max(500),
  reviewedCanvases: z.coerce.number().int().min(0).max(100),
  helpResponseWorkingDays: z.coerce.number().int().min(1).max(60),
  sponsorsByDay30: z.coerce.number().int().min(0).max(100),
  contributorsDays61to90: z.coerce.number().int().min(0).max(500),
  authorizedTestsWithin90Days: z.coerce.number().int().min(0).max(100),
  phase: z.enum(["PRE_SUMMIT", "SUMMIT", "DAY_30", "DAY_60", "DAY_90", "MONTH_SIX", "SUSTAIN"]),
  phaseLabel: z.string().trim().min(3).max(120),
});

export const canvasFieldSchema = z.object({
  key: z.string().min(1),
  label: z.string().trim().min(3).max(160),
  helpText: z.string().trim().max(500),
  required: z.boolean(),
  active: z.boolean(),
});
