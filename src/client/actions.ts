import { callAction } from "@/client/api";

export const loginAction = (input: { email: string; password: string }) =>
  callAction<{ redirect: string }>("login", input);
export const logoutAction = () => callAction<{ redirect: string }>("logout");
export const acceptInvitationAction = (input: { token: string; password: string; confirmPassword: string }) =>
  callAction<{ redirect: string }>("acceptInvitation", input);
export const requestPasswordResetAction = (input: { email: string }) => callAction("requestPasswordReset", input);
export const resetPasswordAction = (input: { token: string; password: string; confirmPassword: string }) =>
  callAction("resetPassword", input);
export const completeOnboardingAction = (input: unknown) => callAction("completeOnboarding", input);
export const updateProfileAction = (input: unknown) => callAction("updateProfile", input);
export const updateNotificationPreferencesAction = (input: unknown) => callAction("updateNotificationPreferences", input);
export const deleteOwnAccountAction = () => callAction<{ redirect: string }>("deleteOwnAccount");
export const createChallengeAction = (input: unknown) => callAction<{ id: string }>("createChallenge", input);
export const createProjectAction = (input: unknown) => callAction<{ id: string }>("createProject", input);
export const createHelpRequestAction = (input: unknown) => callAction<{ id: string }>("createHelpRequest", input);
export const saveCanvasAction = (input: unknown) => callAction<{ updatedAt: string }>("saveCanvas", input);
export const inviteUserAction = (input: unknown) => callAction<{ link?: string }>("inviteUser", input);
export const markNotificationsReadAction = () => callAction("markNotificationsRead");
