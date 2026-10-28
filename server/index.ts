import "dotenv/config";
import { createReadStream } from "node:fs";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import express, { type Request, type Response } from "express";
import busboy from "busboy";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import type { ProjectStage } from "@prisma/client";
import { canReadProjectNarrative, canViewAnalytics, projectAccess } from "@/lib/authz";
import { asCanvasContent } from "@/lib/canvas";
import { prisma } from "@/lib/db";
import { toCsv } from "@/lib/format";
import { label } from "@/lib/labels";
import { STAGE_ORDER } from "@/lib/metrics";
import { projectWhere } from "@/server/access";
import { requireActor } from "@/server/actor";
import { loginAction, logoutAction, acceptInvitationAction, requestPasswordResetAction, resetPasswordAction } from "@/server/actions/auth";
import { completeOnboardingAction, deleteOwnAccountAction, updateNotificationPreferencesAction, updateProfileAction } from "@/server/actions/profile";
import { createChallengeAction, createProjectAction, saveCanvasAction } from "@/server/actions/collaboration";
import { createHelpRequestAction } from "@/server/actions/engagement";
import { inviteUserAction } from "@/server/actions/admin";
import { markNotificationsReadAction } from "@/server/actions/notifications";
import { forms } from "@/server/forms";
import { requestStore } from "@/server/http-context";
import { loadProgrammeMetrics } from "@/server/metrics-query";
import { notify } from "@/server/notify";
import { loadProject, loadResource } from "@/server/records";
import { RedirectSignal } from "@/server/result";
import { clearSession } from "@/server/session";
import { loadView } from "@/server/views";
import { sessionPayload } from "@/server/session-payload";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dev = process.env.NODE_ENV !== "production";
const port = Number(process.env.PORT || 3000);

const actions: Record<string, (input: unknown) => Promise<unknown>> = {
  login: (input) => loginAction(input as { email: string; password: string }),
  logout: () => logoutAction(),
  acceptInvitation: (input) => acceptInvitationAction(input as { token: string; password: string; confirmPassword: string }),
  requestPasswordReset: (input) => requestPasswordResetAction(input as { email: string }),
  resetPassword: (input) => resetPasswordAction(input as { token: string; password: string; confirmPassword: string }),
  completeOnboarding: (input) => completeOnboardingAction(input),
  updateProfile: (input) => updateProfileAction(input),
  updateNotificationPreferences: (input) => updateNotificationPreferencesAction(input as Parameters<typeof updateNotificationPreferencesAction>[0]),
  deleteOwnAccount: async () => {
    const result = await deleteOwnAccountAction();
    if (result.ok) clearSession();
    return result.ok ? { ...result, data: { redirect: "/" } } : result;
  },
  createChallenge: (input) => createChallengeAction(input),
  createProject: (input) => createProjectAction(input),
  createHelpRequest: (input) => createHelpRequestAction(input),
  saveCanvas: (input) => saveCanvasAction(input),
  inviteUser: (input) => inviteUserAction(input),
  markNotificationsRead: () => markNotificationsReadAction(),
};

function parseCookies(header: string | undefined) {
  const cookies: Record<string, string> = {};
  if (!header) return cookies;
  for (const part of header.split(";")) {
    const index = part.indexOf("=");
    if (index === -1) continue;
    cookies[part.slice(0, index).trim()] = decodeURIComponent(part.slice(index + 1).trim());
  }
  return cookies;
}

