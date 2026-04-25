import "server-only";

export interface ResendPayload {
  from: string;
  to: string | string[];
  subject: string;
  html: string;
}

export type ResendResult =
  | { ok: true }
  | { ok: false; status: number; error: string };

export async function sendViaResend(
  apiKey: string,
  payload: ResendPayload,
): Promise<ResendResult> {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    return { ok: false, status: res.status, error: body };
  }
  return { ok: true };
}

export function requireEmailEnv(): { apiKey: string; from: string } {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  if (!apiKey || !from) {
    throw new Error(
      "RESEND_API_KEY / EMAIL_FROM env not configured",
    );
  }
  return { apiKey, from };
}
