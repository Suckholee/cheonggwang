"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CATEGORY_LABELS = exports.HYGIENE_KEYWORDS = exports.SECTION_MAX_LENGTHS = exports.SLUG_SUFFIX_LENGTH = exports.SLUG_MAX_ATTEMPTS = exports.RATE_LIMIT_TTL_MS = exports.RATE_LIMIT_BUCKET_MS = exports.RATE_LIMIT_PER_MIN = exports.SESSION_COOKIE_MAX_AGE_SEC = exports.SESSION_COOKIE_NAME = exports.MAX_PHOTO_SIZE_BYTES = exports.MAX_KEY_POINT_LENGTH = exports.MAX_ADDRESS = exports.MAX_BUSINESS_NAME = exports.MAX_KEY_POINTS = exports.MIN_KEY_POINTS = exports.MAX_PHOTOS = void 0;
exports.MAX_PHOTOS = 3;
exports.MIN_KEY_POINTS = 3;
exports.MAX_KEY_POINTS = 5;
exports.MAX_BUSINESS_NAME = 40;
exports.MAX_ADDRESS = 120;
exports.MAX_KEY_POINT_LENGTH = 60;
exports.MAX_PHOTO_SIZE_BYTES = 5 * 1024 * 1024;
exports.SESSION_COOKIE_NAME = "session";
exports.SESSION_COOKIE_MAX_AGE_SEC = 60 * 60 * 24 * 5; // 5 days
exports.RATE_LIMIT_PER_MIN = 5;
exports.RATE_LIMIT_BUCKET_MS = 60_000;
exports.RATE_LIMIT_TTL_MS = 120_000;
exports.SLUG_MAX_ATTEMPTS = 5;
exports.SLUG_SUFFIX_LENGTH = 6;
exports.SECTION_MAX_LENGTHS = {
    heroTitle: 30,
    heroSubtitle: 60,
    introBody: 180,
    highlightItem: 40,
    hygieneBody: 140,
    ctaLabel: 10,
};
exports.HYGIENE_KEYWORDS = [
    "청소",
    "청결",
    "위생",
    "방역",
    "살균",
    "세척",
    "소독",
];
exports.CATEGORY_LABELS = {
    restaurant: "음식점",
    salon: "미용실",
    cafe: "카페",
};