function clientAddress(request: Request) {
  const forwarded = request.header("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || request.ip || "local";
}

function applyCookies(response: Response, values: string[]) {
  for (const value of values) response.append("Set-Cookie", value);
}

function sendResult(response: Response, value: unknown, cookies: string[]) {
  applyCookies(response, cookies);
  response.json(value ?? { ok: true });
}

async function readMultipart(request: Request) {
  const form = new FormData();
  await new Promise<void>((resolve, reject) => {
    const parser = busboy({ headers: request.headers });
    const pending: Array<Promise<void>> = [];
    parser.on("field", (name, value) => form.append(name, value));
    parser.on("file", (name, stream, info) => {
      const chunks: Buffer[] = [];
      pending.push(new Promise((done) => {
        stream.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
        stream.on("end", () => {
          const bytes = Buffer.concat(chunks);
          form.append(name, new File([bytes], info.filename || "upload", { type: info.mimeType || "application/octet-stream" }));
          done();
        });
      }));
      stream.resume();
    });
    parser.on("error", reject);
    parser.on("finish", () => Promise.all(pending).then(() => resolve(), reject));
    request.pipe(parser);
  });
  return form;
}

async function readBody(request: Request) {
  if (request.is("multipart/form-data")) return readMultipart(request);
  const form = new FormData();
  const body = request.body as Record<string, unknown> | undefined;
  if (body && typeof body === "object") {
    for (const [key, value] of Object.entries(body)) {
      if (Array.isArray(value)) value.forEach((item) => form.append(key, String(item)));
      else if (value !== undefined && value !== null) form.append(key, String(value));
    }
  }
  return form;
}

function handleError(response: Response, error: unknown, cookies: string[]) {
  if (error instanceof RedirectSignal) {
    applyCookies(response, cookies);
    response.json({ ok: true, redirect: error.location });
    return;
  }
  console.error(error);
  applyCookies(response, cookies);
  response.status(500).json({ ok: false, message: "The request could not be completed." });
}

const app = express();
app.disable("x-powered-by");
app.use((_request, response, next) => {
  response.setHeader("X-Frame-Options", "DENY");
  response.setHeader("X-Content-Type-Options", "nosniff");
  response.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  response.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  next();
});
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: false }));

app.use((request, response, next) => {
  const store = { ip: clientAddress(request), cookies: parseCookies(request.header("cookie")), setCookies: [] as string[] };
  requestStore.run(store, () => {
    response.on("finish", () => undefined);
    const originalJson = response.json.bind(response);
    response.json = ((body: unknown) => {
      applyCookies(response, store.setCookies);
      store.setCookies = [];
      return originalJson(body);
    }) as Response["json"];
    next();
  });
});

app.get("/api/health", (_request, response) => {
  response.json({ ok: true, database: "json" });
});

app.get("/api/session", async (_request, response) => {
  response.json(await sessionPayload());
});

app.post("/api/actions/:name", async (request, response) => {
  const action = actions[request.params.name];
  const cookies = requestStore.getStore()?.setCookies ?? [];
  if (!action) {
    response.status(404).json({ ok: false, message: "Unknown action." });
    return;
  }
  try {
    sendResult(response, await action(request.body), cookies);
  } catch (error) {
    handleError(response, error, requestStore.getStore()?.setCookies ?? cookies);
  }
});

app.post("/api/forms/:name", async (request, response) => {
  const handler = forms[request.params.name];
  if (!handler) {
    response.status(404).json({ ok: false, message: "Unknown form." });
    return;
  }
  try {
    const form = await readBody(request);
    const result = await handler(form);
    sendResult(response, result ?? { ok: true }, requestStore.getStore()?.setCookies ?? []);
  } catch (error) {
    handleError(response, error, requestStore.getStore()?.setCookies ?? []);
  }
});

app.use("/api/views", async (request, response) => {
  try {
    const pathname = request.path.replace(/^\/api\/views/, "") || "/";
    const result = await loadView(pathname, request.query as Record<string, string>);
    response.json(result);
  } catch (error) {
    handleError(response, error, requestStore.getStore()?.setCookies ?? []);
  }
});

app.get("/api/projects/:id/export", async (request, response) => {
  try {
    const { actor } = await requireActor();
    const loaded = await loadProject(actor, request.params.id);
    if (!loaded) {
      response.status(404).send("Not found");
      return;
    }
    const narrative = canReadProjectNarrative(loaded.level);
    const project = loaded.project;
    const rows = [
      ["field", "value"],
      ["code", project.code],
      ["title", narrative ? project.title : "Restricted record"],
      ["stage", label(project.stage)],
      ["status", label(project.status)],
      ["theme", project.theme.name],
      ["country", project.country.name],
      ["institution", project.institution.name],
      ["summary", narrative ? project.summary : ""],
      ["formal_approval", project.approvals.some((item) => item.isFormal && item.state === "APPROVED") ? "yes" : "no"],
    ];
    response.setHeader("Content-Type", "text/csv; charset=utf-8");
    response.setHeader("Content-Disposition", `attachment; filename="${project.code}.csv"`);
    response.setHeader("Cache-Control", "private, no-store");
    response.send(toCsv(rows));
  } catch (error) {
    if (error instanceof RedirectSignal) response.redirect(error.location);
    else response.status(500).send("Not found");
  }
});

