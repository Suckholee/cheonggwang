import type { Category } from "../types/shared";
import { CATEGORY_LABELS } from "../types/shared";
import type { CategoryInsight } from "../types/insight";
import type { SourceType } from "../types/source";

export interface CategoryRunSummary {
  category: Category;
  sourceCount: number;
  sourcesBySourceType: Partial<Record<SourceType, number>>;
  insight: CategoryInsight;
  proposalDiff: string;
  errors: string[];
}

export interface EmailConfig {
  apiKey: string;
  from: string;
  to: string;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatHtml(weekKey: string, results: CategoryRunSummary[]): string {
  const rows = results
    .map((r) => {
      const bySrc = Object.entries(r.sourcesBySourceType)
        .map(([k, v]) => `${k} ${v}`)
        .join(" · ");
      return `<li><b>${CATEGORY_LABELS[r.category]}</b>: ${r.sourceCount}건 (${bySrc})</li>`;
    })
    .join("");

  const trendBlocks = results
    .map((r) => {
      const top5 = r.insight.topKeywords
        .slice(0, 5)
        .map((k) => escapeHtml(k.term))
        .join(", ");
      return `<li><b>${CATEGORY_LABELS[r.category]}</b>: ${top5}</li>`;
    })
    .join("");

  const diffBlocks = results
    .map((r) => {
      const diff = escapeHtml(r.proposalDiff).slice(0, 2000);
      return `<h4>${CATEGORY_LABELS[r.category]}</h4><pre style="background:#f4f4f4;padding:8px;font-size:12px;overflow:auto">${diff}</pre>`;
    })
    .join("");

  const errorBlocks = results
    .filter((r) => r.errors.length > 0)
    .map((r) => {
      const items = r.errors.slice(0, 5).map((e) => `<li>${escapeHtml(e)}</li>`).join("");
      return `<h4>${CATEGORY_LABELS[r.category]}</h4><ul>${items}</ul>`;
    })
    .join("");

  return `<!DOCTYPE html>
<html>
<body style="font-family:system-ui,sans-serif;color:#111;max-width:640px;margin:0 auto;padding:24px">
  <h2>📊 콘텐츠 연구 파이프라인 주간 결과 — ${weekKey}</h2>

  <h3>수집 요약</h3>
  <ul>${rows}</ul>

  <h3>트렌드 키워드 TOP 5</h3>
  <ul>${trendBlocks}</ul>

  <h3>템플릿 제안 diff</h3>
  ${diffBlocks}

  ${errorBlocks ? `<h3>에러 (최대 5건/카테고리)</h3>${errorBlocks}` : ""}

  <p style="margin-top:32px;color:#666;font-size:13px">
    전체 제안 검수: Firebase Console → Firestore → <code>templates/{category}/proposals/${weekKey}</code>
  </p>
</body>
</html>`;
}

export async function sendWeeklyReport(
  config: EmailConfig,
  weekKey: string,
  results: CategoryRunSummary[]
): Promise<void> {
  const html = formatHtml(weekKey, results);
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: config.from,
      to: config.to,
      subject: `[청광 연구 파이프라인] ${weekKey} 주간 결과`,
      html,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Resend ${res.status}: ${body}`);
  }
}
