import type { Page, Region } from "@/types/page";
import type { RailDef } from "./rails";

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

export function matchesRail(
  post: Page,
  rail: RailDef,
  userRegions?: Region[]
): boolean {
  switch (rail.match.kind) {
    case "tags-any":
      return rail.match.tags.some((t) => post.tags.includes(t));
    case "region":
      if (!userRegions || userRegions.length === 0 || !post.region) return false;
      return userRegions.some(
        (ur) =>
          post.region!.city === ur.city &&
          post.region!.district === ur.district
      );
    case "freshness": {
      const ms = rail.match.withinDays * 24 * 60 * 60 * 1000;
      return Date.now() - post.updatedAt.getTime() < ms;
    }
  }
}

interface Scored {
  post: Page;
  score: number;
}

/**
 * Netflix-inspired within-row ranking.
 *  ① 매칭 태그 수 × 10 (많이 매치될수록 먼저)
 *  ② freshness boost (+1 if updated within 7 days)
 *  ③ 동률이면 updatedAt desc
 *  ④ diversity: 같은 ownerUid 연속 금지
 */
export function rankRailPosts(
  posts: readonly Page[],
  rail: RailDef,
  userRegions?: Region[]
): Page[] {
  const now = Date.now();
  const scored: Scored[] = posts
    .filter((p) => matchesRail(p, rail, userRegions))
    .map((p) => {
      const matchCount =
        rail.match.kind === "tags-any"
          ? rail.match.tags.filter((t) => p.tags.includes(t)).length
          : 0;
      const freshBoost = now - p.updatedAt.getTime() < WEEK_MS ? 1 : 0;
      return { post: p, score: matchCount * 10 + freshBoost };
    })
    .sort(
      (a, b) =>
        b.score - a.score ||
        b.post.updatedAt.getTime() - a.post.updatedAt.getTime()
    );

  const limit = rail.sizeLimit ?? 20;
  const result: Page[] = [];
  for (const { post } of scored) {
    if (result[result.length - 1]?.ownerUid === post.ownerUid) continue;
    result.push(post);
    if (result.length >= limit) break;
  }
  return result;
}
