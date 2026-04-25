export type RoomType =
  | "원룸"
  | "투룸"
  | "쓰리룸"
  | "포룸이상"
  | "오피스텔"
  | "기타";

export const ROOM_TYPES: readonly RoomType[] = [
  "원룸",
  "투룸",
  "쓰리룸",
  "포룸이상",
  "오피스텔",
  "기타",
] as const;

export function isRoomType(v: string): v is RoomType {
  return (ROOM_TYPES as readonly string[]).includes(v);
}
