import { describe, expect, it } from "vitest";
import {
  hasFormalApproval,
  projectAccess,
  stageChangeAllowed,
  canViewHelp,
  profileAccess,
  type Actor,
} from "@/lib/authz";

const participant: Actor = {
  id: "participant",
  status: "ACTIVE",
  roles: ["PARTICIPANT"],
  institutionId: "inst-a",
  themeIds: ["theme-1"],
  facilitatedThemeIds: [],
  primaryThemeId: "theme-1",
};

const outsider: Actor = { ...participant, id: "outsider", themeIds: ["theme-2"], primaryThemeId: "theme-2" };
const manager: Actor = { ...participant, id: "manager", roles: ["PROGRAMME_MANAGER"], themeIds: [], facilitatedThemeIds: [], primaryThemeId: null };
const admin: Actor = { ...manager, id: "admin", roles: ["PLATFORM_ADMIN"] };

const restricted = {
  leadId: "lead",
  themeId: "theme-2",
  visibility: "RESTRICTED" as const,
  confidentiality: "RESTRICTED" as const,
  memberIds: ["lead"],
  grantPermission: null,
};

describe("project access", () => {
  it("hides a restricted project from another participant", () => {
    expect(projectAccess(outsider, restricted)).toBe("none");
    expect(projectAccess(participant, restricted)).toBe("none");
  });

  it("gives a programme manager a summary without edit rights", () => {
    expect(projectAccess(manager, restricted)).toBe("summary");
  });

  it("lets an explicit grant read a restricted project", () => {
    expect(projectAccess(participant, { ...restricted, grantPermission: "VIEW" })).toBe("full");
  });

  it("lets the lead edit", () => {
    expect(projectAccess({ ...participant, id: "lead" }, restricted)).toBe("edit");
  });

  it("lets an administrator edit", () => {
    expect(projectAccess(admin, restricted)).toBe("edit");
  });

  it("shows an internal programme project to a participant", () => {
    expect(projectAccess(participant, {
      leadId: "someone",
      themeId: "theme-9",
      visibility: "PROGRAMME",
      confidentiality: "INTERNAL",
      memberIds: [],
      grantPermission: null,
    })).toBe("full");
  });
});

describe("authorization gate", () => {
  it("blocks testing without a formal approval", () => {
    expect(stageChangeAllowed("TESTING", [{ state: "REQUESTED", isFormal: true }])).toBe(false);
    expect(hasFormalApproval([{ state: "APPROVED", isFormal: false }])).toBe(false);
  });

  it("allows testing after a formal approval", () => {
    expect(stageChangeAllowed("TESTING", [{ state: "APPROVED", isFormal: true }])).toBe(true);
  });

  it("allows an earlier stage without approval", () => {
    expect(stageChangeAllowed("AUTHORIZATION_SOUGHT", [])).toBe(true);
  });
});

describe("help and profiles", () => {
  it("does not show a private request to another participant", () => {
    expect(canViewHelp(outsider, {
      requesterId: "participant",
      assigneeId: null,
      themeId: "theme-1",
      visibility: "PRIVATE",
      kind: "HELP_NEEDED",
    })).toBe(false);
  });

  it("hides a private profile from the directory", () => {
    expect(profileAccess(outsider, { userId: "participant", visibility: "PRIVATE", themeIds: ["theme-1"] })).toBe("none");
  });
});
