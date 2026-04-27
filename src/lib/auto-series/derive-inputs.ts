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
 * photoUrls — partner.profile.photoUrls에서 photoCursor offset으로 라운드 로빈 1~2장.
 * photoUrls가 비어있으면 { error: 'photo-missing' } 반환.
 *
 * v1.14 cycle #27 (C1 결의) — photoCursor 분리:
 *   이전: lastIndex 사용 → queue 편집 시 photoCursor도 점프 (의도치 않은 동작).
 *   현재: photoCursor 사용 → queue 편집과 무관하게 사진 라운드 로빈 유지.
 *   호출자(runner.ts)는 성공 발행 후 photoCursor++ 별도로 증분.
 *
 * Next.js 측 + functions 측 모두에서 동일 로직 사용 (functions/src/auto-series/lib/derive-inputs.ts 미러, CI lint로 동기화 보장).
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

  const photoCursor = partner.autoSeries?.photoCursor ?? 0;
  // 음수 photoCursor 보호 + 라운드 로빈 offset
  const offset =
    ((photoCursor % photos.length) + photos.length) % photos.length;
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
