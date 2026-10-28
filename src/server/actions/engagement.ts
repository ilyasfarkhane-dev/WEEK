import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { revalidatePath } from "@/server/noop";
import { redirect } from "@/server/result";
import { prisma } from "@/lib/db";
import { dateTimeLocalToUtc, parseDateInput } from "@/lib/format";
import {
  canCurateResources,
  canManageEvents,
  canViewEvent,
  isCommunityMember,
  isOperator,
} from "@/lib/authz";
import { eventSchema, helpResponseSchema, helpSchema, resourceSchema } from "@/lib/validators";
import { requireActor } from "@/server/actor";
import { audit } from "@/server/audit";
import { nextCode } from "@/server/codes";
import { notify } from "@/server/notify";
import { loadHelp, loadResource } from "@/server/records";
import { fail, ok } from "@/server/result";
import { eventWhere } from "@/server/access";

const FILES = new Map([
  ["application/pdf", ".pdf"],
  ["text/plain", ".txt"],
  ["text/csv", ".csv"],
  ["image/png", ".png"],
  ["image/jpeg", ".jpg"],
]);

export async function createHelpRequestAction(input: unknown) {
  const { user, actor } = await requireActor();
  if (!isCommunityMember(actor)) return fail("Only community members can publish a request.");
  const parsed = helpSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Check the request.");
  if (parsed.data.visibility === "PROGRAMME" && !isOperator(actor)) {
    parsed.data.visibility = "TEAM";
  }
  const code = await nextCode("HR");
  const request = await prisma.helpRequest.create({
    data: {
      code,
      kind: parsed.data.kind,
      title: parsed.data.title,
      description: parsed.data.description,
      requesterId: actor.id,
      institutionId: user.institutionId,
      themeId: parsed.data.themeId || null,
      skillsRequired: parsed.data.skillsRequired,
      visibility: parsed.data.visibility,
      priority: parsed.data.priority,
      responseBy: parseDateInput(parsed.data.responseBy),
    },
  });
  await audit(actor.id, "help.create", "HelpRequest", request.id);
  revalidatePath("/help-requests");
  return ok("Request published.", { id: request.id });
}

export async function respondToHelpAction(input: unknown) {
  const { actor } = await requireActor();
  const parsed = helpResponseSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Write a response.");
  const request = await loadHelp(actor, parsed.data.requestId);
  if (!request) return fail("You cannot respond to this request.");
  const nextStatus = parsed.data.status ?? (request.status === "OPEN" ? "IN_DISCUSSION" : request.status);
  await prisma.$transaction([
    prisma.helpResponse.create({ data: { requestId: request.id, authorId: actor.id, body: parsed.data.body } }),
    prisma.helpRequest.update({
      where: { id: request.id },
      data: {
        status: nextStatus,
        assigneeId: request.assigneeId ?? actor.id,
        closedAt: nextStatus === "RESOLVED" || nextStatus === "CLOSED" ? new Date() : null,
        outcome: nextStatus === "RESOLVED" ? parsed.data.body : request.outcome,
      },
    }),
  ]);
  if (request.requesterId !== actor.id) {
    await notify({
      userId: request.requesterId,
      type: "HELP_RESPONSE",
      title: "Someone responded to your request",
      body: request.title,
      href: `/help-requests/${request.id}`,
      dedupeKey: `help:${request.id}:${actor.id}:${Date.now()}`,
    });
  }
  await audit(actor.id, "help.respond", "HelpRequest", request.id);
  revalidatePath(`/help-requests/${request.id}`);
  return ok("Response posted.");
}

export async function createResourceAction(formData: FormData) {
  const { actor } = await requireActor();
  if (!isCommunityMember(actor) && !isOperator(actor)) return fail("You cannot add a resource.");
  const parsed = resourceSchema.safeParse({
    title: formData.get("title"),
    description: formData.get("description"),
    type: formData.get("type"),
    themeId: formData.get("themeId") || undefined,
    language: formData.get("language"),
    source: formData.get("source") ?? "",
    attribution: formData.get("attribution") ?? "",
    publishedOn: formData.get("publishedOn") || undefined,
    authorName: formData.get("authorName") ?? "",
    tags: formData.get("tags") ?? "",
    visibility: formData.get("visibility"),
    verification: formData.get("verification"),
    featured: formData.get("featured") === "on",
    externalUrl: formData.get("externalUrl") || "",
  });
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Check the resource form.");
  let verification = parsed.data.verification;
  let featured = Boolean(parsed.data.featured);
  if (!canCurateResources(actor)) {
    verification = verification === "DRAFT" ? "DRAFT" : "COMMUNITY";
    featured = false;
  }
  const file = formData.get("file");
  let fileName: string | null = null;
  let fileKey: string | null = null;
  let mimeType: string | null = null;
  let fileSize: number | null = null;
  if (file instanceof File && file.size > 0) {
    const extension = FILES.get(file.type);
    if (!extension) return fail("Use a PDF, plain text, CSV, PNG, or JPEG file.");
    if (file.size > 8 * 1024 * 1024) return fail("Files must be 8 MB or smaller.");
    fileKey = `${randomUUID()}${extension}`;
    fileName = path.basename(file.name).slice(0, 120);
    mimeType = file.type;
    fileSize = file.size;
    const directory = process.env.UPLOAD_DIR || (typeof process.cwd === "function" ? path.join(process.cwd(), "storage", "uploads") : "storage/uploads");
    await mkdir(directory, { recursive: true });
    await writeFile(path.join(directory, fileKey), Buffer.from(await file.arrayBuffer()));
  }
  const resource = await prisma.resource.create({
    data: {
      title: parsed.data.title,
      description: parsed.data.description,
      type: parsed.data.type,
      themeId: parsed.data.themeId || null,
      language: parsed.data.language,
      source: parsed.data.source,
      attribution: parsed.data.attribution,
      publishedOn: parseDateInput(parsed.data.publishedOn),
      authorName: parsed.data.authorName,
      tags: parsed.data.tags.split(",").map((tag) => tag.trim()).filter(Boolean).slice(0, 12),
      visibility: parsed.data.visibility === "PROGRAMME" && !isOperator(actor) ? "TEAM" : parsed.data.visibility,
      verification,
      featured,
      externalUrl: parsed.data.externalUrl || null,
      fileName,
      fileKey,
      mimeType,
      fileSize,
      createdById: actor.id,
    },
  });
  await audit(actor.id, "resource.create", "Resource", resource.id, { verification });
  revalidatePath("/knowledge");
  redirect(`/knowledge/${resource.id}`);
}

