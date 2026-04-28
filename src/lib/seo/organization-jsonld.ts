/**
 * v1.15 cycle #28 partner-aeo-boost · §3.3 (S2).
 *
 * Organization JSON-LD — 전역 layout에서 1회 출력.
 * sameAs는 NEXT_PUBLIC_BRAND_SAME_AS 환경변수 (JSON array string)에서 파싱.
 * 잘못된 형식이면 sameAs 자체를 omit (M7 결의).
 *
 * H3 결의: layout.tsx의 export const metadata는 sync. async getBaseUrl 호출 불가.
 * 환경변수 직접 사용 + hardcoded fallback.
 */

export interface OrganizationJsonLd {
  "@context": "https://schema.org";
  "@type": "Organization";
  name: "청광";
  url: string;
  logo: string;
  description: string;
  areaServed: "KR";
  sameAs?: string[];
}

const FALLBACK_BASE = "https://www.cheonggwang.kr";

function getBase(): string {
  return (process.env.NEXT_PUBLIC_BASE_URL || FALLBACK_BASE).replace(/\/$/, "");
}

function parseSameAs(): string[] | undefined {
  try {
    const raw = process.env.NEXT_PUBLIC_BRAND_SAME_AS;
    if (!raw) return undefined;
    const v = JSON.parse(raw);
    if (!Array.isArray(v)) return undefined;
    const filtered = v.filter((s): s is string => typeof s === "string");
    return filtered.length > 0 ? filtered : undefined;
  } catch {
    return undefined;
  }
}

export function buildOrganizationJsonLd(): OrganizationJsonLd {
  const base = getBase();
  const sameAs = parseSameAs();
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "청광",
    url: base,
    logo: `${base}/logo.png`,
    description: "청소 견적 마켓플레이스",
    areaServed: "KR",
    ...(sameAs ? { sameAs } : {}),
  };
}
