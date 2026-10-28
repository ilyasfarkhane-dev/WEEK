import { expect, test } from "@playwright/test";

const password = "Demo-GIC-2026!";

test("a participant sees their workspace and cannot open a restricted project", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Email").fill("omar.hassan@demo.gic.local");
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByRole("heading", { name: /Welcome, Omar/ })).toBeVisible();
  await expect(page.getByText("Citizens as Co-Creators")).toBeVisible();
  const response = await page.goto("/projects/project_restricted_demo");
  expect(response?.status()).toBe(404);
});

test("a participant cannot export another project's canvas", async ({ request }) => {
  const login = await request.post("/api/auth/callback/credentials", {
    form: {
      email: "omar.hassan@demo.gic.local",
      password,
      csrfToken: await csrf(request),
    },
  });
  expect(login.ok() || login.status() === 302).toBeTruthy();
  const exported = await request.get("/api/projects/project_restricted_demo/canvas/export");
  expect(exported.status()).toBe(404);
});

async function csrf(request: import("@playwright/test").APIRequestContext) {
  const response = await request.get("/api/auth/csrf");
  const body = await response.json();
  return String(body.csrfToken ?? "");
}
