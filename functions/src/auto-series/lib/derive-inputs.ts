import type { AutoSeriesAngle, Partner } from "./types";

/**
 * v1.13 cycle #26 · §3.3 — derive-inputs functions 측 복제.
 *
 * v1.14 cycle #27 (C1) — photoCursor 분리. queue 편집과 무관하게 사진 라운드 로빈.
 *
 * ⚠️ MIRROR of src/lib/auto-series/derive-inputs.ts — keep in sync
 */

export interface DerivedAutoInputs {
  keywords: string[];
  photoUrls: string[];
}

export type DeriveResult = DerivedAutoInputs | { error: "photo-missing" };

export function deriveAutoInputs(
  partner: Partner,
  angle: AutoSeriesAngle,
): DeriveResult {
  const photos = partner.profile?.photoUrls ?? [];
  if (photos.length === 0) return { error: "photo-missing" };

  const photoCursor = partner.autoSeries?.photoCursor ?? 0;
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
