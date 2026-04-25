/**
 * v1.2 #1 chat — 공용 상대 시간 표기 util.
 * 기존 provider-dashboard `RequestPreviewCard`의 inline 구현을 추출 · 재사용.
 */
export function formatRelativeTime(
  ms: number,
  now: number = Date.now(),
): string {
  const diff = now - ms;
  const min = Math.max(0, Math.floor(diff / 60_000));
  if (min < 1) return "방금 전";
  if (min < 60) return `${min}분 전`;
  const hour = Math.floor(min / 60);
  if (hour < 24) return `${hour}시간 전`;
  const day = Math.floor(hour / 24);
  if (day < 7) return `${day}일 전`;
  return new Date(ms).toLocaleDateString("ko-KR");
}
