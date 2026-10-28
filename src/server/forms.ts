import { anonymizeUserForm, importInvitationsForm, publishAnnouncementAction, resetCanvasFieldsForm, saveCanvasFieldAction, saveInstitutionAction, saveProgrammeSettingsAction, saveThemeAction, setUserStatusForm } from "@/server/actions/admin";
import { addCommentAction, addActionItemAction, addCanvasCommentAction, changeStageAction, grantProjectAccessAction, recordApprovalAction, recordCommitmentAction, recordOutcomeAction, reviewChallengeAction, setProjectStatusAction, updateActionStatusAction, updateProjectAction } from "@/server/actions/collaboration";
import { cancelRegistrationAction, createEventAction, createResourceForm, curateResourceAction, markAttendanceAction, registerForEventAction, respondToHelpAction, saveEventNotesAction } from "@/server/actions/engagement";
import { addThemeNoteAction } from "@/server/actions/admin";
import { markNotificationsReadAction } from "@/server/actions/notifications";
import { deleteOwnAccountAction, updateNotificationPreferencesAction } from "@/server/actions/profile";
import { prisma } from "@/lib/db";
import { clearSession } from "@/server/session";
import { finish, redirect } from "@/server/result";

const TYPES = ["INVITATION", "WORKSPACE_ASSIGNMENT", "COMMENT", "MENTION", "HELP_RESPONSE", "ACTION_ASSIGNMENT", "DEADLINE", "PROJECT_STAGE", "EVENT_REMINDER", "REVIEW_REQUEST", "SYSTEM"] as const;

function text(formData: FormData, name: string) {
  return String(formData.get(name) ?? "");
}

