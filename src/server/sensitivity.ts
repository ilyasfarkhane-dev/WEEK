import type { Confidentiality, Visibility } from "@prisma/client";
import { isOperator, type Actor } from "@/lib/authz";

export function clampSensitivity(
  actor: Actor,
  visibility: Visibility,
  confidentiality: Confidentiality,
) {
  if (isOperator(actor)) return { visibility, confidentiality };
  return {
    visibility: (visibility === "PROGRAMME" ? "TEAM" : visibility) as Visibility,
    confidentiality: (confidentiality === "INTERNAL" ? "CONFIDENTIAL" : confidentiality) as Confidentiality,
  };
}
