import type { ActionResult } from "@/server/result";
import { RedirectSignal } from "@/server/result";

const STORE_KEY = "gic.store";

let opening: Promise<void> | null = null;

function userCount(value: string | null) {
  if (!value) return 0;
  try {
    const parsed = JSON.parse(value) as { User?: unknown[] };
    return Array.isArray(parsed.User) ? parsed.User.length : 0;
  } catch {
    return 0;
  }
}

function openDatabase() {
  if (!opening) {
    opening = (async () => {
      if (userCount(window.localStorage.getItem(STORE_KEY)) > 0) return;
      const response = await fetch("/store.json");
      const text = await response.text();
      if (!response.ok || userCount(text) === 0) throw new Error("The JSON records could not be loaded.");
      window.localStorage.setItem(STORE_KEY, text);
    })();
  }
  return opening;
}

async function actions() {
  await openDatabase();
  const auth = await import("@/server/actions/auth");
  const profile = await import("@/server/actions/profile");
  const collaboration = await import("@/server/actions/collaboration");
  const engagement = await import("@/server/actions/engagement");
  const admin = await import("@/server/actions/admin");
  const notifications = await import("@/server/actions/notifications");
  const session = await import("@/server/session");
  return {
    login: (input: unknown) => auth.loginAction(input as { email: string; password: string }),
    logout: () => auth.logoutAction(),
    acceptInvitation: (input: unknown) => auth.acceptInvitationAction(input as { token: string; password: string; confirmPassword: string }),
    requestPasswordReset: (input: unknown) => auth.requestPasswordResetAction(input as { email: string }),
    resetPassword: (input: unknown) => auth.resetPasswordAction(input as { token: string; password: string; confirmPassword: string }),
    completeOnboarding: (input: unknown) => profile.completeOnboardingAction(input),
    updateProfile: (input: unknown) => profile.updateProfileAction(input),
    updateNotificationPreferences: (input: unknown) => profile.updateNotificationPreferencesAction(input as Parameters<typeof profile.updateNotificationPreferencesAction>[0]),
    deleteOwnAccount: async () => {
      const result = await profile.deleteOwnAccountAction();
      if (result.ok) session.clearSession();
      return result.ok ? { ...result, data: { redirect: "/" } } : result;
    },
    createChallenge: (input: unknown) => collaboration.createChallengeAction(input),
    createProject: (input: unknown) => collaboration.createProjectAction(input),
    createHelpRequest: (input: unknown) => engagement.createHelpRequestAction(input),
    saveCanvas: (input: unknown) => collaboration.saveCanvasAction(input),
    inviteUser: (input: unknown) => admin.inviteUserAction(input),
    markNotificationsRead: () => notifications.markNotificationsReadAction(),
  } as Record<string, (input: unknown) => Promise<unknown>>;
}

function asResult(error: unknown): ActionResult & { redirect?: string } {
  if (error instanceof RedirectSignal) return { ok: true, redirect: error.location };
  return { ok: false, message: "The request could not be completed." };
}

export async function callAction<T = undefined>(name: string, input?: unknown): Promise<ActionResult<T>> {
  try {
    const table = await actions();
    const action = table[name];
    if (!action) return { ok: false, message: "Unknown action." };
    return (await action(input ?? {})) as ActionResult<T>;
  } catch (error) {
    return asResult(error) as ActionResult<T>;
  }
}

export async function postForm(name: string, formData: FormData): Promise<ActionResult & { redirect?: string }> {
  try {
    await openDatabase();
    const { forms } = await import("@/server/forms");
    const handler = forms[name];
    if (!handler) return { ok: false, message: "Unknown form." };
    const result = await handler(formData);
    return (result ?? { ok: true }) as ActionResult & { redirect?: string };
  } catch (error) {
    return asResult(error);
  }
}

export async function loadView<T>(path: string): Promise<T> {
  await openDatabase();
  const { loadView: read } = await import("@/server/views");
  const url = new URL(path, "http://local");
  const query = Object.fromEntries(url.searchParams.entries());
  try {
    return (await read(url.pathname, query)) as T;
  } catch (error) {
    if (error instanceof RedirectSignal) return { redirect: error.location } as T;
    throw error;
  }
}

export async function loadSession() {
  await openDatabase();
  const { sessionPayload } = await import("@/server/session-payload");
  return sessionPayload();
}