export const forms: Record<string, (formData: FormData) => Promise<unknown>> = {
  "project.save": async (formData) => finish(await updateProjectAction({
    projectId: text(formData, "projectId"),
    summary: text(formData, "summary"),
    baseline: text(formData, "baseline"),
    successIndicators: text(formData, "successIndicators"),
    resourcesNeeded: text(formData, "resourcesNeeded"),
    risks: text(formData, "risks"),
    dependencies: text(formData, "dependencies"),
    resultsSummary: text(formData, "resultsSummary"),
    lessonsLearned: text(formData, "lessonsLearned"),
  }), `/projects/${text(formData, "projectId")}`),
  "project.stage": async (formData) => finish(await changeStageAction({
    projectId: text(formData, "projectId"),
    stage: text(formData, "stage"),
    finalDecision: text(formData, "finalDecision") || "UNDECIDED",
    decisionJustification: text(formData, "decisionJustification"),
  }), `/projects/${text(formData, "projectId")}`),
  "project.status": async (formData) => {
    const status = text(formData, "status");
    if (status === "ACTIVE" || status === "PAUSED" || status === "ARCHIVED" || status === "CLOSED") {
      finish(await setProjectStatusAction({ projectId: text(formData, "projectId"), status }), `/projects/${text(formData, "projectId")}`);
    }
  },
  "project.action": async (formData) => finish(await addActionItemAction({
    title: text(formData, "title"),
    description: text(formData, "description"),
    ownerId: text(formData, "ownerId"),
    dueOn: text(formData, "dueOn"),
    projectId: text(formData, "projectId"),
  }), `/projects/${text(formData, "projectId")}`),
  "project.actionStatus": async (formData) => {
    const actionId = text(formData, "actionId");
    const result = await updateActionStatusAction({ actionId, status: text(formData, "status") });
    const action = await prisma.actionItem.findUnique({ where: { id: actionId }, select: { projectId: true } });
    finish(result, `/projects/${action?.projectId ?? ""}`);
  },
  "project.approval": async (formData) => finish(await recordApprovalAction({
    projectId: text(formData, "projectId"),
    institutionId: text(formData, "institutionId"),
    sponsorName: text(formData, "sponsorName"),
    state: text(formData, "state"),
    decisionNote: text(formData, "decisionNote"),
  }), `/projects/${text(formData, "projectId")}`),
  "project.commitment": async (formData) => finish(await recordCommitmentAction({
    projectId: text(formData, "projectId"),
    statement: text(formData, "statement"),
  }), `/projects/${text(formData, "projectId")}`),
  "project.grant": async (formData) => finish(await grantProjectAccessAction({
    projectId: text(formData, "projectId"),
    userId: text(formData, "userId"),
    permission: text(formData, "permission"),
    note: text(formData, "note"),
  }), `/projects/${text(formData, "projectId")}`),
  "project.outcome": async (formData) => finish(await recordOutcomeAction({
    projectId: text(formData, "projectId"),
    indicator: text(formData, "indicator"),
    definition: text(formData, "definition"),
    valueText: text(formData, "valueText"),
    evidenceLevel: text(formData, "evidenceLevel"),
    notes: text(formData, "notes"),
  }), `/projects/${text(formData, "projectId")}`),
  "notifications.read": async () => {
    await markNotificationsReadAction();
    redirect("/notifications?notice=Marked+as+read.");
  },
  "settings.preferences": async (formData) => finish(await updateNotificationPreferencesAction({
    inAppEnabled: formData.get("inAppEnabled") === "on",
    emailEnabled: formData.get("emailEnabled") === "on",
    digestFrequency: (text(formData, "digestFrequency") || "DAILY") as "OFF" | "IMMEDIATE" | "DAILY" | "WEEKLY",
    mutedTypes: TYPES.filter((type) => formData.get(`mute-${type}`) === "on"),
  }), "/settings"),
  "settings.archive": async () => {
    const result = await deleteOwnAccountAction();
    if (!result.ok) finish(result, "/settings");
    clearSession();
    redirect("/");
  },
  "resource.create": (formData) => createResourceForm(formData),
  "resource.curate": async (formData) => {
    const verification = text(formData, "verification");
    const id = text(formData, "id");
    if (verification === "DRAFT" || verification === "COMMUNITY" || verification === "VERIFIED") {
      finish(await curateResourceAction({ id, verification, featured: formData.get("featured") === "on" }), `/knowledge/${id}`);
    }
  },
  "admin.settings": async (formData) => finish(await saveProgrammeSettingsAction({
    phase: formData.get("phase"),
    phaseLabel: formData.get("phaseLabel"),
    substantiveContributorsBeforeEvent: formData.get("substantiveContributorsBeforeEvent"),
    cohortSize: formData.get("cohortSize"),
    reviewedCanvases: formData.get("reviewedCanvases"),
    helpResponseWorkingDays: formData.get("helpResponseWorkingDays"),
    sponsorsByDay30: formData.get("sponsorsByDay30"),
    contributorsDays61to90: formData.get("contributorsDays61to90"),
    authorizedTestsWithin90Days: formData.get("authorizedTestsWithin90Days"),
  }), "/admin/settings"),
  "admin.announce": async (formData) => finish(await publishAnnouncementAction({ title: formData.get("title"), body: formData.get("body") }), "/admin/settings"),
  "admin.canvasField": async (formData) => finish(await saveCanvasFieldAction({
    key: formData.get("key"),
    label: formData.get("label"),
    helpText: formData.get("helpText"),
    required: formData.get("required") === "on",
    active: formData.get("active") === "on",
  }), "/admin/settings"),
  "admin.resetCanvasFields": async () => {
    await resetCanvasFieldsForm();
    redirect("/admin/settings?notice=Default+fields+restored.");
  },
  "admin.importInvitations": async (formData) => {
    await importInvitationsForm(formData);
    redirect("/admin/users?notice=Import+recorded.");
  },
  "admin.userStatus": async (formData) => {
    await setUserStatusForm(formData);
    redirect("/admin/users?notice=Account+status+saved.");
  },
  "admin.anonymize": async (formData) => {
    await anonymizeUserForm(formData);
    redirect("/admin/users?notice=Account+archived.");
  },
  "admin.institution": async (formData) => finish(await saveInstitutionAction({
    name: text(formData, "name"),
    countryCode: text(formData, "countryCode"),
    kind: text(formData, "kind") || "agency",
  }), "/admin/institutions"),
  "admin.theme": async (formData) => finish(await saveThemeAction({
    id: text(formData, "id"),
    summary: text(formData, "summary"),
    objectives: text(formData, "objectives"),
    facilitatorId: text(formData, "facilitatorId"),
    archived: formData.get("archived") === "on",
  }), "/admin/themes"),
  "theme.comment": async (formData) => {
    const themeId = text(formData, "themeId");
    const result = await addCommentAction({ body: text(formData, "body"), themeId });
    const theme = await prisma.theme.findUnique({ where: { id: themeId }, select: { slug: true } });
    finish(result, `/themes/${theme?.slug ?? ""}`);
  },
  "theme.note": async (formData) => {
    const themeId = text(formData, "themeId");
    const result = await addThemeNoteAction({
      themeId,
      kind: formData.get("kind") === "MEETING" ? "MEETING" : "DECISION",
      title: text(formData, "title"),
      body: text(formData, "body"),
    });
    const theme = await prisma.theme.findUnique({ where: { id: themeId }, select: { slug: true } });
    finish(result, `/themes/${theme?.slug ?? ""}`);
  },
  "event.create": async (formData) => {
    const result = await createEventAction({
      title: formData.get("title"),
      description: formData.get("description"),
      kind: formData.get("kind"),
      startsAt: formData.get("startsAt"),
      endsAt: formData.get("endsAt"),
      timeZone: formData.get("timeZone"),
      themeId: formData.get("themeId") || undefined,
      meetingUrl: formData.get("meetingUrl") || "",
      preparation: formData.get("preparation") ?? "",
    });
    if (result.ok && result.data && "id" in result.data && result.data.id) redirect(`/events/${result.data.id}`);
    finish(result, "/events/new");
  },
  "event.register": async (formData) => {
    await registerForEventAction(text(formData, "eventId"));
    redirect(`/events/${text(formData, "eventId")}?notice=Registered.`);
  },
  "event.cancel": async (formData) => {
    await cancelRegistrationAction(text(formData, "eventId"));
    redirect(`/events/${text(formData, "eventId")}?notice=Registration+cancelled.`);
  },
  "event.attend": async (formData) => {
    const status = text(formData, "status");
    const eventId = text(formData, "eventId");
    if (status === "ATTENDED" || status === "ABSENT" || status === "REGISTERED") {
      await markAttendanceAction({ eventId, userId: text(formData, "userId"), status });
    }
    redirect(`/events/${eventId}?notice=Attendance+saved.`);
  },
  "event.notes": async (formData) => {
    const eventId = text(formData, "eventId");
    await saveEventNotesAction({ eventId, notes: text(formData, "notes"), followUp: text(formData, "followUp") });
    redirect(`/events/${eventId}?notice=Notes+saved.`);
  },
  "help.respond": async (formData) => finish(await respondToHelpAction({
    requestId: text(formData, "requestId"),
    body: text(formData, "body"),
    status: text(formData, "status") || "IN_DISCUSSION",
  }), `/help-requests/${text(formData, "requestId")}`),
  "canvas.comment": async (formData) => {
    const canvasId = text(formData, "canvasId");
    const result = await addCanvasCommentAction({ canvasId, sectionKey: text(formData, "sectionKey"), body: text(formData, "body") });
    const canvas = await prisma.solutionCanvas.findUnique({ where: { id: canvasId }, select: { projectId: true } });
    finish(result, `/projects/${canvas?.projectId ?? ""}/canvas`);
  },
  "challenge.review": async (formData) => finish(await reviewChallengeAction({
    challengeId: text(formData, "challengeId"),
    status: text(formData, "status"),
    decisionNote: text(formData, "decisionNote"),
    mergedIntoId: text(formData, "mergedIntoId") || undefined,
  }), `/challenges/${text(formData, "challengeId")}`),
  "challenge.comment": async (formData) => finish(await addCommentAction({
    body: text(formData, "body"),
    challengeId: text(formData, "challengeId"),
  }), `/challenges/${text(formData, "challengeId")}`),
};
