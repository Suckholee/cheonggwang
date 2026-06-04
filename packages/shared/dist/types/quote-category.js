"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.QUOTE_CATEGORY_EMOJIS = exports.QUOTE_CATEGORY_SUBTITLES = exports.QUOTE_CATEGORY_LABELS = exports.QUOTE_CATEGORIES = void 0;
exports.isQuoteCategory = isQuoteCategory;
exports.QUOTE_CATEGORIES = [
    "move-in",
    "office",
    "aircon",
    "move-out",
    "special",
    "regular",
];
exports.QUOTE_CATEGORY_LABELS = {
    "move-in": "입주청소",
    office: "사무실청소",
    aircon: "에어컨청소",
    "move-out": "이사청소",
    special: "특수청소",
    regular: "정기청소",
};
exports.QUOTE_CATEGORY_SUBTITLES = {
    "move-in": "이사 전·후",
    office: "주1·격주·월1",
    aircon: "분해 청소",
    "move-out": "쓰레기 정리",
    special: "곰팡이·해충",
    regular: "월 구독",
};
exports.QUOTE_CATEGORY_EMOJIS = {
    "move-in": "🏠",
    office: "🏢",
    aircon: "❄️",
    "move-out": "🚚",
    special: "✨",
    regular: "📆",
};
function isQuoteCategory(v) {
    return exports.QUOTE_CATEGORIES.includes(v);
}