export async function createResourceForm(formData: FormData) {
  await createResourceAction(formData);
}

export async function curateResourceAction(input: { id: string; verification: "DRAFT" | "COMMUNITY" | "VERIFIED"; featured: boolean }) {
  const { actor } = await requireActor();
  if (!canCurateResources(actor)) return fail("Only a programme manager can verify or feature a resource.");
  const resource = await loadResource(actor, input.id);
  if (!resource) return fail("Resource not found.");
  await prisma.resource.update({
    where: { id: resource.id },
    data: { verification: input.verification, featured: input.featured },
  });
  await audit(actor.id, "resource.curate", "Resource", resource.id, input);
  revalidatePath(`/knowledge/${resource.id}`);
  return ok("Curation saved. Verified is not the same as a community draft.");
}

export async function createEventAction(input: unknown) {
  const { actor } = await requireActor();
  if (!canManageEvents(actor)) return fail("Only a programme manager can schedule events.");
  const parsed = eventSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Check the event form.");
  const startsAt = dateTimeLocalToUtc(parsed.data.startsAt, parsed.data.timeZone);
  const endsAt = dateTimeLocalToUtc(parsed.data.endsAt, parsed.data.timeZone);
  if (!startsAt || !endsAt || endsAt <= startsAt) return fail("The end time must be after the start time.");
  const event = await prisma.event.create({
    data: {
      title: parsed.data.title,
      description: parsed.data.description,
      kind: parsed.data.kind,
      hostId: parsed.data.hostId || actor.id,
      startsAt,
      endsAt,
      timeZone: parsed.data.timeZone,
      themeId: parsed.data.themeId || null,
      projectId: parsed.data.projectId || null,
      meetingUrl: parsed.data.meetingUrl || null,
      preparation: parsed.data.preparation,
    },
  });
  await audit(actor.id, "event.create", "Event", event.id);
  revalidatePath("/events");
  return ok("Event scheduled. Reminders are in-app until an email provider is configured.", { id: event.id });
}

export async function registerForEventAction(eventId: string) {
  const { actor } = await requireActor();
  const event = await prisma.event.findFirst({ where: { id: eventId, ...eventWhere(actor) } });
  if (!event) return fail("You cannot register for this event.");
  const visible = canViewEvent(actor, {
    themeId: event.themeId,
    visibility: event.visibility,
    hostId: event.hostId,
    registered: false,
  });
  if (!visible && !isOperator(actor)) return fail("You cannot register for this event.");
  await prisma.eventRegistration.upsert({
    where: { eventId_userId: { eventId, userId: actor.id } },
    create: { eventId, userId: actor.id, status: "REGISTERED" },
    update: { status: "REGISTERED" },
  });
  await audit(actor.id, "event.register", "Event", eventId);
  revalidatePath(`/events/${eventId}`);
  return ok("You are registered.");
}

export async function cancelRegistrationAction(eventId: string) {
  const { actor } = await requireActor();
  await prisma.eventRegistration.updateMany({
    where: { eventId, userId: actor.id },
    data: { status: "CANCELLED" },
  });
  revalidatePath(`/events/${eventId}`);
  return ok("Registration cancelled.");
}

export async function markAttendanceAction(input: { eventId: string; userId: string; status: "ATTENDED" | "ABSENT" | "REGISTERED" }) {
  const { actor } = await requireActor();
  if (!canManageEvents(actor)) return fail("Only a programme manager can record attendance.");
  await prisma.eventRegistration.update({
    where: { eventId_userId: { eventId: input.eventId, userId: input.userId } },
    data: { status: input.status },
  });
  await audit(actor.id, "event.attendance", "Event", input.eventId, { userId: input.userId, status: input.status });
  revalidatePath(`/events/${input.eventId}`);
  return ok("Attendance saved.");
}

export async function saveEventNotesAction(input: { eventId: string; notes: string; followUp: string }) {
  const { actor } = await requireActor();
  if (!canManageEvents(actor)) return fail("Only a programme manager can record notes.");
  await prisma.event.update({
    where: { id: input.eventId },
    data: { notes: input.notes.slice(0, 8000), followUp: input.followUp.slice(0, 4000) },
  });
  revalidatePath(`/events/${input.eventId}`);
  return ok("Notes saved.");
}
