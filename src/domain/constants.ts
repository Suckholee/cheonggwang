export const MAX_PHOTOS = 3;
export const MIN_KEY_POINTS = 3;
export const MAX_KEY_POINTS = 5;
export const MAX_BUSINESS_NAME = 40;
export const MAX_ADDRESS = 120;
export const MAX_KEY_POINT_LENGTH = 60;
export const MAX_PHOTO_SIZE_BYTES = 5 * 1024 * 1024;

export const SESSION_COOKIE_NAME = "session";
export const SESSION_COOKIE_MAX_AGE_SEC = 60 * 60 * 24 * 5; // 5 days

export const RATE_LIMIT_PER_MIN = 5;
export const RATE_LIMIT_BUCKET_MS = 60_000;
export const RATE_LIMIT_TTL_MS = 120_000;

export const SLUG_MAX_ATTEMPTS = 5;
export const SLUG_SUFFIX_LENGTH = 6;

export const SECTION_MAX_LENGTHS = {
  heroTitle: 30,
  heroSubtitle: 60,
  introBody: 180,
  highlightItem: 40,
  hygieneBody: 140,
  ctaLabel: 10,
} as const;

export const HYGIENE_KEYWORDS = [
  "청소",
  "청결",
  "위생",
  "방역",
  "살균",
  "세척",
  "소독",
] as const;

export const CATEGORY_LABELS = {
  restaurant: "음식점",
  salon: "미용실",
  cafe: "카페",
} as const;
