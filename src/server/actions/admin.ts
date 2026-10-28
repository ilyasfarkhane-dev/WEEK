"use server";

import { createHash, randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import type { AppRole } from "@prisma/client";
import { prisma } from "@/lib/db";
import { DEFAULT_CANVAS_FIELDS } from "@/lib/canvas";
import { canAccessAdmin, canSuspendUsers, isOperator, isPlatformAdmin } from "@/lib/authz";
import { announcementSchema, canvasFieldSchema, inviteSchema, targetsSchema } from "@/lib/validators";
import { requireActor } from "@/server/actor";
import { anonymizeUser } from "@/server/actions/profile";
import { audit } from "@/server/audit";
import { queueEmail } from "@/lib/email";
import { fail, ok } from "@/server/result";

const ROLES: AppRole[] = [
  "PLATFORM_ADMIN",
  "INSTITUTIONAL_SPONSOR",
  "PROGRAMME_MANAGER",
  "THEMATIC_FACILITATOR",
  "PARTICIPANT",
  "EXPERT",
];

function invitationLink(token: string) {
  return `${process.env.AUTH_URL ?? "http://localhost:3000"}/register/invitation?token=${token}`;
}

async function issueInvitation(input: {
  fullName: string;
  email: string;
  roles: AppRole[];
  themeId?: string | null;
  institutionId?: string | null;
  invitedById: string;
}) {
  const token = randomBytes(32).toString("base64url");
  const tokenHash = createHash("sha256").update(token).digest("hex");
  const invitation = await prisma.invitation.create({
    data: {
      email: input.email.toLowerCase(),
      fullName: input.fullName,
      tokenHash,
      roles: input.roles,
      themeId: input.themeId || null,
      institutionId: input.institutionId || null,
      invitedById: input.invitedById,
      expiresAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
    },
  });
  const link = invitationLink(token);
  const delivery = await queueEmail({
    to: invitation.email,
    subject: "Invitation to the Governance Innovation Community",
    body: `You have been invited.\n\n${link}\n\nThis link expires in 14 days.`,
  });
  await audit(input.invitedById, "invitation.create", "Invitation", invitation.id, { email: invitation.email });
  return { email: invitation.email, link, delivered: delivery.delivered, detail: delivery.detail };
}

export async function inviteUserAction(input: unknown) {
  const { actor } = await requireActor();
  if (!canAccessAdmin(actor, "users")) return fail("You cannot invite people.");
  const parsed = inviteSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Check the invitation.");
  if (parsed.data.roles.includes("PLATFORM_ADMIN") && !isPlatformAdmin(actor)) {
    return fail("Only a platform administrator can invite another administrator.");
  }
  const existing = await prisma.user.findUnique({ where: { email: parsed.data.email.toLowerCase() } });
  if (existing) return fail("That email already has an account.");
  const created = await issueInvitation({ ...parsed.data, invitedById: actor.id });
  revalidatePath("/admin/users");
  return ok(created.detail, created);
}

export async function importInvitationsForm(formData: FormData) {
  await importInvitationsAction(formData);
}

export async function setUserStatusForm(formData: FormData) {
  const status = formData.get("status") === "SUSPENDED" ? "SUSPENDED" : "ACTIVE";
  await setUserStatusAction({ userId: String(formData.get("userId") ?? ""), status });
}

export async function anonymizeUserForm(formData: FormData) {
  await anonymizeUserAction(String(formData.get("userId") ?? ""));
}

export async function importInvitationsAction(formData: FormData) {
  const { actor } = await requireActor();
  if (!canAccessAdmin(actor, "users")) return fail("You cannot import invitations.");
  const file = formData.get("file");
  if (!(file instanceof File)) return fail("Choose a CSV file.");
  if (file.size > 1024 * 1024) return fail("The CSV must be 1 MB or smaller.");
  const text = await file.text();
  const rows = parseCsv(text);
  if (rows.length < 2) return fail("The CSV needs a header and at least one row.");
  const header = rows[0].map((cell) => cell.trim().toLowerCase());
  const index = (name: string) => header.indexOf(name);
  if (index("full_name") < 0 || index("email") < 0) return fail("The header must include full_name and email.");
  const dataRows = rows.slice(1).filter((row) => row.some((cell) => cell.trim()));
  if (dataRows.length > 200) return fail("Import at most 200 rows at a time.");
  const themes = await prisma.theme.findMany({ where: { archivedAt: null } });
  const institutions = await prisma.institution.findMany({ where: { archivedAt: null } });
  const created: { email: string; link: string; detail: string }[] = [];
  const errors: string[] = [];
  for (const [offset, row] of dataRows.entries()) {
    const line = offset + 2;
    const fullName = row[index("full_name")]?.trim() ?? "";
    const email = row[index("email")]?.trim().toLowerCase() ?? "";
    const roleCell = index("role") >= 0 ? row[index("role")] : "PARTICIPANT";
    const roles = roleCell.split("|").map((role) => role.trim()).filter(Boolean) as AppRole[];
    const themeSlug = index("theme_slug") >= 0 ? row[index("theme_slug")]?.trim() : "";
    const institutionName = index("institution_name") >= 0 ? row[index("institution_name")]?.trim() : "";
    if (!fullName || !email.includes("@")) {
      errors.push(`Row ${line}: name or email is invalid.`);
      continue;
    }
    if (roles.some((role) => !ROLES.includes(role))) {
      errors.push(`Row ${line}: unknown role.`);
      continue;
    }
    if (roles.includes("PLATFORM_ADMIN") && !isPlatformAdmin(actor)) {
      errors.push(`Row ${line}: only an administrator can invite an administrator.`);
      continue;
    }
    const theme = themeSlug ? themes.find((item) => item.slug === themeSlug) : undefined;
    if (themeSlug && !theme) {
      errors.push(`Row ${line}: unknown theme slug.`);
      continue;
    }
    const institution = institutionName
      ? institutions.find((item) => item.name.toLowerCase() === institutionName.toLowerCase())
      : undefined;
    if (institutionName && !institution) {
      errors.push(`Row ${line}: institution was not found. Create it before importing.`);
      continue;
    }
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      errors.push(`Row ${line}: an account already exists.`);
      continue;
    }
    const invitation = await issueInvitation({
      fullName,
      email,
      roles: roles.length ? roles : ["PARTICIPANT"],
      themeId: theme?.id,
      institutionId: institution?.id,
      invitedById: actor.id,
    });
    created.push(invitation);
  }
  revalidatePath("/admin/users");
  return ok(`Created ${created.length} invitation${created.length === 1 ? "" : "s"}.`, { created, errors });
}

