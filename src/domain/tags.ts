export const TAG_TIME = [
  "#아침",
  "#점심",
  "#오후",
  "#저녁",
  "#야식",
] as const;

export const TAG_COMPANION = [
  "#혼밥",
  "#데이트",
  "#가족",
  "#부모님",
  "#친구모임",
  "#회식",
] as const;

export const TAG_MOOD = [
  "#조용한",
  "#활기찬",
  "#인스타감성",
  "#가성비",
  "#프리미엄",
] as const;

export const ALL_TAGS: readonly string[] = [
  ...TAG_TIME,
  ...TAG_COMPANION,
  ...TAG_MOOD,
];

export type TagTime = (typeof TAG_TIME)[number];
export type TagCompanion = (typeof TAG_COMPANION)[number];
export type TagMood = (typeof TAG_MOOD)[number];
export type Tag = TagTime | TagCompanion | TagMood;

export const TAG_TAXONOMY = {
  time: TAG_TIME,
  companion: TAG_COMPANION,
  mood: TAG_MOOD,
} as const;

export const MIN_TAGS_PER_POST = 3;
export const MAX_TAGS_PER_POST = 5;

/** §1.2 hygiene 격리: 태그에서 절대 등장해선 안 될 어휘 정규식. */
export const HYGIENE_PATTERN = /청소|청결|위생|방역|살균|세척|소독/;

export function isValidTag(value: string): value is Tag {
  return (ALL_TAGS as readonly string[]).includes(value);
}

/** 서버에서 LLM 결과를 2차 방어: enum 재확인 + hygiene 필터 + max 5개. */
export function sanitizeTags(raw: readonly string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const t of raw) {
    if (typeof t !== "string") continue;
    if (!isValidTag(t)) continue;
    if (HYGIENE_PATTERN.test(t)) continue;
    if (seen.has(t)) continue;
    seen.add(t);
    result.push(t);
    if (result.length >= MAX_TAGS_PER_POST) break;
  }
  return result;
}
