import type { Provider } from "@/types/provider";
import type { QuoteRequest } from "@/types/quote-request";
import {
  QUOTE_CATEGORY_EMOJIS,
  QUOTE_CATEGORY_LABELS,
} from "@/domain/quote-category";

export interface QuoteEmailInput {
  provider: Provider;
  request: QuoteRequest;
  photoUrls: string[];
}

export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function buildSubject(request: QuoteRequest): string {
  const label = QUOTE_CATEGORY_LABELS[request.category];
  const sizeStr = request.size ? `${request.size}평` : "";
  return `[청광] 새 견적 요청: ${label}${sizeStr ? ` · ${sizeStr}` : ""} · ${request.region.district}`;
}

export function renderQuoteEmailHtml(input: QuoteEmailInput): string {
  const { provider, request, photoUrls } = input;
  const catLabel = QUOTE_CATEGORY_LABELS[request.category];
  const emoji = QUOTE_CATEGORY_EMOJIS[request.category];
  const size = request.size ? `${request.size}평` : "정보 없음";
  const date = request.preferredDate
    ? request.preferredDate.toLocaleDateString("ko-KR")
    : "협의";
  const phoneDigits = request.contactPhone.replace(/-/g, "");
  const note = request.note ? escapeHtml(request.note) : "(특이사항 없음)";

  const photosHtml =
    photoUrls.length > 0
      ? `<h3 style="margin-top:24px">첨부 사진</h3>
       <ul style="padding-left:20px">
         ${photoUrls
           .map(
             (url, i) =>
               `<li><a href="${escapeHtml(url)}" style="color:#4f46e5">사진 ${i + 1}</a></li>`,
           )
           .join("")}
       </ul>`
      : "";

  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"></head>
<body style="font-family:system-ui,-apple-system,sans-serif;max-width:640px;margin:0 auto;padding:24px;color:#111">
  <div style="border-bottom:2px solid #111;padding-bottom:12px;margin-bottom:24px">
    <h1 style="margin:0;font-size:20px">${emoji} [청광] 새 견적 요청</h1>
    <p style="margin:4px 0 0;color:#666;font-size:13px">${escapeHtml(provider.companyName)} 앞</p>
  </div>

  <table style="width:100%;border-collapse:collapse">
    <tr><td style="padding:8px 0;color:#666;width:90px">카테고리</td><td style="padding:8px 0"><strong>${escapeHtml(catLabel)}</strong></td></tr>
    <tr><td style="padding:8px 0;color:#666">지역</td><td style="padding:8px 0">${escapeHtml(request.region.city)} ${escapeHtml(request.region.district)}</td></tr>
    <tr><td style="padding:8px 0;color:#666">평수</td><td style="padding:8px 0">${escapeHtml(size)}</td></tr>
    <tr><td style="padding:8px 0;color:#666">희망일</td><td style="padding:8px 0">${escapeHtml(date)}</td></tr>
    <tr><td style="padding:8px 0;color:#666">연락처</td><td style="padding:8px 0"><a href="tel:${escapeHtml(phoneDigits)}" style="color:#4f46e5">${escapeHtml(request.contactPhone)}</a></td></tr>
  </table>

  <h3 style="margin-top:24px">특이사항</h3>
  <p style="background:#f4f4f4;padding:12px;border-radius:8px;white-space:pre-wrap">${note}</p>

  ${photosHtml}

  <div style="margin-top:32px">
    <a href="tel:${escapeHtml(phoneDigits)}" style="display:inline-block;padding:12px 24px;background:#4f46e5;color:white;text-decoration:none;border-radius:8px;font-weight:600;margin-right:8px">전화 걸기</a>
    <a href="mailto:?subject=${encodeURIComponent("견적 답변")}" style="display:inline-block;padding:12px 24px;background:#f4f4f4;color:#111;text-decoration:none;border-radius:8px;font-weight:600">이메일 답장</a>
  </div>

  <p style="margin-top:32px;color:#999;font-size:12px">
    요청 ID: ${escapeHtml(request.id)}<br>
    이 이메일은 청광 마켓플레이스에서 자동 발송됩니다.
  </p>
</body></html>`;
}
