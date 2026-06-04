export declare const MAX_PHOTOS = 3;
export declare const MIN_KEY_POINTS = 3;
export declare const MAX_KEY_POINTS = 5;
export declare const MAX_BUSINESS_NAME = 40;
export declare const MAX_ADDRESS = 120;
export declare const MAX_KEY_POINT_LENGTH = 60;
export declare const MAX_PHOTO_SIZE_BYTES: number;
export declare const SESSION_COOKIE_NAME = "session";
export declare const SESSION_COOKIE_MAX_AGE_SEC: number;
export declare const RATE_LIMIT_PER_MIN = 5;
export declare const RATE_LIMIT_BUCKET_MS = 60000;
export declare const RATE_LIMIT_TTL_MS = 120000;
export declare const SLUG_MAX_ATTEMPTS = 5;
export declare const SLUG_SUFFIX_LENGTH = 6;
export declare const SECTION_MAX_LENGTHS: {
    readonly heroTitle: 30;
    readonly heroSubtitle: 60;
    readonly introBody: 180;
    readonly highlightItem: 40;
    readonly hygieneBody: 140;
    readonly ctaLabel: 10;
};
export declare const HYGIENE_KEYWORDS: readonly ["청소", "청결", "위생", "방역", "살균", "세척", "소독"];
export declare const CATEGORY_LABELS: {
    readonly restaurant: "음식점";
    readonly salon: "미용실";
    readonly cafe: "카페";
};
