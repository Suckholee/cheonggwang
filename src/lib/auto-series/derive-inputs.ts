import type { Partner } from "@/types/partner";
import type { AutoSeriesAngle } from "@/domain/auto-series-angle";

/**
 * v1.13 cycle #26 partner-auto-series · §3.3.
 *
 * angle별 keyword/photo 자동 도출.
 *  - usp    → partner.profile.usps[0..2]
 *  - menu   → partner.profile.priceItems[0..1].name
 *  - review → ['고객 후기', businessName]
 *  - event  → ['신규 오픈', '특별 할인']
 *  - story  → ['매장 이야기', regionLabel ?? businessName]
 *
 * photoUrls — partner.profile.photoUrls에서 lastIndex offset으로 라운드 로빈 1~2장.
 * photoUrls가 비어있으면 { error: 'photo-missing' } 반환.
 *
 * Next.js 측 + functions 측 모두에서 동일 로직 사용 (Option A 복제 시 functions/src/auto-series/lib/derive-inputs.ts에 미러).
 */

export interface DerivedAutoInputs {
  keywords: string[];
  photoUrls: string[];
}

export type DeriveResult =
  | DerivedAutoInputs
  | { error: "photo-missing" };

export function deriveAutoInputs(
  partner: Partner,
  angle: AutoSeriesAngle,
): DeriveResult {
  const photos = partner.profile?.photoUrls ?? [];
  if (photos.length === 0) {
    return { error: "photo-missing" };
  }

  const lastIndex = partner.autoSeries?.lastIndex ?? 0;
  // 음수 lastIndex 보호 + 라운드 로빈 offset
  const offset = ((lastIndex % photos.length) + photos.length) % photos.length;
  const photoUrls = [
    photos[offset],
    photos[(offset + 1) % photos.length],
  ].slice(0, Math.min(2, photos.length));

  const keywords = pickKeywordsByAngle(angle, partner);
  return { keywords, photoUrls };
}

function pickKeywordsByAngle(
  angle: AutoSeriesAngle,
  partner: Partner,
): string[] {
  const profile = partner.profile;
  switch (angle) {
    case "usp":
      return profile?.usps?.slice(0, 3) ?? [partner.businessName, "추천"];
    case "menu":
      return (profile?.priceItems ?? [])
        .slice(0, 2)
        .map((p) => p.name)
        .filter((s): s is string => Boolean(s));
    case "review":
      return ["고객 후기", partner.businessName];
    case "event":
      return ["신규 오픈", "특별 할인"];
    case "story":
      return ["매장 이야기", partner.regionLabel ?? partner.businessName];
  }
}
