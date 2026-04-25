import { parseRegion } from "../src/domain/region";
import { normalizeSearchQuery } from "../src/lib/feed/search";
import { currentTimeContext } from "../src/lib/feed/time-context";
import { sanitizeTags } from "../src/domain/tags";

const tests: Array<[string, unknown]> = [
  ["parseRegion 서울특별시 강남구", parseRegion("서울특별시 강남구 테헤란로 123")],
  ["parseRegion 경기도 성남시 분당구", parseRegion("경기도 성남시 분당구 백현로")],
  ["parseRegion 경기도 수원시 (구 없음)", parseRegion("경기도 수원시 팔달로")],
  ["parseRegion 서울 강남구 (normalize)", parseRegion("서울 강남구")],
  ["parseRegion 제주특별자치도 서귀포시", parseRegion("제주특별자치도 서귀포시 일주동로")],
  ["parseRegion 강남구만 (실패)", parseRegion("강남구 테헤란로")],
  ["parseRegion 공백 없음 (실패)", parseRegion("서울특별시강남구")],
  ["normalizeSearchQuery '#오후'", normalizeSearchQuery("#오후")],
  ["normalizeSearchQuery '  #가성비  '", normalizeSearchQuery("  #가성비  ")],
  ["currentTimeContext UTC 05:00 → KST 14 (afternoon)", currentTimeContext(new Date("2026-04-20T05:00:00Z"))],
  ["currentTimeContext UTC 21:00 → KST 06 (morning)", currentTimeContext(new Date("2026-04-20T21:00:00Z"))],
  ["sanitizeTags 혼합", sanitizeTags(["#오후", "#청소", "#가성비", "위생", "#not_valid"])],
];

for (const [label, result] of tests) {
  console.log(`${label} =>`, JSON.stringify(result));
}
