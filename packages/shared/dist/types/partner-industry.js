"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PARTNER_INDUSTRY_LABELS = exports.PARTNER_INDUSTRIES = void 0;
exports.isPartnerIndustry = isPartnerIndustry;
exports.PARTNER_INDUSTRIES = [
    "cafe",
    "restaurant",
    "hair-salon",
    "academy",
    "office",
    "pet-clinic",
    "optical",
    "bakery",
    "other",
];
exports.PARTNER_INDUSTRY_LABELS = {
    cafe: "카페",
    restaurant: "음식점",
    "hair-salon": "헤어샵",
    academy: "학원",
    office: "사무실·코워킹",
    "pet-clinic": "동물병원·펫샵",
    optical: "안경원",
    bakery: "베이커리",
    other: "기타",
};
function isPartnerIndustry(v) {
    return exports.PARTNER_INDUSTRIES.includes(v);
}
