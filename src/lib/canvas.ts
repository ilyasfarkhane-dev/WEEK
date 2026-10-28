import { createHash } from "node:crypto";

export type CanvasField = {
  key: string;
  label: string;
  helpText: string;
  sortOrder: number;
  required: boolean;
  active: boolean;
};

export const DEFAULT_CANVAS_FIELDS: CanvasField[] = [
  ["challenge", "Challenge and context", "What public problem is this work addressing, and in which institutional setting?", true],
  ["stakeholders", "Affected users and stakeholders", "Who is affected, who decides, and who will need to take part?", true],
  ["evidence", "Evidence and baseline", "What is known now? Separate evidence from assumptions.", true],
  ["previous", "Previous attempts and lessons", "What has already been tried, and what should not be repeated?", false],
  ["causes", "Root causes and constraints", "Which causes are within the team's influence, and which constraints are fixed?", true],
  ["solution", "Proposed solution", "Describe the practical change, not only the aspiration.", true],
  ["alternatives", "Alternative approaches considered", "Which other options were set aside, and why?", false],
  ["assumptions", "Key assumptions and risks", "What must be true for this to work, and how would you know it is not?", true],
  ["outcomes", "Expected outcomes", "What should be different for users or the institution if this succeeds?", true],
  ["experiment", "Proposed experiment or pilot", "What small test would produce useful evidence?", true],
  ["permissions", "Required permissions and institutional approvals", "Which formal authorization is required before any test begins?", true],
  ["resources", "Resources, budget, and dependencies", "What people, budget, data, and partners does the test require?", false],
  ["indicators", "Success indicators", "How will the team recognize a useful result, including a result that says stop?", true],
  ["owners", "Responsible persons", "Who is accountable for the next step? A named person is not an institutional approval.", true],
  ["actions", "Next actions and deadlines", "List the next concrete actions and when they are due.", true],
  ["feedback", "Feedback and unresolved questions", "What is still contested or unknown?", false],
].map(([key, label, helpText, required], sortOrder) => ({
  key: key as string,
  label: label as string,
  helpText: helpText as string,
  sortOrder,
  required: Boolean(required),
  active: true,
}));

export function emptyCanvas(fields: { key: string }[]) {
  return Object.fromEntries(fields.map((field) => [field.key, ""]));
}

export function canvasHash(content: Record<string, string>) {
  const canonical = Object.keys(content)
    .sort()
    .map((key) => [key, content[key] ?? ""]);
  return createHash("sha256").update(JSON.stringify(canonical)).digest("hex");
}

export function asCanvasContent(value: unknown): Record<string, string> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const entries = Object.entries(value).filter((entry): entry is [string, string] => typeof entry[1] === "string");
  return Object.fromEntries(entries);
}

export function completion(content: Record<string, string>, fields: CanvasField[]) {
  const required = fields.filter((field) => field.active && field.required);
  if (required.length === 0) return { filled: 0, total: 0, ratio: null as number | null };
  const filled = required.filter((field) => (content[field.key] ?? "").trim().length > 0).length;
  return { filled, total: required.length, ratio: filled / required.length };
}
