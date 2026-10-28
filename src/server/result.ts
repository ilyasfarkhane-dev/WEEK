import { redirect } from "next/navigation";

export type ActionResult<T = undefined> =
  | { ok: true; message?: string; data?: T }
  | { ok: false; message: string; conflict?: boolean };

export function ok<T>(message?: string, data?: T): ActionResult<T> {
  return { ok: true, message, data };
}

export function fail(message: string, conflict = false): ActionResult<never> {
  return { ok: false, message, conflict };
}

export function finish(result: ActionResult<unknown>, path: string): never {
  const params = new URLSearchParams();
  if (result.ok) params.set("notice", result.message ?? "Saved.");
  else params.set("error", result.message);
  redirect(`${path}${path.includes("?") ? "&" : "?"}${params.toString()}`);
}
