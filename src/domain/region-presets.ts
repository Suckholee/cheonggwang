import { decodeRegionParam } from "./region";

/**
 * promo-feed와 quote-request 공유 지역 프리셋 (14개).
 * value 포맷: `{city}|{district}` — `decodeRegionParam`으로 파싱.
 */
export const REGION_PRESETS: ReadonlyArray<{ label: string; value: string }> = [
  { label: "전국", value: "" },
  { label: "서울 강남구", value: "서울특별시|강남구" },
  { label: "서울 서초구", value: "서울특별시|서초구" },
  { label: "서울 마포구", value: "서울특별시|마포구" },
  { label: "서울 종로구", value: "서울특별시|종로구" },
  { label: "서울 용산구", value: "서울특별시|용산구" },
  { label: "서울 성동구", value: "서울특별시|성동구" },
  { label: "부산 해운대구", value: "부산광역시|해운대구" },
  { label: "부산 수영구", value: "부산광역시|수영구" },
  { label: "대구 중구", value: "대구광역시|중구" },
  { label: "인천 연수구", value: "인천광역시|연수구" },
  { label: "경기 성남시 분당구", value: "경기도|성남시 분당구" },
  { label: "경기 수원시", value: "경기도|수원시" },
  { label: "경기 용인시", value: "경기도|용인시" },
];

/** 폼 제출용: "전국"(빈 값) 제외 + 파싱된 region 객체 */
export const FORM_REGION_OPTIONS: ReadonlyArray<{
  label: string;
  value: string;
  region: { city: string; district: string };
}> = REGION_PRESETS.filter((p) => p.value !== "").map((p) => {
  const region = decodeRegionParam(p.value)!;
  return { label: p.label, value: p.value, region };
});
