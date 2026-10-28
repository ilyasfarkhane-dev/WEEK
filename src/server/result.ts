export type ActionResult<T = undefined> =
  | { ok: true; message?: string; data?: T }
  | { ok: false; message: string; conflict?: boolean };

export class RedirectSignal extends Error {
  location: string;

  constructor(location: string) {
    super("Redirect");
    this.location = location;
  }
}

export function redirect(location: string): never {
  throw new RedirectSignal(location);
}

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
