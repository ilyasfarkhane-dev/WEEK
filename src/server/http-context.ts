import { AsyncLocalStorage } from "node:async_hooks";

type CookieOptions = {
  httpOnly?: boolean;
  sameSite?: "lax" | "strict" | "none";
  path?: string;
  secure?: boolean;
  maxAge?: number;
};

type RequestStore = {
  ip: string;
  cookies: Record<string, string>;
  setCookies: string[];
};

export const requestStore = new AsyncLocalStorage<RequestStore>();

export function clientIp() {
  return requestStore.getStore()?.ip || "local";
}

export function requestCookie(name: string) {
  return requestStore.getStore()?.cookies[name];
}

export function setCookie(name: string, value: string, options: CookieOptions = {}) {
  const store = requestStore.getStore();
  if (!store) return;
  const parts = [`${name}=${encodeURIComponent(value)}`, `Path=${options.path ?? "/"}`, `SameSite=${options.sameSite ?? "Lax"}`];
  if (options.httpOnly) parts.push("HttpOnly");
  if (options.secure) parts.push("Secure");
  if (options.maxAge !== undefined) parts.push(`Max-Age=${options.maxAge}`);
  store.setCookies.push(parts.join("; "));
}

export function clearCookie(name: string) {
  setCookie(name, "", { path: "/", maxAge: 0 });
}
