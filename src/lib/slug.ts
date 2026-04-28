/**
 * v1.4 #1 provider-promo-content — 한글 포함 slug 생성.
 * Unicode regex `\p{L}\p{N}` requires ES2018+ target.
 */
export function titleToSlug(title: string): string {
  const slug = title
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s-]/gu, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 30);
  return slug || "post";
}

/**
 * v1.17 cycle #30 cleaning-tips-content · §3.11 (NEW-L8 결의)
 *
 * 표준 slug helper — `posts.slug == candidate` 충돌 회피.
 * Math.random 4자 suffix (functions/auto-series/lib/slug.ts와 동일 알고리즘).
 *
 * adminDb를 인자로 받아 server-only 의존성 회피 (테스트 가능).
 */
export async function uniqueSlug(
  db: import("firebase-admin/firestore").Firestore,
  title: string,
  maxTries = 3,
): Promise<string> {
  const base = titleToSlug(title);
  for (let i = 0; i < maxTries; i++) {
    const suffix = Math.random().toString(36).slice(2, 6);
    const candidate = `${base}-${suffix}`;
    const exists = await db
      .collection("posts")
      .where("slug", "==", candidate)
      .limit(1)
      .get();
    if (exists.empty) return candidate;
  }
  throw new Error("SLUG_CONFLICT — 슬러그 충돌이 반복되어 생성을 중단했습니다");
}
