import "server-only";
import { sendViaResend, requireEmailEnv } from "./resend";
import { escapeHtml } from "./quote-email-template";

export async function sendWelcomeEmail(
  email: string,
  companyName: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { apiKey, from } = requireEmailEnv();

  const subject = `[청광] ${companyName}님, 가입을 환영합니다`;
  const html = renderWelcomeHtml(companyName);

  const result = await sendViaResend(apiKey, {
    from,
    to: email,
    subject,
    html,
  });

  if (!result.ok) {
    return { ok: false, error: `Resend ${result.status}: ${result.error}` };
  }
  return { ok: true };
}

function renderWelcomeHtml(companyName: string): string {
  const appUrl = process.env.APP_URL ?? "http://localhost:3000";
  const profileUrl = `${appUrl}/provider/profile`;
  const name = escapeHtml(companyName);

  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"></head>
<body style="font-family:system-ui,-apple-system,sans-serif;max-width:640px;margin:0 auto;padding:24px;color:#111">
  <h1 style="font-size:22px;margin:0 0 16px">🎉 가입을 환영합니다, ${name}님!</h1>
  <p style="line-height:1.6">청광 청소 마켓플레이스에 <strong>${name}</strong>이(가) 정식 청명으로 등록되었습니다.</p>

  <h3 style="margin-top:24px">시작하는 3 단계</h3>
  <ol style="line-height:1.8">
    <li>프로필 사진·서비스 단가·포트폴리오 추가 (곧 편집 페이지 제공)</li>
    <li>의뢰인의 신규 견적 요청 수신 → 빠른 응답으로 수락률 ↑</li>
    <li>거래 성사 → 리뷰·재계약으로 매출 성장</li>
  </ol>

  <div style="margin-top:32px">
    <a href="${escapeHtml(profileUrl)}" style="display:inline-block;padding:12px 24px;background:#4f46e5;color:white;text-decoration:none;border-radius:8px;font-weight:600">
      프로필 완성하러 가기
    </a>
  </div>

  <p style="margin-top:32px;color:#999;font-size:12px">
    이 이메일은 청광 마켓플레이스에서 자동 발송됩니다.<br>
    문의: <a href="mailto:peter15975345@gmail.com" style="color:#4f46e5">peter15975345@gmail.com</a>
  </p>
</body></html>`;
}
