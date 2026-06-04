export type Category = "restaurant" | "salon" | "cafe" | (string & {});

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
  tags: string[];
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
  roles?: UserRole[];
  providerId?: string;
  contactPhone?: string;
  createdAt: Date;
}

export interface TrendKeywords {
  keywords: string[];
  updatedAt: Date;
  sourceWeek: string;
}
