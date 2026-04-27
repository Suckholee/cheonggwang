/**
 * v1.12 cycle #25 partner-content-formats · §1.1 #4 + M2 결의.
 *
 * `\n@@SLIDE@@\n` sentinel로 카드뉴스 본문을 슬라이드 배열로 분할.
 * 첫 슬라이드 앞·마지막 슬라이드 뒤의 sentinel(BOF/EOF)도 허용.
 *
 * markdown HR(`\n---\n`)와 충돌 회피용으로 distinct sentinel 사용 (M2).
 */
export function parseCardNewsSlides(body: string): string[] {
  if (!body) return [];

  // 정규식: `@@SLIDE@@`만 적힌 줄 (앞뒤 newline) — BOF/EOF 친화 처리
  const slides = body
    .split(/\n[ \t]*@@SLIDE@@[ \t]*\n/g)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  return slides;
}