export async function setUserStatusAction(input: { userId: string; status: "ACTIVE" | "SUSPENDED" }) {
  const { actor } = await requireActor();
  if (!canSuspendUsers(actor)) return fail("Only a platform administrator can suspend accounts.");
  if (input.userId === actor.id) return fail("You cannot suspend your own account.");
  await prisma.user.update({ where: { id: input.userId }, data: { status: input.status } });
  await audit(actor.id, "user.status", "User", input.userId, { status: input.status });
  revalidatePath("/admin/users");
  return ok("Account status updated.");
}

export async function anonymizeUserAction(userId: string) {
  const { actor } = await requireActor();
  if (!isPlatformAdmin(actor)) return fail("Only a platform administrator can delete an account.");
  if (userId === actor.id) return fail("You cannot delete your own administrator account this way.");
  await anonymizeUser(userId, actor.id);
  revalidatePath("/admin/users");
  return ok("The account was archived and profile fields were cleared.");
}

export async function saveInstitutionAction(input: { id?: string; name: string; countryCode: string; kind: string }) {
  const { actor } = await requireActor();
  if (!isOperator(actor)) return fail("You cannot edit institutions.");
  const name = input.name.trim();
  if (name.length < 3) return fail("Enter the institution name.");
  const country = await prisma.country.findUnique({ where: { code: input.countryCode } });
  if (!country) return fail("Choose a country.");
  if (input.id) {
    await prisma.institution.update({ where: { id: input.id }, data: { name, countryCode: country.code, kind: input.kind } });
  } else {
    await prisma.institution.create({ data: { name, countryCode: country.code, kind: input.kind } });
  }
  await audit(actor.id, "institution.save", "Institution", input.id);
  revalidatePath("/admin/institutions");
  return ok("Institution saved.");
}

export async function saveThemeAction(input: { id: string; summary: string; objectives: string; facilitatorId: string; archived: boolean }) {
  const { actor } = await requireActor();
  if (!isOperator(actor)) return fail("You cannot edit workspaces.");
  const facilitatorId = input.facilitatorId || null;
  if (facilitatorId) {
    await prisma.workspaceMembership.upsert({
      where: { themeId_userId: { themeId: input.id, userId: facilitatorId } },
      create: { themeId: input.id, userId: facilitatorId, role: "FACILITATOR", isPrimary: false },
      update: { role: "FACILITATOR" },
    });
  }
  await prisma.theme.update({
    where: { id: input.id },
    data: {
      summary: input.summary,
      objectives: input.objectives,
      facilitatorId,
      archivedAt: input.archived ? new Date() : null,
    },
  });
  if (facilitatorId) {
    await notifySafe(facilitatorId, input.id);
  }
  await audit(actor.id, "theme.update", "Theme", input.id);
  revalidatePath("/admin/themes");
  revalidatePath("/themes");
  return ok("Workspace saved.");
}

