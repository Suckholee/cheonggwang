/**
 * 사용자 입력 변이형 → 표준화 명칭 맵.
 * v0.2 design §8 사전 전체 구현.
 */
const CITY_NORMALIZE: Record<string, string> = {
  서울: "서울특별시",
  서울시: "서울특별시",
  서울특별시: "서울특별시",
  부산: "부산광역시",
  부산시: "부산광역시",
  부산광역시: "부산광역시",
  대구: "대구광역시",
  대구시: "대구광역시",
  대구광역시: "대구광역시",
  인천: "인천광역시",
  인천시: "인천광역시",
  인천광역시: "인천광역시",
  광주: "광주광역시",
  광주시: "광주광역시",
  광주광역시: "광주광역시",
  대전: "대전광역시",
  대전시: "대전광역시",
  대전광역시: "대전광역시",
  울산: "울산광역시",
  울산시: "울산광역시",
  울산광역시: "울산광역시",
  세종: "세종특별자치시",
  세종시: "세종특별자치시",
  세종특별자치시: "세종특별자치시",
  경기: "경기도",
  경기도: "경기도",
  강원: "강원특별자치도",
  강원도: "강원특별자치도",
  강원특별자치도: "강원특별자치도",
  충북: "충청북도",
  충청북도: "충청북도",
  충남: "충청남도",
  충청남도: "충청남도",
  전북: "전북특별자치도",
  전라북도: "전북특별자치도",
  전북특별자치도: "전북특별자치도",
  전남: "전라남도",
  전라남도: "전라남도",
  경북: "경상북도",
  경상북도: "경상북도",
  경남: "경상남도",
  경상남도: "경상남도",
  제주: "제주특별자치도",
  제주도: "제주특별자치도",
  제주특별자치도: "제주특별자치도",
};

/**
 * 도 단위 (3-level: 도 → 시 → 구/군).
 * I2 fix — "경기도 성남시 분당구" 같은 주소 처리.
 */
const DO_NAMES: ReadonlySet<string> = new Set([
  "경기도",
  "강원특별자치도",
  "충청북도",
  "충청남도",
  "전북특별자치도",
  "전라남도",
  "경상북도",
  "경상남도",
  "제주특별자치도",
]);

/**
 * 한국 주소 파서 (v0.2).
 * A) 특별시·광역시·특별자치시: [시] [구|군]
 * B) 도: [도] [시] [구|군]?
 *
 * 실패 시 null — "최근 발행" 레일에만 노출.
 */
export function parseRegion(
  address: string
): { city: string; district: string } | null {
  const tokens = address.trim().split(/\s+/).filter(Boolean);
  if (tokens.length < 2) return null;

  const firstNorm = CITY_NORMALIZE[tokens[0]] ?? tokens[0];

  if (DO_NAMES.has(firstNorm)) {
    const si = tokens[1];
    if (!/시$/.test(si)) return null;
    const gu = tokens[2] && /[구군]$/.test(tokens[2]) ? tokens[2] : null;
    return { city: firstNorm, district: gu ? `${si} ${gu}` : si };
  }

  const districtToken = tokens[1];
  if (!/[구군]$/.test(districtToken)) return null;
  return { city: firstNorm, district: districtToken };
}

export const KNOWN_CITIES: readonly string[] = Array.from(
  new Set(Object.values(CITY_NORMALIZE))
);

/** URL query param "서울특별시|강남구" → { city, district } */
export function decodeRegionParam(
  param: string | undefined
): { city: string; district: string } | null {
  if (!param) return null;
  const [city, district] = param.split("|");
  if (!city || !district) return null;
  return { city, district };
}

export function encodeRegionParam(
  region: { city: string; district: string } | null
): string | undefined {
  if (!region) return undefined;
  return `${region.city}|${region.district}`;
}