app.get("/api/projects/:id/canvas/export", async (request, response) => {
  try {
    const { actor } = await requireActor();
    const loaded = await loadProject(actor, request.params.id);
    if (!loaded || !canReadProjectNarrative(loaded.level)) {
      response.status(404).json({ error: "Not found" });
      return;
    }
    const canvas = await prisma.solutionCanvas.findUnique({
      where: { projectId: loaded.project.id },
      include: { versions: { orderBy: { versionNumber: "asc" }, select: { versionNumber: true, content: true, createdAt: true, note: true } } },
    });
    if (!canvas) {
      response.status(404).json({ error: "Not found" });
      return;
    }
    response.json({
      projectCode: loaded.project.code,
      working: asCanvasContent(canvas.workingJson),
      updatedAt: canvas.workingUpdatedAt,
      versions: canvas.versions,
      notice: "Generated content is not included. This is the stored canvas.",
    });
  } catch (error) {
    if (error instanceof RedirectSignal) response.redirect(error.location);
    else response.status(500).json({ error: "Not found" });
  }
});

app.get("/api/projects/:id/canvas/pdf", async (request, response) => {
  try {
    const { actor } = await requireActor();
    const loaded = await loadProject(actor, request.params.id);
    if (!loaded || !canReadProjectNarrative(loaded.level)) {
      response.status(404).send("Not found");
      return;
    }
    const canvas = await prisma.solutionCanvas.findUnique({ where: { projectId: loaded.project.id } });
    if (!canvas) {
      response.status(404).send("Not found");
      return;
    }
    const fields = await prisma.canvasFieldDefinition.findMany({ orderBy: { sortOrder: "asc" } });
    const content = asCanvasContent(canvas.workingJson);
    const pdf = await PDFDocument.create();
    const font = await pdf.embedFont(StandardFonts.Helvetica);
    const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
    let page = pdf.addPage();
    let y = 780;
    const write = (value: string, size: number, strong = false) => {
      const used = strong ? bold : font;
      for (const line of wrap(value, 90)) {
        if (y < 60) {
          page = pdf.addPage();
          y = 780;
        }
        page.drawText(winAnsi(line), { x: 48, y, size, font: used, color: rgb(0.07, 0.14, 0.25) });
        y -= size + 6;
      }
    };
    write(`${loaded.project.code} · Solution Canvas`, 16, true);
    write("Demonstration or draft text may be included. This export is not an institutional authorization.", 10);
    y -= 8;
    for (const field of fields) {
      write(field.label, 12, true);
      write(content[field.key]?.trim() || "Not completed.", 10);
      y -= 6;
    }
    const bytes = await pdf.save();
    response.setHeader("Content-Type", "application/pdf");
    response.setHeader("Content-Disposition", `attachment; filename="${loaded.project.code}-canvas.pdf"`);
    response.setHeader("Cache-Control", "private, no-store");
    response.send(Buffer.from(bytes));
  } catch (error) {
    if (error instanceof RedirectSignal) response.redirect(error.location);
    else response.status(500).send("Not found");
  }
});

app.get("/api/admin/analytics/export", async (request, response) => {
  try {
    const { actor } = await requireActor();
    if (!canViewAnalytics(actor)) {
      response.status(404).send("Not found");
      return;
    }
    const stage = STAGE_ORDER.find((item) => item === request.query.stage);
    const metrics = await loadProgrammeMetrics({
      from: request.query.from ? new Date(String(request.query.from)) : undefined,
      to: request.query.to ? new Date(String(request.query.to)) : undefined,
      themeId: request.query.theme ? String(request.query.theme) : undefined,
      countryCode: request.query.country ? String(request.query.country) : undefined,
      institutionId: request.query.institution ? String(request.query.institution) : undefined,
      stage: stage as ProjectStage | undefined,
    });
    const projects = await prisma.project.findMany({
      where: projectWhere(actor),
      include: { theme: true, country: true, institution: true, members: true, grants: true },
      orderBy: { code: "asc" },
    });
    const rows: Array<Array<string | number | null>> = [
      ["section", "measure", "value"],
      ["activity", "registered_participants", metrics.stock.participants],
      ["activity", "onboarding_rate", metrics.stock.onboardingRate],
      ["activity", "meaningful_contributions", metrics.flow.contributors],
      ["projects", "total", metrics.projects.total],
      ["note", "interpretation", "Counts are stored records, not evidence of causation."],
    ];
    for (const project of projects) {
      const grant = project.grants.find((item) => item.userId === actor.id);
      const level = projectAccess(actor, {
        leadId: project.leadId,
        themeId: project.themeId,
        visibility: project.visibility,
        confidentiality: project.confidentiality,
        memberIds: project.members.map((member) => member.userId),
        grantPermission: grant?.permission ?? null,
      });
      if (level === "none") continue;
      rows.push(["project", project.code, `${level === "summary" ? "Restricted record" : project.title} | ${label(project.stage)} | ${project.theme.name} | ${project.country.name}`]);
    }
    response.setHeader("Content-Type", "text/csv; charset=utf-8");
    response.setHeader("Content-Disposition", "attachment; filename=gic-monitoring.csv");
    response.setHeader("Cache-Control", "private, no-store");
    response.send(toCsv(rows));
  } catch (error) {
    if (error instanceof RedirectSignal) response.redirect(error.location);
    else response.status(500).send("Not found");
  }
});

