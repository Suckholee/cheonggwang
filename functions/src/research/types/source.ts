import type { Category } from "./shared";

export type SourceType = "naver" | "tistory" | "wordpress";

export interface RawSource {
  urlHash: string;
  url: string;
  sourceType: SourceType;
  title: string;
  snippet: string;
  body?: string;
  tags: string[];
  author?: string;
  publishedAt?: Date;
  collectedAt: Date;
  rawPayload: Record<string, unknown>;
}

export interface NormalizedSource extends RawSource {
  detectedCategory: Category;
  confidence: number;
}

export interface AdapterResult {
  sourceType: SourceType;
  sources: RawSource[];
  errors: string[];
}
