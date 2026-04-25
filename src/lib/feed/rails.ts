export type TimeContext =
  | "morning"
  | "lunch"
  | "afternoon"
  | "evening"
  | "latenight";

export type RailMatch =
  | { kind: "tags-any"; tags: readonly string[] }
  | { kind: "region" }
  | { kind: "freshness"; withinDays: number };

export interface RailDef {
  id: string;
  /** "{district}" placeholder 지원 (region 레일) */
  title: string;
  match: RailMatch;
  /** 설정되면 현재 시각과 일치할 때만 렌더. */
  timeContext?: TimeContext;
  /** 레일 내 게시글 개수 상한 (기본 20). */
  sizeLimit?: number;
}

/**
 * 7개 레일 구성:
 *   - 5개 time-contextual (현재 시각 매칭 1개만 노출)
 *   - 6개 static (항상 렌더, 빈 레일은 숨김)
 *
 * v0.2 (I6): `solo`에서 `#조용한` 제거. 다른 컨셉 레일과 중복되어
 *            솔로 레일 의도가 흐려짐. `#조용한`은 ALL_TAGS엔 유지
 *            (검색·카드 표시용 descriptor).
 */
export const RAILS: readonly RailDef[] = [
  {
    id: "morning",
    title: "아침에 가기 좋은",
    match: { kind: "tags-any", tags: ["#아침"] },
    timeContext: "morning",
  },
  {
    id: "lunch",
    title: "점심에 가기 좋은",
    match: { kind: "tags-any", tags: ["#점심"] },
    timeContext: "lunch",
  },
  {
    id: "afternoon",
    title: "오후에 가기 좋은",
    match: { kind: "tags-any", tags: ["#오후"] },
    timeContext: "afternoon",
  },
  {
    id: "evening",
    title: "저녁에 가기 좋은",
    match: { kind: "tags-any", tags: ["#저녁"] },
    timeContext: "evening",
  },
  {
    id: "latenight",
    title: "야식하기 좋은",
    match: { kind: "tags-any", tags: ["#야식"] },
    timeContext: "latenight",
  },
  {
    id: "nearby",
    title: "당신 근처 — {district}",
    match: { kind: "region" },
  },
  {
    id: "parents",
    title: "부모님과 가기 좋은",
    match: { kind: "tags-any", tags: ["#부모님", "#가족"] },
  },
  {
    id: "solo",
    title: "혼밥하기 좋은",
    match: { kind: "tags-any", tags: ["#혼밥"] },
  },
  {
    id: "date",
    title: "분위기 좋은 데이트",
    match: { kind: "tags-any", tags: ["#데이트", "#프리미엄"] },
  },
  {
    id: "insta",
    title: "인스타에 올리기 좋은",
    match: { kind: "tags-any", tags: ["#인스타감성"] },
  },
  {
    id: "recent",
    title: "최근 발행",
    match: { kind: "freshness", withinDays: 14 },
  },
];