app.get("/api/resources/:id/file", async (request, response) => {
  try {
    const { actor } = await requireActor();
    const resource = await loadResource(actor, request.params.id);
    if (!resource?.fileKey || !/^[\w.-]+$/.test(resource.fileKey)) {
      response.status(404).send("Not found");
      return;
    }
    const directory = process.env.UPLOAD_DIR || path.join(process.cwd(), "storage", "uploads");
    const full = path.join(directory, resource.fileKey);
    if (!full.startsWith(path.resolve(directory))) {
      response.status(404).send("Not found");
      return;
    }
    response.setHeader("Content-Type", resource.mimeType || "application/octet-stream");
    response.setHeader("Content-Disposition", `attachment; filename="${(resource.fileName || "resource").replaceAll('"', "")}"`);
    response.setHeader("X-Content-Type-Options", "nosniff");
    response.setHeader("Cache-Control", "private, no-store");
    createReadStream(full).on("error", () => response.status(404).end()).pipe(response);
  } catch (error) {
    if (error instanceof RedirectSignal) response.redirect(error.location);
    else response.status(404).send("Not found");
  }
});

app.post("/api/cron/reminders", async (request, response) => {
  if (!process.env.CRON_SECRET) {
    response.status(503).json({ ok: false, delivered: false, detail: "CRON_SECRET is not configured. No reminder job ran and no email was sent." });
    return;
  }
  if (request.header("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    response.status(401).json({ ok: false });
    return;
  }
  const soon = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
  const due = await prisma.actionItem.findMany({
    where: { ownerId: { not: null }, status: { in: ["OPEN", "IN_PROGRESS"] }, dueOn: { lte: soon } },
    take: 200,
  });
  for (const action of due) {
    if (!action.ownerId) continue;
    await notify({
      userId: action.ownerId,
      type: "DEADLINE",
      title: action.dueOn && action.dueOn < new Date() ? "Action overdue" : "Action due soon",
      body: action.title,
      href: action.projectId ? `/projects/${action.projectId}` : "/dashboard",
      dedupeKey: `deadline:${action.id}:${action.dueOn?.toISOString().slice(0, 10) ?? "none"}`,
    });
  }
  response.json({
    ok: true,
    remindersRecorded: due.length,
    email: "In-app notices were deduplicated. Email is sent only when a provider is configured and the user asked for immediate email.",
  });
});

function winAnsi(value: string) {
  return value.replace(/[^\x09\x0A\x0D\x20-\x7E]/g, "?");
}

function wrap(value: string, width: number) {
  const words = winAnsi(value).split(/\s+/);
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (next.length > width) {
      if (current) lines.push(current);
      current = word;
    } else current = next;
  }
  if (current) lines.push(current);
  return lines.length ? lines : [""];
}

async function start() {
  if (dev) {
    const { createServer: createVite } = await import("vite");
    const vite = await createVite({ root, server: { middlewareMode: true }, appType: "spa" });
    app.use(vite.middlewares);
  } else {
    const dist = path.join(root, "dist");
    app.use(express.static(dist));
    app.get(/^(?!\/api\/).*/, async (_request, response) => {
      response.type("html").send(await readFile(path.join(dist, "index.html"), "utf8"));
    });
  }
  app.listen(port, "127.0.0.1", () => {
    console.log(`GIC listening on http://127.0.0.1:${port}`);
  });
}

void start();
