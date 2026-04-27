import type { Firestore } from "firebase-admin/firestore";

/**
 * v1.13 cycle #26 · §4.3 (C3 결의) — slug helper functions 측 복제.
 *
 * ⚠️ MIRROR of src/lib/slug.ts (titleToSlug) + src/app/api/partner/posts/route.ts (uniqueSlug 로직)
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

function shortRandom(): string {
  return Math.random().toString(36).slice(2, 6);
}

/**
 * uniqueSlug — `posts.slug == candidate` 충돌 회피.
 * functions 측은 nanoid 의존성 추가 회피하기 위해 Math.random 기반 4자 suffix.
 * R8 검증 영역 아니므로 충분.
 */
export async function uniqueSlug(
  db: Firestore,
  title: string,
  maxTries = 3,
): Promise<string> {
  const base = titleToSlug(title);
  for (let i = 0; i < maxTries; i++) {
    const candidate = `${base}-${shortRandom()}`;
    const exists = await db
      .collection("posts")
      .where("slug", "==", candidate)
      .limit(1)
      .get();
    if (exists.empty) return candidate;
  }
  throw new Error("SLUG_CONFLICT — 슬러그 충돌이 반복되어 생성을 중단했습니다");
}
