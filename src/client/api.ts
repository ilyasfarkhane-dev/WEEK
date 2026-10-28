import type { ActionResult } from "@/server/result";

function revive(value: unknown): unknown {
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(value)) return new Date(value);
  if (Array.isArray(value)) return value.map(revive);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, revive(item)]));
  }
  return value;
}

export async function callAction<T = undefined>(name: string, input?: unknown): Promise<ActionResult<T>> {
  const response = await fetch(`/api/actions/${name}`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input ?? {}),
  });
  return revive(await response.json()) as ActionResult<T>;
}

export async function postForm(name: string, formData: FormData): Promise<ActionResult & { redirect?: string }> {
  const response = await fetch(`/api/forms/${name}`, { method: "POST", body: formData, credentials: "include" });
  return revive(await response.json()) as ActionResult & { redirect?: string };
}

export async function loadView<T>(path: string): Promise<T> {
  const response = await fetch(`/api/views${path}`, { credentials: "include" });
  return revive(await response.json()) as T;
}
