export type AiSummaryRequest = {
  purpose: string;
  texts: { id: string; text: string }[];
};

export type AiSummaryResult =
  | { available: false; reason: string }
  | { available: true; text: string; label: "Generated draft"; sources: string[] };

/**
 * Interchangeable provider. The default implementation is intentionally unavailable.
 * A future provider must receive only text the caller has already authorized.
 */
export interface AiProvider {
  readonly name: string;
  summarize(request: AiSummaryRequest): Promise<AiSummaryResult>;
}

export class DisabledAiProvider implements AiProvider {
  readonly name = "disabled";

  async summarize(): Promise<AiSummaryResult> {
    return {
      available: false,
      reason: "AI assistance is not enabled. No content has been sent to an external model.",
    };
  }
}

export function getAiProvider(): AiProvider {
  return new DisabledAiProvider();
}
