import type { SectionType } from "./shared";

export interface SectionStructureInsight {
  commonOrder: SectionType[];
  lengthDistribution: Partial<Record<SectionType, { p50: number; p90: number }>>;
  sampleCount: number;
}

export interface ToneProfile {
  politenessLevel: "formal" | "casual";
  emojiDensity: number;
  avgSentenceLength: number;
}

export interface CtaPattern {
  type: string;
  example: string;
  frequency: number;
}

export interface KeywordEntry {
  term: string;
  score: number;
}

export interface CategoryInsight {
  sectionStructure: SectionStructureInsight;
  toneProfile: ToneProfile;
  ctaPatterns: CtaPattern[];
  topKeywords: KeywordEntry[];
}
