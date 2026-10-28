import { createHmac, timingSafeEqual } from "node:crypto";
import { clearCookie, requestCookie, setCookie } from "@/server/http-context";

const COOKIE = "gic.session";
const MAX_AGE = 60 * 60 * 8;

function secret() {
  const value = process.env.AUTH_SECRET;
  if (value) return value;
  if (process.env.NODE_ENV === "production") throw new Error("AUTH_SECRET is required.");
  return "dev-only-gic-session-secret";
}

function sign(payload: string) {
  return createHmac("sha256", secret()).update(payload).digest("base64url");
}

export function readSessionUserId() {
  const token = requestCookie(COOKIE);
  if (!token) return null;
  const [payload, signature] = token.split(".");
  if (!payload || !signature) return null;
  const expected = sign(payload);
  const left = Buffer.from(signature);
  const right = Buffer.from(expected);
  if (left.length !== right.length || !timingSafeEqual(left, right)) return null;
  try {
    const body = JSON.parse(Buffer.from(payload, "base64url").toString()) as { sub?: string; exp?: number };
    if (!body.sub || !body.exp || body.exp < Date.now()) return null;
    return body.sub;
  } catch {
    return null;
  }
}

export function setSessionUser(userId: string) {
  const payload = Buffer.from(JSON.stringify({ sub: userId, exp: Date.now() + MAX_AGE * 1000 })).toString("base64url");
  setCookie(COOKIE, `${payload}.${sign(payload)}`, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: process.env.NODE_ENV === "production",
    maxAge: MAX_AGE,
  });
}

export function clearSession() {
  clearCookie(COOKIE);
}