async function notifySafe(userId: string, themeId: string) {
  const { notify } = await import("@/server/notify");
  await notify({
    userId,
    type: "WORKSPACE_ASSIGNMENT",
    title: "You were assigned as a facilitator",
    body: "A thematic workspace now lists you as facilitator.",
    href: "/themes",
    dedupeKey: `facilitator:${themeId}:${userId}`,
  });
}

export async function publishAnnouncementAction(input: unknown) {
  const { actor } = await requireActor();
  if (!isOperator(actor)) return fail("You cannot publish an announcement.");
  const parsed = announcementSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Write the announcement.");
  await prisma.announcement.create({ data: { title: parsed.data.title, body: parsed.data.body, authorId: actor.id } });
  await audit(actor.id, "announcement.create", "Announcement");
  revalidatePath("/dashboard");
  return ok("Announcement published to the community dashboard.");
}

export async function addThemeNoteAction(input: { themeId: string; kind: "DECISION" | "MEETING"; title: string; body: string }) {
  const { actor } = await requireActor();
  const allowed = isOperator(actor) || actor.facilitatedThemeIds.includes(input.themeId);
  if (!allowed) return fail("Only the facilitator can record a decision or meeting note.");
  if (input.title.trim().length < 3 || input.body.trim().length < 5) return fail("Add a title and a note.");
  await prisma.themeNote.create({
    data: { themeId: input.themeId, authorId: actor.id, kind: input.kind, title: input.title.trim(), body: input.body.trim() },
  });
  revalidatePath("/themes");
  return ok("Note saved.");
}

export async function saveProgrammeSettingsAction(input: unknown) {
  const { actor } = await requireActor();
  if (!canAccessAdmin(actor, "settings")) return fail("Only a platform administrator can change programme settings.");
  const parsed = targetsSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Check the targets.");
  const { phase, phaseLabel, ...targets } = parsed.data;
  await prisma.programmeSettings.update({
    where: { id: "default" },
    data: { phase, phaseLabel, targets },
  });
  await audit(actor.id, "settings.update", "ProgrammeSettings", "default");
  revalidatePath("/admin/settings");
  revalidatePath("/admin/analytics");
  return ok("Targets and phase saved. Targets are proposals, not results.");
}

export async function saveCanvasFieldAction(input: unknown) {
  const { actor } = await requireActor();
  if (!isPlatformAdmin(actor)) return fail("Only a platform administrator can change the canvas.");
  const parsed = canvasFieldSchema.safeParse(input);
  if (!parsed.success) return fail("Check the field.");
  await prisma.canvasFieldDefinition.update({
    where: { key: parsed.data.key },
    data: {
      label: parsed.data.label,
      helpText: parsed.data.helpText,
      required: parsed.data.required,
      active: parsed.data.active,
    },
  });
  await audit(actor.id, "canvas.field", "CanvasFieldDefinition", parsed.data.key);
  revalidatePath("/admin/settings");
  return ok("Canvas field saved. Earlier versions keep their own field snapshot.");
}

export async function resetCanvasFieldsForm() {
  await resetCanvasFieldsAction();
}

export async function resetCanvasFieldsAction() {
  const { actor } = await requireActor();
  if (!isPlatformAdmin(actor)) return fail("Only a platform administrator can reset the canvas.");
  for (const field of DEFAULT_CANVAS_FIELDS) {
    await prisma.canvasFieldDefinition.upsert({
      where: { key: field.key },
      create: field,
      update: field,
    });
  }
  return ok("Canvas fields restored to the programme default. Stored versions were not rewritten.");
}

function parseCsv(text: string) {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    if (quoted) {
      if (char === '"') {
        if (text[index + 1] === '"') {
          cell += '"';
          index += 1;
        } else quoted = false;
      } else cell += char;
    } else if (char === '"') quoted = true;
    else if (char === ",") {
      row.push(cell);
      cell = "";
    } else if (char === "\n") {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else if (char !== "\r") cell += char;
  }
  if (cell || row.length) {
    row.push(cell);
    rows.push(row);
  }
  return rows;
}
