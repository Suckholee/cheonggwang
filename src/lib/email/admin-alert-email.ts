import "server-only";
import { sendViaResend, requireEmailEnv } from "./resend";
import { escapeHtml } from "./quote-email-template";
import {
  QUOTE_CATEGORY_LABELS,
  type QuoteCategory,
} from "@/domain/quote-category";

export interface AdminAlertInput {
  providerId: string;
  companyName: string;
  email: string;
  contactPhone: string;
  primaryCategory: QuoteCategory;
  marketingAgreed: boolean;
}

export async function sendAdminAlert(
  to: string,
  input: AdminAlertInput,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { apiKey, from } = requireEmailEnv();

  const subject = `[청광 운영] 신규 청명 가입: ${input.companyName}`;
  const html = renderAdminAlertHtml(input);

  const result = await sendViaResend(apiKey, {
    from,
    to,
    subject,
    html,
  });

  if (!result.ok) {
    return { ok: false, error: `Resend ${result.status}: ${result.error}` };
  }
  return { ok: true };
}

function renderAdminAlertHtml(i: AdminAlertInput): string {
  const consoleUrl = `https://console.firebase.google.com/project/cheonggwang-e4e33/firestore/data/~2Fproviders~2F${encodeURIComponent(i.providerId)}`;
  return `<!DOCTYPE html>
<html><body style="font-family:system-ui,sans-serif;max-width:640px;margin:0 auto;padding:24px">
  <h2>🧹 신규 청명 가입</h2>
  <table style="width:100%;border-collapse:collapse">
    <tr><td style="padding:6px 0;color:#666;width:120px">업체명</td><td style="padding:6px 0"><strong>${escapeHtml(i.companyName)}</strong></td></tr>
    <tr><td style="padding:6px 0;color:#666">이메일</td><td style="padding:6px 0">${escapeHtml(i.email)}</td></tr>
    <tr><td style="padding:6px 0;color:#666">전화</td><td style="padding:6px 0">${escapeHtml(i.contactPhone)}</td></tr>
    <tr><td style="padding:6px 0;color:#666">대표 카테고리</td><td style="padding:6px 0">${escapeHtml(QUOTE_CATEGORY_LABELS[i.primaryCategory])}</td></tr>
    <tr><td style="padding:6px 0;color:#666">마케팅 수신</td><td style="padding:6px 0">${i.marketingAgreed ? "동의" : "미동의"}</td></tr>
    <tr><td style="padding:6px 0;color:#666">providerId</td><td style="padding:6px 0"><code>${escapeHtml(i.providerId)}</code></td></tr>
  </table>
  <p style="margin-top:24px">
    <a href="${escapeHtml(consoleUrl)}" style="color:#4f46e5">Firestore Console에서 providers/${escapeHtml(i.providerId)} 열기</a>
  </p>
</body></html>`;
}
