import "server-only";
import type { Page } from "@/types/page";

/**
 * v1.15 cycle #28 partner-aeo-boost · §3.2 (S2, C3 결의).
 *
 * LocalBusiness JSON-LD 빌더. /p/[slug] 매장 페이지에서 사용.
 *
 * 입력: Page 모델 (B2C 사장님 홍보 페이지) — Partner 모델 아님 (C3 결의).
 * 매핑: page.businessName/address/phone/region/photos/sections.intro 직접 활용.
 *
 * optional 필드 omit 정책 (schema.org 권장):
 *   - address가 비어있으면 PostalAddress 자체 omit
 *   - telephone, areaServed, image, description은 데이터 없으면 omit
 */

export interface LocalBusinessJsonLd {
  "@context": "https://schema.org";
  "@type": "LocalBusiness";
  name: string;
  image?: string;
  url: string;
  description?: string;
  address?: {
    "@type": "PostalAddress";
    streetAddress?: string;
    addressLocality?: string;
    addressRegion?: string;
    addressCountry: "KR";
  };
  telephone?: string;
  areaServed?: string;
}

export function buildLocalBusinessJsonLd(
  page: Page,
  base: string,
): LocalBusinessJsonLd {
  const slug = page.slug ?? page.id;
  const url = `${base.replace(/\/$/, "")}/p/${encodeURIComponent(slug)}`;
  const image = page.photos[0]?.url || undefined;
  const description = page.sections.intro.body
    ? page.sections.intro.body.slice(0, 300)
    : undefined;

  const address = page.address
    ? {
        "@type": "PostalAddress" as const,
        streetAddress: page.address,
        addressLocality: page.region?.district,
        addressRegion: page.region?.city,
        addressCountry: "KR" as const,
      }
    : undefined;

  const telephone = page.phone || undefined;
  const areaServed = page.region
    ? `${page.region.city ?? ""} ${page.region.district ?? ""}`.trim() ||
      undefined
    : undefined;

  return {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    name: page.businessName,
    ...(image ? { image } : {}),
    url,
    ...(description ? { description } : {}),
    ...(address ? { address } : {}),
    ...(telephone ? { telephone } : {}),
    ...(areaServed ? { areaServed } : {}),
  };
}
