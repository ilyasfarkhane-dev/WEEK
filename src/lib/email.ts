import { prisma } from "@/lib/db";

export type EmailMessage = {
  to: string;
  subject: string;
  body: string;
};

export type EmailSendResult = {
  delivered: boolean;
  status: "SENT" | "SKIPPED" | "FAILED";
  detail: string;
};

/**
 * Integration point for SMTP or a transactional provider.
 * This build records the message and does not claim delivery.
 * Replace `deliver` when a provider and data-processing agreement are in place.
 */
export async function deliverEmail(message: EmailMessage): Promise<EmailSendResult> {
  if (!process.env.SMTP_HOST || !process.env.SMTP_FROM) {
    return {
      delivered: false,
      status: "SKIPPED",
      detail: "No email provider is configured. The message was recorded in the outbox and was not sent.",
    };
  }

  return {
    delivered: false,
    status: "FAILED",
    detail:
      "SMTP settings are present, but this build has no SMTP client. Add the client in src/lib/email.ts. No email was sent.",
  };
}

export async function queueEmail(message: EmailMessage) {
  const result = await deliverEmail(message);
  await prisma.emailOutbox.create({
    data: {
      toAddress: message.to,
      subject: message.subject,
      body: message.body,
      status: result.status,
      provider: process.env.SMTP_HOST ? "smtp-unwired" : "none",
      detail: result.detail,
      sentAt: result.delivered ? new Date() : null,
    },
  });
  return result;
}
