export type Category = "restaurant" | "salon" | "cafe";

export type SectionType =
  | "hero"
  | "intro"
  | "highlights"
  | "hygiene"
  | "location"
  | "cta";

export interface HeroSection {
  title: string;
  subtitle: string;
}

export interface IntroSection {
  body: string;
}

export interface HighlightsSection {
  items: string[];
}

export interface HygieneSection {
  body: string;
}

export interface LocationSection {
  mapEmbed: string;
}

export interface CtaSection {
  label: string;
  link: string;
}

export interface Sections {
  hero: HeroSection;
  intro: IntroSection;
  highlights: HighlightsSection;
  hygiene: HygieneSection | null;
  location: LocationSection;
  cta: CtaSection;
}

export function emptySections(): Sections {
  return {
    hero: { title: "", subtitle: "" },
    intro: { body: "" },
    highlights: { items: [] },
    hygiene: null,
    location: { mapEmbed: "" },
    cta: { label: "", link: "" },
  };
}

export interface Photo {
  url: string;
  path: string;
  order: number;
}

export interface Region {
  city: string;
  district: string;
}

export interface Page {
  id: string;
  ownerUid: string;
  category: Category;
  businessName: string;
  address: string;
  phone: string;
  keyPoints: string[];
  photos: Photo[];
  sections: Sections;
  slug: string | null;
  published: boolean;
  /** promo-feed v1 — LLM이 ALL_TAGS 내에서 3~5개 추출. 기존 데이터는 빈 배열. */
  tags: string[];
  /** promo-feed v1 — address에서 parseRegion. 실패 시 null. */
  region: Region | null;
  createdAt: Date;
  updatedAt: Date;
}

export function emptyRegion(): Region | null {
  return null;
}

export type UserRole = "client" | "provider";

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  isCheonggwangPartner: boolean;
  partnerCleaningFrequency?: string;
  /** Marketplace v1 — 최초 견적 제출 시 'client' 자동 추가. 기존 데이터는 빈 배열. */
  roles?: UserRole[];
  /** v1.1 provider-signup — 1:1 링크 (provider role 있을 때만 set) */
  providerId?: string;
  /** v1.1 provider-signup — 사용자 연락처 (기본 숨김, provider-profile-editor에서 노출 토글) */
  contactPhone?: string;
  createdAt: Date;
}

export interface TrendKeywords {
  keywords: string[];
  updatedAt: Date;
  sourceWeek: string;
}
