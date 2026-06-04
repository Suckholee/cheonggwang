"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getTodayKstStart = getTodayKstStart;
exports.currentKstSeason = currentKstSeason;
exports.firstDayOfMonthKst = firstDayOfMonthKst;
const auto_publish_window_1 = require("./auto-publish-window");
function getTodayKstStart(now = new Date()) {
    const wall = (0, auto_publish_window_1.toKstWallClock)(now);
    return new Date(Date.UTC(wall.year, wall.month, wall.date, -9, 0, 0, 0));
}
function currentKstSeason(now = new Date()) {
    const wall = (0, auto_publish_window_1.toKstWallClock)(now);
    const m = wall.month + 1;
    if (m >= 3 && m <= 5)
        return "spring";
    if (m >= 6 && m <= 8)
        return "summer";
    if (m >= 9 && m <= 11)
        return "fall";
    return "winter";
}
function firstDayOfMonthKst(now = new Date()) {
    const wall = (0, auto_publish_window_1.toKstWallClock)(now);
    return new Date(Date.UTC(wall.year, wall.month, 1, -9, 0, 0, 0));
}
