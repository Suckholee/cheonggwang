"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.emptySections = emptySections;
exports.emptyRegion = emptyRegion;
function emptySections() {
    return {
        hero: { title: "", subtitle: "" },
        intro: { body: "" },
        highlights: { items: [] },
        hygiene: null,
        location: { mapEmbed: "" },
        cta: { label: "", link: "" },
    };
}
function emptyRegion() {
    return null;
}
