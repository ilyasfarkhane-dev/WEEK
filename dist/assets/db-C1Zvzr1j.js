import{u as e}from"./session-BKzt_Kfz.js";var t=`generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

enum UserStatus {
  INVITED
  ACTIVE
  SUSPENDED
  ARCHIVED
}

enum AppRole {
  PLATFORM_ADMIN
  INSTITUTIONAL_SPONSOR
  PROGRAMME_MANAGER
  THEMATIC_FACILITATOR
  PARTICIPANT
  EXPERT
}

enum MembershipRole {
  FACILITATOR
  MEMBER
  CONTRIBUTOR
  OBSERVER
}

enum Visibility {
  PRIVATE
  TEAM
  PROGRAMME
  RESTRICTED
}

enum Confidentiality {
  INTERNAL
  CONFIDENTIAL
  RESTRICTED
}

enum ChallengeStatus {
  SUBMITTED
  UNDER_REVIEW
  SELECTED
  MERGED
  REFERRED
  RETAINED
  CLOSED
}

enum ProjectStage {
  PROBLEM_DEFINED
  PROPOSAL_DEVELOPED
  AUTHORIZATION_SOUGHT
  TEST_APPROVED
  TESTING
  EVIDENCE_REVIEWED
  DECISION_RECORDED
}

enum ProjectStatus {
  ACTIVE
  PAUSED
  ARCHIVED
  CLOSED
}

enum FinalDecision {
  UNDECIDED
  CONTINUE
  REVISE
  STOP
}

enum ApprovalState {
  NOT_REQUESTED
  REQUESTED
  APPROVED
  REJECTED
  CONDITIONAL
}

enum HelpRequestKind {
  HELP_NEEDED
  EXPERTISE_OFFERED
  PEER_INSTITUTION
  EXPERT_REVIEW
  EXAMPLES
}

enum HelpStatus {
  OPEN
  MATCHED
  IN_DISCUSSION
  RESOLVED
  CLOSED
}

enum Priority {
  LOW
  NORMAL
  HIGH
}

enum ResourceType {
  CASE_STUDY
  TEMPLATE
  POLICY
  RESEARCH
  GUIDE
  WORKSHOP
  LESSON
  PRESENTATION
}

enum ResourceVerification {
  DRAFT
  COMMUNITY
  VERIFIED
}

enum EventKind {
  ONBOARDING
  SUMMIT
  WORKSHOP
  REVIEW
  CLINIC
  DEMONSTRATION
  OTHER
}

enum AttendanceStatus {
  REGISTERED
  ATTENDED
  ABSENT
  CANCELLED
}

enum ActionStatus {
  OPEN
  IN_PROGRESS
  DONE
  CANCELLED
}

enum NotificationType {
  INVITATION
  WORKSPACE_ASSIGNMENT
  COMMENT
  MENTION
  HELP_RESPONSE
  ACTION_ASSIGNMENT
  DEADLINE
  PROJECT_STAGE
  EVENT_REMINDER
  REVIEW_REQUEST
  SYSTEM
}

enum ProfileVisibility {
  PROGRAMME
  TEAM
  PRIVATE
}

enum EvidenceLevel {
  SELF_REPORTED
  VERIFIED
  INSUFFICIENT
}

enum LocaleCode {
  en
  fr
  ar
}

enum DigestFrequency {
  OFF
  IMMEDIATE
  DAILY
  WEEKLY
}

model Country {
  code         String        @id
  name         String
  institutions Institution[]
  profiles     Profile[]
  challenges   Challenge[]
  projects     Project[]
}

model Institution {
  id          String                  @id @default(cuid())
  name        String
  countryCode String
  country     Country                 @relation(fields: [countryCode], references: [code])
  kind        String
  isDemo      Boolean                 @default(false)
  createdAt   DateTime                @default(now())
  updatedAt   DateTime                @updatedAt
  archivedAt  DateTime?
  users       User[]
  challenges  Challenge[]
  projects    Project[]
  approvals   InstitutionalApproval[]
  invitations Invitation[]

  @@index([countryCode])
  @@index([name])
}

model User {
  id                    String    @id @default(cuid())
  email                 String    @unique
  name                  String
  passwordHash          String?
  status                UserStatus @default(INVITED)
  emailVerified         DateTime?
  isDemo                Boolean   @default(false)
  onboardingCompletedAt DateTime?
  rulesAcceptedAt       DateTime?
  rulesVersion          String?
  lastActiveAt          DateTime?
  institutionId         String?
  institution           Institution? @relation(fields: [institutionId], references: [id])
  createdAt             DateTime  @default(now())
  updatedAt             DateTime  @updatedAt
  deletedAt             DateTime?

  profile                 Profile?
  roles                   UserRole[]
  memberships             WorkspaceMembership[]
  expertise               UserExpertise[]
  facilitatedThemes       Theme[]                  @relation("ThemeFacilitator")
  invitationsSent         Invitation[]             @relation("InvitedBy")
  passwordResets          PasswordResetToken[]
  loginAttempts           LoginAttempt[]
  challengesOwned         Challenge[]              @relation("ChallengeOwner")
  challengesCreated       Challenge[]              @relation("ChallengeCreator")
  challengeReviews        ChallengeReview[]
  projectsLed             Project[]                @relation("ProjectLead")
  projectMembers          ProjectMember[]
  commitments             ParticipantCommitment[]
  approvalsRequested      InstitutionalApproval[]  @relation("ApprovalRequester")
  canvasUpdates           SolutionCanvas[]         @relation("CanvasUpdater")
  canvasVersions          CanvasVersion[]
  canvasComments          CanvasComment[]
  comments                Comment[]
  helpRequests            HelpRequest[]            @relation("HelpRequester")
  helpAssigned            HelpRequest[]            @relation("HelpAssignee")
  helpResponses           HelpResponse[]
  resources               Resource[]
  eventsHosted            Event[]                  @relation("EventHost")
  registrations           EventRegistration[]
  actionsOwned            ActionItem[]             @relation("ActionOwner")
  actionsCreated          ActionItem[]             @relation("ActionCreator")
  outcomes                OutcomeMeasurement[]
  notifications           Notification[]
  notificationPreference  NotificationPreference?
  auditEvents             AuditEvent[]
  projectGrants           ProjectGrant[]           @relation("GrantHolder")
  grantsGiven             ProjectGrant[]           @relation("GrantGiver")
  challengeGrants         ChallengeGrant[]
  announcements           Announcement[]
  activities              ActivityEvent[]
  themeNotes              ThemeNote[]

  @@index([institutionId])
  @@index([status])
  @@index([lastActiveAt])
}

model Profile {
  id                 String            @id @default(cuid())
  userId             String            @unique
  user               User              @relation(fields: [userId], references: [id], onDelete: Cascade)
  fullName           String
  title              String            @default("")
  biography          String            @default("")
  countryCode        String?
  country            Country?          @relation(fields: [countryCode], references: [code])
  themesOfInterest   String[]
  expertiseOffered   String            @default("")
  supportRequested   String            @default("")
  preferredLanguage  LocaleCode        @default(en)
  profileVisibility  ProfileVisibility @default(PROGRAMME)
  createdAt          DateTime          @default(now())
  updatedAt          DateTime          @updatedAt
}

model ExpertiseTag {
  id    String          @id @default(cuid())
  slug  String          @unique
  label String
  users UserExpertise[]
}

model UserExpertise {
  userId String
  tagId  String
  user   User         @relation(fields: [userId], references: [id], onDelete: Cascade)
  tag    ExpertiseTag @relation(fields: [tagId], references: [id], onDelete: Cascade)

  @@id([userId, tagId])
  @@index([tagId])
}

model UserRole {
  id        String   @id @default(cuid())
  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  role      AppRole
  createdAt DateTime @default(now())

  @@unique([userId, role])
  @@index([role])
}

model Theme {
  id            String    @id @default(cuid())
  slug          String    @unique
  name          String
  summary       String
  objectives    String
  sortOrder     Int
  facilitatorId String?
  facilitator   User?     @relation("ThemeFacilitator", fields: [facilitatorId], references: [id])
  archivedAt    DateTime?
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt

  memberships  WorkspaceMembership[]
  challenges   Challenge[]
  projects     Project[]
  resources    Resource[]
  events       Event[]
  helpRequests HelpRequest[]
  actions      ActionItem[]
  comments     Comment[]
  invitations  Invitation[]
  notes        ThemeNote[]
  activities   ActivityEvent[]
}

model WorkspaceMembership {
  id        String         @id @default(cuid())
  themeId   String
  theme     Theme          @relation(fields: [themeId], references: [id], onDelete: Cascade)
  userId    String
  user      User           @relation(fields: [userId], references: [id], onDelete: Cascade)
  role      MembershipRole @default(MEMBER)
  isPrimary Boolean        @default(false)
  createdAt DateTime       @default(now())

  @@unique([themeId, userId])
  @@index([userId, isPrimary])
}

model Invitation {
  id            String    @id @default(cuid())
  email         String
  fullName      String
  tokenHash     String    @unique
  roles         AppRole[]
  themeId       String?
  theme         Theme?    @relation(fields: [themeId], references: [id])
  institutionId String?
  institution   Institution? @relation(fields: [institutionId], references: [id])
  invitedById   String
  invitedBy     User      @relation("InvitedBy", fields: [invitedById], references: [id])
  expiresAt     DateTime
  acceptedAt    DateTime?
  revokedAt     DateTime?
  createdAt     DateTime  @default(now())

  @@index([email])
}

model PasswordResetToken {
  id        String    @id @default(cuid())
  userId    String
  user      User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  tokenHash String    @unique
  expiresAt DateTime
  usedAt    DateTime?
  createdAt DateTime  @default(now())

  @@index([userId])
}

model LoginAttempt {
  id        String   @id @default(cuid())
  email     String
  userId    String?
  user      User?    @relation(fields: [userId], references: [id])
  success   Boolean
  createdAt DateTime @default(now())

  @@index([email, createdAt])
}

model Challenge {
  id                String           @id @default(cuid())
  code              String           @unique
  title             String
  problemStatement  String
  institutionId     String
  institution       Institution      @relation(fields: [institutionId], references: [id])
  countryCode       String
  country           Country          @relation(fields: [countryCode], references: [code])
  context           String
  affectedUsers     String
  evidence          String
  previousAttempts  String
  expectedBenefit   String
  themeId           String
  theme             Theme            @relation(fields: [themeId], references: [id])
  expertiseRequired String
  ownerId           String
  owner             User             @relation("ChallengeOwner", fields: [ownerId], references: [id])
  createdById       String
  createdBy         User             @relation("ChallengeCreator", fields: [createdById], references: [id])
  visibility        Visibility       @default(PROGRAMME)
  confidentiality   Confidentiality  @default(INTERNAL)
  status            ChallengeStatus  @default(SUBMITTED)
  mergedIntoId      String?
  mergedInto        Challenge?       @relation("ChallengeMerge", fields: [mergedIntoId], references: [id])
  mergedFrom        Challenge[]      @relation("ChallengeMerge")
  isDemo            Boolean          @default(false)
  createdAt         DateTime         @default(now())
  updatedAt         DateTime         @updatedAt
  archivedAt        DateTime?

  reviews  ChallengeReview[]
  projects Project[]
  grants   ChallengeGrant[]
  comments Comment[]

  @@index([status])
  @@index([themeId])
  @@index([countryCode])
  @@index([institutionId])
  @@index([ownerId])
}

model ChallengeReview {
  id           String          @id @default(cuid())
  challengeId  String
  challenge    Challenge       @relation(fields: [challengeId], references: [id], onDelete: Cascade)
  reviewerId   String
  reviewer     User            @relation(fields: [reviewerId], references: [id])
  fromStatus   ChallengeStatus
  toStatus     ChallengeStatus
  decisionNote String
  createdAt    DateTime        @default(now())

  @@index([challengeId])
}

model ChallengeGrant {
  challengeId String
  userId      String
  permission  String
  challenge   Challenge @relation(fields: [challengeId], references: [id], onDelete: Cascade)
  user        User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  createdAt   DateTime  @default(now())

  @@id([challengeId, userId])
}

model Project {
  id                    String          @id @default(cuid())
  code                  String          @unique
  title                 String
  summary               String
  institutionId         String
  institution           Institution     @relation(fields: [institutionId], references: [id])
  countryCode           String
  country               Country         @relation(fields: [countryCode], references: [code])
  themeId               String
  theme                 Theme           @relation(fields: [themeId], references: [id])
  leadId                String
  lead                  User            @relation("ProjectLead", fields: [leadId], references: [id])
  challengeId           String?
  challenge             Challenge?      @relation(fields: [challengeId], references: [id])
  stage                 ProjectStage    @default(PROBLEM_DEFINED)
  status                ProjectStatus   @default(ACTIVE)
  finalDecision         FinalDecision   @default(UNDECIDED)
  decisionJustification String          @default("")
  lessonsLearned        String          @default("")
  resultsSummary        String          @default("")
  baseline              String          @default("")
  successIndicators     String          @default("")
  resourcesNeeded       String          @default("")
  risks                 String          @default("")
  dependencies          String          @default("")
  visibility            Visibility      @default(TEAM)
  confidentiality       Confidentiality @default(CONFIDENTIAL)
  isDemo                Boolean         @default(false)
  createdAt             DateTime        @default(now())
  updatedAt             DateTime        @updatedAt
  pausedAt              DateTime?
  closedAt              DateTime?
  archivedAt            DateTime?

  members      ProjectMember[]
  canvas       SolutionCanvas?
  milestones   Milestone[]
  actions      ActionItem[]
  approvals    InstitutionalApproval[]
  commitments  ParticipantCommitment[]
  outcomes     OutcomeMeasurement[]
  comments     Comment[]
  grants       ProjectGrant[]
  activities   ActivityEvent[]
  events       Event[]
  resourceLinks ResourceProject[]

  @@index([stage])
  @@index([status])
  @@index([themeId])
  @@index([countryCode])
  @@index([institutionId])
  @@index([leadId])
}

model ProjectMember {
  id        String   @id @default(cuid())
  projectId String
  project   Project  @relation(fields: [projectId], references: [id], onDelete: Cascade)
  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  role      String
  createdAt DateTime @default(now())

  @@unique([projectId, userId])
  @@index([userId])
}

model ProjectGrant {
  projectId   String
  userId      String
  permission  String
  note        String   @default("")
  grantedById String?
  project     Project  @relation(fields: [projectId], references: [id], onDelete: Cascade)
  user        User     @relation("GrantHolder", fields: [userId], references: [id], onDelete: Cascade)
  grantedBy   User?    @relation("GrantGiver", fields: [grantedById], references: [id])
  createdAt   DateTime @default(now())

  @@id([projectId, userId])
  @@index([userId])
}

model SolutionCanvas {
  id               String   @id @default(cuid())
  projectId        String   @unique
  project          Project  @relation(fields: [projectId], references: [id], onDelete: Cascade)
  workingJson      Json
  workingUpdatedAt DateTime @default(now())
  updatedById      String?
  updatedBy        User?    @relation("CanvasUpdater", fields: [updatedById], references: [id])
  createdAt        DateTime @default(now())
  updatedAt        DateTime @updatedAt

  versions     CanvasVersion[]
  comments     CanvasComment[]
}

model CanvasVersion {
  id            String   @id @default(cuid())
  canvasId      String
  canvas        SolutionCanvas @relation(fields: [canvasId], references: [id], onDelete: Cascade)
  versionNumber Int
  content       Json
  fieldSnapshot Json
  contentHash   String
  authorId      String
  author        User     @relation(fields: [authorId], references: [id])
  note          String   @default("")
  createdAt     DateTime @default(now())

  @@unique([canvasId, versionNumber])
  @@index([canvasId, createdAt])
}

model CanvasComment {
  id         String         @id @default(cuid())
  canvasId   String
  canvas     SolutionCanvas @relation(fields: [canvasId], references: [id], onDelete: Cascade)
  sectionKey String
  authorId   String
  author     User           @relation(fields: [authorId], references: [id])
  body       String
  createdAt  DateTime       @default(now())
  updatedAt  DateTime       @updatedAt

  @@index([canvasId, sectionKey])
}

model CanvasFieldDefinition {
  id        String   @id @default(cuid())
  key       String   @unique
  label     String
  helpText  String
  sortOrder Int
  required  Boolean  @default(false)
  active    Boolean  @default(true)
  updatedAt DateTime @updatedAt
}

model Comment {
  id          String    @id @default(cuid())
  body        String
  authorId    String
  author      User      @relation(fields: [authorId], references: [id])
  projectId   String?
  project     Project?  @relation(fields: [projectId], references: [id], onDelete: Cascade)
  challengeId String?
  challenge   Challenge? @relation(fields: [challengeId], references: [id], onDelete: Cascade)
  themeId     String?
  theme       Theme?    @relation(fields: [themeId], references: [id], onDelete: Cascade)
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt
  deletedAt   DateTime?

  @@index([themeId, createdAt])
  @@index([projectId, createdAt])
  @@index([challengeId, createdAt])
}

model HelpRequest {
  id              String          @id @default(cuid())
  code            String          @unique
  kind            HelpRequestKind
  title           String
  description     String
  requesterId     String
  requester       User            @relation("HelpRequester", fields: [requesterId], references: [id])
  institutionId   String?
  themeId         String?
  theme           Theme?          @relation(fields: [themeId], references: [id])
  skillsRequired  String
  visibility      Visibility      @default(PROGRAMME)
  priority        Priority        @default(NORMAL)
  responseBy      DateTime?
  status          HelpStatus      @default(OPEN)
  assigneeId      String?
  assignee        User?           @relation("HelpAssignee", fields: [assigneeId], references: [id])
  outcome         String          @default("")
  isDemo          Boolean         @default(false)
  createdAt       DateTime        @default(now())
  updatedAt       DateTime        @updatedAt
  closedAt        DateTime?

  responses HelpResponse[]

  @@index([status])
  @@index([themeId])
  @@index([requesterId])
}

model HelpResponse {
  id        String      @id @default(cuid())
  requestId String
  request   HelpRequest @relation(fields: [requestId], references: [id], onDelete: Cascade)
  authorId  String
  author    User        @relation(fields: [authorId], references: [id])
  body      String
  createdAt DateTime    @default(now())

  @@index([requestId])
}

model Resource {
  id            String               @id @default(cuid())
  title         String
  description   String
  type          ResourceType
  themeId       String?
  theme         Theme?               @relation(fields: [themeId], references: [id])
  language      LocaleCode           @default(en)
  source        String               @default("")
  attribution   String               @default("")
  publishedOn   DateTime?
  authorName    String               @default("")
  tags          String[]
  visibility    Visibility           @default(PROGRAMME)
  verification  ResourceVerification @default(DRAFT)
  featured      Boolean              @default(false)
  externalUrl   String?
  fileName      String?
  fileKey       String?
  mimeType      String?
  fileSize      Int?
  createdById   String
  createdBy     User                 @relation(fields: [createdById], references: [id])
  isDemo        Boolean              @default(false)
  createdAt     DateTime             @default(now())
  updatedAt     DateTime             @updatedAt
  archivedAt    DateTime?

  projects ResourceProject[]

  @@index([type])
  @@index([themeId])
  @@index([verification])
  @@index([featured])
}

model ResourceProject {
  resourceId String
  projectId  String
  resource   Resource @relation(fields: [resourceId], references: [id], onDelete: Cascade)
  project    Project  @relation(fields: [projectId], references: [id], onDelete: Cascade)

  @@id([resourceId, projectId])
}

model Event {
  id           String     @id @default(cuid())
  title        String
  description  String
  kind         EventKind
  hostId       String?
  host         User?      @relation("EventHost", fields: [hostId], references: [id])
  startsAt     DateTime
  endsAt       DateTime
  timeZone     String     @default("UTC")
  themeId      String?
  theme        Theme?     @relation(fields: [themeId], references: [id])
  projectId    String?
  project      Project?   @relation(fields: [projectId], references: [id])
  meetingUrl   String?
  preparation  String     @default("")
  notes        String     @default("")
  followUp     String     @default("")
  visibility   Visibility @default(PROGRAMME)
  isDemo       Boolean    @default(false)
  createdAt    DateTime   @default(now())
  updatedAt    DateTime   @updatedAt

  registrations EventRegistration[]
  actions       ActionItem[]

  @@index([startsAt])
  @@index([themeId])
}

model EventRegistration {
  id        String           @id @default(cuid())
  eventId   String
  event     Event            @relation(fields: [eventId], references: [id], onDelete: Cascade)
  userId    String
  user      User             @relation(fields: [userId], references: [id], onDelete: Cascade)
  status    AttendanceStatus @default(REGISTERED)
  createdAt DateTime         @default(now())
  updatedAt DateTime         @updatedAt

  @@unique([eventId, userId])
  @@index([userId])
}

model Milestone {
  id          String    @id @default(cuid())
  projectId   String
  project     Project   @relation(fields: [projectId], references: [id], onDelete: Cascade)
  title       String
  dueOn       DateTime?
  completedAt DateTime?
  notes       String    @default("")
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt

  @@index([projectId])
  @@index([dueOn])
}

model ActionItem {
  id          String       @id @default(cuid())
  title       String
  description String       @default("")
  status      ActionStatus @default(OPEN)
  dueOn       DateTime?
  ownerId     String?
  owner       User?        @relation("ActionOwner", fields: [ownerId], references: [id])
  createdById String
  createdBy   User         @relation("ActionCreator", fields: [createdById], references: [id])
  projectId   String?
  project     Project?     @relation(fields: [projectId], references: [id], onDelete: Cascade)
  themeId     String?
  theme       Theme?       @relation(fields: [themeId], references: [id])
  eventId     String?
  event       Event?       @relation(fields: [eventId], references: [id])
  createdAt   DateTime     @default(now())
  updatedAt   DateTime     @updatedAt
  completedAt DateTime?

  @@index([ownerId, status])
  @@index([projectId])
  @@index([dueOn])
  @@index([themeId])
}

model InstitutionalApproval {
  id             String        @id @default(cuid())
  projectId      String
  project        Project       @relation(fields: [projectId], references: [id], onDelete: Cascade)
  institutionId  String
  institution    Institution   @relation(fields: [institutionId], references: [id])
  sponsorName    String
  state          ApprovalState @default(NOT_REQUESTED)
  isFormal       Boolean       @default(true)
  requestedById  String?
  requestedBy    User?         @relation("ApprovalRequester", fields: [requestedById], references: [id])
  decidedByName  String        @default("")
  decisionNote   String        @default("")
  requestedAt    DateTime?
  decidedAt      DateTime?
  createdAt      DateTime      @default(now())
  updatedAt      DateTime      @updatedAt

  @@index([projectId])
  @@index([state])
}

model ParticipantCommitment {
  id        String   @id @default(cuid())
  projectId String
  project   Project  @relation(fields: [projectId], references: [id], onDelete: Cascade)
  userId    String
  user      User     @relation(fields: [userId], references: [id])
  statement String
  createdAt DateTime @default(now())

  @@index([projectId])
}

model OutcomeMeasurement {
  id            String        @id @default(cuid())
  projectId     String
  project       Project       @relation(fields: [projectId], references: [id], onDelete: Cascade)
  indicator     String
  definition    String
  valueText     String
  evidenceLevel EvidenceLevel @default(SELF_REPORTED)
  recordedById  String
  recordedBy    User          @relation(fields: [recordedById], references: [id])
  notes         String        @default("")
  recordedAt    DateTime      @default(now())

  @@index([projectId])
  @@index([evidenceLevel])
}

model Notification {
  id        String           @id @default(cuid())
  userId    String
  user      User             @relation(fields: [userId], references: [id], onDelete: Cascade)
  type      NotificationType
  title     String
  body      String
  href      String?
  dedupeKey String?
  readAt    DateTime?
  createdAt DateTime         @default(now())

  @@index([userId, readAt, createdAt])
  @@index([dedupeKey])
}

model NotificationPreference {
  userId          String          @id
  user            User            @relation(fields: [userId], references: [id], onDelete: Cascade)
  inAppEnabled    Boolean         @default(true)
  emailEnabled    Boolean         @default(false)
  digestFrequency DigestFrequency @default(DAILY)
  mutedTypes      NotificationType[]
  updatedAt       DateTime        @updatedAt
}

model EmailOutbox {
  id        String    @id @default(cuid())
  toAddress String
  subject   String
  body      String
  status    String
  provider  String
  detail    String
  createdAt DateTime  @default(now())
  sentAt    DateTime?

  @@index([status, createdAt])
}

model AuditEvent {
  id         String   @id @default(cuid())
  actorId    String?
  actor      User?    @relation(fields: [actorId], references: [id])
  action     String
  entityType String
  entityId   String?
  metadata   Json?
  createdAt  DateTime @default(now())

  @@index([entityType, entityId])
  @@index([createdAt])
  @@index([actorId])
}

model ThemeNote {
  id        String   @id @default(cuid())
  themeId   String
  theme     Theme    @relation(fields: [themeId], references: [id], onDelete: Cascade)
  authorId  String
  author    User     @relation(fields: [authorId], references: [id])
  kind      String
  title     String
  body      String
  createdAt DateTime @default(now())

  @@index([themeId, createdAt])
}

model ActivityEvent {
  id        String   @id @default(cuid())
  projectId String?
  project   Project? @relation(fields: [projectId], references: [id], onDelete: Cascade)
  themeId   String?
  theme     Theme?   @relation(fields: [themeId], references: [id], onDelete: Cascade)
  actorId   String?
  actor     User?    @relation(fields: [actorId], references: [id])
  summary   String
  createdAt DateTime @default(now())

  @@index([projectId, createdAt])
  @@index([themeId, createdAt])
}

model Announcement {
  id        String    @id @default(cuid())
  title     String
  body      String
  authorId  String
  author    User      @relation(fields: [authorId], references: [id])
  createdAt DateTime  @default(now())
  expiresAt DateTime?

  @@index([createdAt])
}

model ProgrammeSettings {
  id              String    @id @default("default")
  name            String    @default("Governance Innovation Community")
  phase           String    @default("PRE_SUMMIT")
  phaseLabel      String
  rulesVersion    String
  rulesText       String
  targets         Json
  demonstration   Boolean   @default(true)
  summitStartsOn  DateTime?
  updatedAt       DateTime  @updatedAt
}

model RateLimitBucket {
  id          String   @id
  count       Int
  windowStart DateTime
}

model CodeSequence {
  prefix String @id
  value  Int
}
`,n=`gic.store`,r=new Map;function i(e){return e.replace(/\\/g,`/`).endsWith(`store.json`)}function a(e){return e.replace(/\\/g,`/`).endsWith(`schema.prisma`)}function o(e){return a(e)?!0:i(e)?!!window.localStorage.getItem(n):r.has(e)}function s(e){if(a(e))return t;if(i(e)){let e=window.localStorage.getItem(n);if(e!==null)return e}let o=r.get(e);if(o!==void 0)return o;throw Error(`Missing file ${e}`)}function c(e,t){i(e)?window.localStorage.setItem(n,t):r.set(e,t)}function l(e,t){c(t,s(e))}function u(...e){return e.filter(e=>!!e).join(`/`).replace(/\/+/g,`/`)}function d(e){let t=e.split(`/`);return t.pop(),t.join(`/`)||`.`}function f(...e){return u(...e)}var p={dirname:d,join:u,resolve:f};function m(){if(typeof window<`u`)return`data/store.json`;if({}.DATA_FILE)return{}.DATA_FILE;let e=p.join(process.cwd(),`data`,`store.json`);if(!{}.AWS_EXECUTION_ENV)return e;let t=`/tmp/gic-store.json`;return!o(t)&&o(e)&&l(e,t),o(t)?t:e}function h(e){return e.charAt(0).toLowerCase()+e.slice(1)}function g(){return`c${Date.now().toString(36)}${e(8).toString(`hex`)}`}function _(e,t){let n=e.indexOf(t);if(n<0)return;let r=0,i=n+t.length;for(let t=i;t<e.length;t+=1){let n=e[t];if(n===`(`)r+=1;else if(n===`)`){if(r===0)return e.slice(i,t);--r}}}function v(e){if(!e)return{hasDefault:!1,defaultNow:!1,defaultCuid:!1,defaultValue:void 0};let t=e.trim();return t===`now()`?{hasDefault:!0,defaultNow:!0,defaultCuid:!1,defaultValue:void 0}:t===`cuid()`?{hasDefault:!0,defaultNow:!1,defaultCuid:!0,defaultValue:void 0}:t===`true`?{hasDefault:!0,defaultNow:!1,defaultCuid:!1,defaultValue:!0}:t===`false`?{hasDefault:!0,defaultNow:!1,defaultCuid:!1,defaultValue:!1}:/^-?\d+(\.\d+)?$/.test(t)?{hasDefault:!0,defaultNow:!1,defaultCuid:!1,defaultValue:Number(t)}:t.startsWith(`"`)&&t.endsWith(`"`)?{hasDefault:!0,defaultNow:!1,defaultCuid:!1,defaultValue:t.slice(1,-1)}:{hasDefault:!0,defaultNow:!1,defaultCuid:!1,defaultValue:t}}function y(e){let t=new Map,n=e.split(/\nmodel /).slice(1);for(let r of n){let n=r.slice(0,r.indexOf(` `)),i=r.slice(r.indexOf(`{`)+1,r.indexOf(`
}`)),a={name:n,fields:new Map,scalars:[],relations:[],ids:[],uniques:[],rows:[]};for(let n of i.split(`
`)){let r=n.trim();if(!r||r.startsWith(`//`))continue;if(r.startsWith(`@@id`)){a.ids=[...r.matchAll(/(\w+)/g)].map(e=>e[1]).filter(e=>e!==`id`);continue}if(r.startsWith(`@@unique`)){a.uniques.push([...r.matchAll(/(\w+)/g)].map(e=>e[1]).filter(e=>e!==`unique`));continue}if(r.startsWith(`@@`))continue;let i=r.match(/^(\w+)\s+(\w+)(\[\])?(\?)?(.*)$/);if(!i)continue;let[,o,s,c,l,u]=i;if(t.has(s)||e.includes(`\nmodel ${s} `)||e.startsWith(`model ${s} `)){let e=u.match(/@relation\(\s*"([^"]+)"/),t=[...(u.match(/fields:\s*\[([^\]]+)\]/)?.[1]??``).matchAll(/(\w+)/g)].map(e=>e[1]),n=[...(u.match(/references:\s*\[([^\]]+)\]/)?.[1]??``).matchAll(/(\w+)/g)].map(e=>e[1]),r={kind:`relation`,name:o,type:s,optional:!!l,list:!!c,relationName:e?.[1],fields:t,references:n};a.fields.set(o,r),a.relations.push(r);continue}let d=v(_(u,`@default(`)),f={kind:`scalar`,name:o,type:s,optional:!!l,list:!!c,isId:u.includes(`@id`),unique:u.includes(`@unique`),updatedAt:u.includes(`@updatedAt`),...d};a.fields.set(o,f),a.scalars.push(f),f.isId&&(a.ids=[o])}t.set(n,a)}for(let e of t.values())for(let n of e.relations)if(!t.has(n.type)){e.fields.delete(n.name),e.relations=e.relations.filter(e=>e!==n);let t={kind:`scalar`,name:n.name,type:n.type,optional:n.optional,list:n.list,isId:!1,unique:!1,updatedAt:!1,hasDefault:!1,defaultNow:!1,defaultCuid:!1,defaultValue:void 0};e.fields.set(n.name,t),e.scalars.push(t)}return t}function b(e){return e instanceof Date?e.getTime():typeof e==`string`&&/^\d{4}-\d{2}-\d{2}T/.test(e)?new Date(e).getTime():null}function x(e,t){let n=b(e),r=b(t);return n!==null&&r!==null?n===r:e===t}function S(e,t){let n=b(e),r=b(t);return n!==null&&r!==null?n-r:e==null&&t==null?0:e==null?1:t==null||String(e)<String(t)?-1:+(String(e)>String(t))}var C=class{constructor(){let e=typeof window<`u`?`prisma/schema.prisma`:p.join(process.cwd(),`prisma`,`schema.prisma`);this.models=y(s(e,`utf8`));let t=m();if(o(t)){let e=JSON.parse(s(t,`utf8`));for(let[t,n]of Object.entries(e)){let e=this.models.get(t);e&&Array.isArray(n)&&(e.rows=n)}}}reset(){for(let e of this.models.values())e.rows=[];this.save()}save(){let e=m();p.dirname(e);let t={};for(let e of this.models.values())t[e.name]=e.rows;c(e,`${JSON.stringify(t,null,2)}\n`)}model(e){let t=this.models.get(e);if(!t)throw Error(`Unknown collection ${e}`);return t}};function w(e,t,n){let r=e.model(t.type).relations.filter(e=>e.type===n&&e.fields.length>0);if(t.relationName){let e=r.find(e=>e.relationName===t.relationName);if(e)return e}if(r.length===1)return r[0];let i=r.filter(e=>!e.relationName);if(i.length===1)return i[0];throw Error(`Cannot resolve relation ${n}.${t.name}`)}function T(e,t,n,r){let i=e.model(r.type);if(r.fields.length)return i.rows.filter(e=>r.references.every((t,i)=>x(e[t],n[r.fields[i]])));let a=w(e,r,t.name);return i.rows.filter(e=>a.fields.every((t,r)=>x(e[t],n[a.references[r]])))}function E(e,t){if(t===null)return e==null;if(t instanceof Date||typeof t!=`object`||Array.isArray(t))return x(e,t);let n=t;if(`equals`in n)return x(e,n.equals);if(`in`in n)return Array.isArray(n.in)&&n.in.some(t=>x(e,t));if(`notIn`in n)return Array.isArray(n.notIn)&&!n.notIn.some(t=>x(e,t));if(`not`in n)return!E(e,n.not);if(`contains`in n){let t=n.mode===`insensitive`,r=t?String(e??``).toLowerCase():String(e??``),i=t?String(n.contains).toLowerCase():String(n.contains);return r.includes(i)}if(`startsWith`in n)return String(e??``).startsWith(String(n.startsWith));if(`gt`in n||`gte`in n||`lt`in n||`lte`in n){let t=S(e,n.gt??n.gte??n.lt??n.lte);return`gt`in n?S(e,n.gt)>0:`gte`in n?S(e,n.gte)>=0:`lt`in n?S(e,n.lt)<0:`lte`in n?S(e,n.lte)<=0:t===0}return x(e,t)}function D(e,t,n,r){if(!r)return!0;for(let[i,a]of Object.entries(r)){if(a===void 0)continue;if(i===`AND`){if(!(Array.isArray(a)?a:[a]).every(r=>D(e,t,n,r)))return!1;continue}if(i===`OR`){if(!(Array.isArray(a)?a:[]).some(r=>D(e,t,n,r)))return!1;continue}if(i===`NOT`){if(D(e,t,n,a))return!1;continue}let r=t.fields.get(i);if(!r){if(a&&typeof a==`object`){let r={};for(let[e,t]of Object.entries(a))r[e]=t;if(!D(e,t,n,r))return!1;continue}return!1}if(r.kind===`relation`){let i=T(e,t,n,r),o=a;if(o&&typeof o==`object`&&`some`in o){if(!i.some(t=>D(e,e.model(r.type),t,o.some)))return!1}else if(o&&typeof o==`object`&&`every`in o){if(!i.every(t=>D(e,e.model(r.type),t,o.every)))return!1}else if(o&&typeof o==`object`&&`none`in o){if(i.some(t=>D(e,e.model(r.type),t,o.none)))return!1}else if(r.list)return!1;else{let t=o&&typeof o==`object`&&`is`in o?o.is:o,n=i[0];if(!n||!D(e,e.model(r.type),n,t))return!1}}else if(!E(n[i],a))return!1}return!0}function O(e,t){let n=Array.isArray(t)?t:t?[t]:[];return n.length?[...e].sort((e,t)=>{for(let r of n){let[n,i]=Object.entries(r)[0]??[];if(!n)continue;let a=S(e[n],t[n]);if(a!==0)return i===`desc`?-a:a}return 0}):e}function k(e,t){return e.type===`DateTime`&&typeof t==`string`?new Date(t):e.type===`Json`&&t&&typeof t==`object`?structuredClone(t):t}function A(e,t,n,r){if(r?.select)return j(e,t,n,r.select,!0);let i={};for(let e of t.scalars)i[e.name]=k(e,n[e.name]);if(r?.include){for(let[a,o]of Object.entries(r.include))if(o){if(a===`_count`&&o&&typeof o==`object`){let r=o.select,a={};for(let[i,o]of Object.entries(r??{})){if(!o)continue;let r=t.fields.get(i);r?.kind===`relation`&&(a[i]=T(e,t,n,r).length)}i._count=a}else i[a]=M(e,t,n,a,o)}}return i}function j(e,t,n,r,i){let a={};for(let[o,s]of Object.entries(r)){if(!s)continue;let r=t.fields.get(o);r&&(a[o]=r.kind===`scalar`?k(r,n[o]):M(e,t,n,o,s===!0?!i||{select:void 0}:s))}return a}function M(e,t,n,r,i){let a=t.fields.get(r);if(!a||a.kind!==`relation`)return null;let o=e.model(a.type),s=T(e,t,n,a),c=i&&typeof i==`object`?i:{};c.where&&(s=s.filter(t=>D(e,o,t,c.where))),s=O(s,c.orderBy),typeof c.skip==`number`&&(s=s.slice(c.skip)),typeof c.take==`number`&&(s=s.slice(0,c.take));let l={include:c.include,select:c.select},u=s.map(t=>A(e,o,t,l));return a.list?u:u[0]??null}function N(e,t){return t instanceof Date?t.toISOString():t}function P(e,t,n){let r=new Date().toISOString();for(let i of e.scalars)t[i.name]===void 0&&(i.defaultCuid||i.isId&&i.type===`String`&&!i.hasDefault?t[i.name]=g():i.defaultNow||n&&i.updatedAt?t[i.name]=r:i.hasDefault?t[i.name]=i.defaultValue:i.list?t[i.name]=[]:i.updatedAt&&(t[i.name]=r))}function F(e,t,n,r,i){if(r.fields.length)return;let a=w(e,r,t.name);for(let e=0;e<a.fields.length;e+=1)i[a.fields[e]]??(i[a.fields[e]]=n[a.references[e]])}function I(e,t){if(!t)return{};let n={};for(let[r,i]of Object.entries(t))!e.fields.has(r)&&i&&typeof i==`object`&&!Array.isArray(i)&&!(i instanceof Date)?Object.assign(n,i):n[r]=i;return n}function L(e,t){let n=n=>{let r={},i=[];for(let[e,a]of Object.entries(n)){if(a===void 0)continue;let n=t.fields.get(e);if(!n)throw Error(`${t.name}.${e} is not a field`);n.kind===`relation`?i.push([n,a]):r[e]=N(n,a)}P(t,r,!0),t.rows.push(r);for(let[n,a]of i){let i=a.create?Array.isArray(a.create)?a.create:[a.create]:[],o=a.createMany&&typeof a.createMany==`object`&&`data`in a.createMany?a.createMany.data:[];for(let a of[...i,...Array.isArray(o)?o:[]]){let i={...a};F(e,t,r,n,i),L(e,e.model(n.type)).create({data:i})}}return r};return{findMany:async(n={})=>{let r=t.rows.filter(r=>D(e,t,r,I(t,n.where)));return r=O(r,n.orderBy),n.skip&&(r=r.slice(n.skip)),n.take!==void 0&&(r=r.slice(0,n.take)),r.map(r=>A(e,t,r,n))},findFirst:async(n={})=>(await L(e,t).findMany({...n,take:1}))[0]??null,findUnique:async n=>{let r=t.rows.filter(r=>D(e,t,r,I(t,n.where)));if(r.length>1)throw Error(`${t.name} lookup matched ${r.length} records`);return r[0]?A(e,t,r[0],n):null},count:async(n={})=>t.rows.filter(r=>D(e,t,r,I(t,n.where))).length,create:async r=>{let i=n(r.data);return e.save(),A(e,t,i,r)},createMany:async t=>{for(let e of t.data)n(e);return e.save(),{count:t.data.length}},update:async n=>{let r=t.rows.find(r=>D(e,t,r,I(t,n.where)));if(!r)throw Error(`${t.name} record was not found`);for(let[e,i]of Object.entries(n.data)){let n=t.fields.get(e);if(n&&n.kind===`scalar`){if(i&&typeof i==`object`&&!Array.isArray(i)&&!(i instanceof Date)&&n.type!==`Json`){let t=i;r[e]=t.increment===void 0?t.decrement===void 0?`set`in t?N(n,t.set):N(n,i):Number(r[e]??0)-t.decrement:Number(r[e]??0)+t.increment}else r[e]=N(n,i)}}let i=t.scalars.find(e=>e.updatedAt);return i&&n.data[i.name]===void 0&&(r[i.name]=new Date().toISOString()),e.save(),A(e,t,r,n)},updateMany:async n=>{let r=t.rows.filter(r=>D(e,t,r,I(t,n.where)));for(let i of r)await L(e,t).update({where:R(t,i),data:n.data});return{count:r.length}},deleteMany:async(n={})=>{let r=t.rows.length;return t.rows=t.rows.filter(r=>!D(e,t,r,I(t,n.where))),e.save(),{count:r-t.rows.length}},upsert:async n=>t.rows.find(r=>D(e,t,r,I(t,n.where)))?L(e,t).update({where:n.where,data:n.update}):L(e,t).create({data:n.create}),groupBy:async n=>{let r=t.rows.filter(r=>D(e,t,r,I(t,n.where))),i=new Map;for(let e of r){let t={};for(let r of n.by)t[r]=e[r];let r=JSON.stringify(t),a=i.get(r)??{values:t,count:0};a.count+=1,i.set(r,a)}return[...i.values()].map(e=>({...e.values,_count:{_all:e.count}}))}}}function R(e,t){let n={},r=e.ids.length?e.ids:e.scalars.filter(e=>e.isId).map(e=>e.name);for(let e of r)n[e]=t[e];return n}function z(){let e=new C,t={$transaction:async e=>{let t=[];for(let n of e)t.push(await n);return t},$reset:async()=>e.reset(),$disconnect:async()=>void 0,$queryRaw:async()=>[],$executeRawUnsafe:async t=>(t.includes(`TRUNCATE`)&&e.reset(),0)};for(let n of e.models.values())t[h(n.name)]=L(e,n);return t}var B=globalThis.gicJson??z();export{p as n,B as t};