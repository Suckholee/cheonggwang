import "server-only";
import type { Provider } from "@/types/provider";
import type { QuoteRequest } from "@/types/quote-request";
import { requireEmailEnv, sendViaResend } from "./resend";
import {
  buildSubject,
  renderQuoteEmailHtml,
  type QuoteEmailInput,
} from "./quote-email-template";

export type { QuoteEmailInput };

export async function sendQuoteEmail(input: {
  provider: Provider;
  request: QuoteRequest;
  photoUrls: string[];
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const { apiKey, from } = requireEmailEnv();

  const subject = buildSubject(input.request);
  const html = renderQuoteEmailHtml(input);

  const result = await sendViaResend(apiKey, {
    from,
    to: input.provider.contactEmail,
    subject,
    html,
  });

  if (!result.ok) {
    return { ok: false, error: `Resend ${result.status}: ${result.error}` };
  }
  return { ok: true };
}
