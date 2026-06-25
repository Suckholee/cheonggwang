"use client";

import { useState, useEffect, useTransition, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  quoteRequestInputSchema,
  type QuoteRequestInput,
} from "@/domain/quote-schemas";
import {
  QUOTE_CATEGORIES,
  QUOTE_CATEGORY_LABELS,
  QUOTE_CATEGORY_SUBTITLES,
  type QuoteCategory,
} from "@/domain/quote-category";
import { FORM_REGION_OPTIONS } from "@/domain/region-presets";
import { PhotoUpload } from "@/components/editor/PhotoUpload";
import { submitQuoteRequest } from "@/app/actions/quote-actions";
import type { Photo } from "@/types/page";
import {
  Home,
  Building2,
  Wind,
  Truck,
  Sparkles,
  CalendarDays,
  type LucideIcon,
  ChevronDown,
  Check,
  Search,
  X,
} from "lucide-react";

declare global {
  interface Window {
    daum: any;
  }
}

// 청소 종류별 기본 단가 및 동적 추가 옵션 정의
interface CleanOption {
  key: string;
  label: string;
  price: number;
  type: "boolean" | "number";
}

interface CategoryConfig {
  pricePerPyung: {
    premium: number;
    regular: number;
    budget: number;
  };
  extraSpaces: CleanOption[];
  options: CleanOption[];
  guideText?: string;
}

const DYNAMIC_OPTIONS: Record<QuoteCategory, CategoryConfig> = {
  "move-in": {
    pricePerPyung: { premium: 15000, regular: 12000, budget: 10000 },
    extraSpaces: [
      { key: "space-veranda", label: "베란다", price: 0, type: "boolean" },
      { key: "space-loft", label: "복층", price: 0, type: "boolean" },
      { key: "space-toilet", label: "화장실 추가", price: 0, type: "number" },
      { key: "space-room", label: "방 추가", price: 0, type: "number" },
      { key: "space-kitchen", label: "주방 추가", price: 0, type: "number" },
      { key: "space-window", label: "외창/유리창 집중 청소", price: 0, type: "boolean" },
      { key: "space-light", label: "등기구 분해 세척", price: 0, type: "boolean" }
    ],
    options: [
      { key: "opt-sickHouse", label: "새집증후군 전문 케어", price: 0, type: "boolean" },
      { key: "opt-phytoncide", label: "피톤치드 살균 탈취", price: 0, type: "boolean" },
      { key: "opt-disinfect", label: "오존 살균 소독", price: 0, type: "boolean" },
      { key: "opt-joint", label: "줄눈시공", price: 0, type: "boolean" },
      { key: "opt-silicone", label: "실리콘 코팅", price: 0, type: "boolean" }
    ],
    guideText: "※ 추가공간 및 옵션 선택사항은 현장확인 후 최종 견적 반영됩니다."
  },
  office: {
    pricePerPyung: { premium: 18000, regular: 15000, budget: 12000 },
    extraSpaces: [
      { key: "space-terrace", label: "테라스/발코니", price: 0, type: "boolean" },
      { key: "space-toilet", label: "화장실", price: 0, type: "number" },
      { key: "space-meeting", label: "회의실", price: 0, type: "number" },
      { key: "space-pantry", label: "탕비실", price: 0, type: "number" }
    ],
    options: [
      { key: "opt-floor-wash", label: "바닥 기계세척", price: 0, type: "boolean" },
      { key: "opt-floor-wax", label: "바닥 고급 왁스코팅", price: 0, type: "boolean" },
      { key: "opt-window", label: "유리창 청소", price: 0, type: "boolean" },
      { key: "opt-carpet", label: "카펫 샴푸", price: 0, type: "boolean" }
    ],
    guideText: "※ 사무실/상가 청소는 현장 면적 및 집기 상태에 따라 최종 견적이 확정됩니다."
  },
  aircon: {
    pricePerPyung: { premium: 0, regular: 0, budget: 0 },
    extraSpaces: [],
    options: [
      // 에어컨 종류 (기본금액 산출용)
      { key: "wallAircon", label: "벽걸이형 에어컨 세척", price: 80000, type: "number" },
      { key: "standAircon", label: "스탠드형 에어컨 세척", price: 120000, type: "number" },
      { key: "systemAircon", label: "천장형(1way/4way) 세척", price: 150000, type: "number" },
      // 에어컨 전용 추가 옵션 (단가 0원)
      { key: "opt-disassemble", label: "완전 분해 세척", price: 0, type: "boolean" },
      { key: "opt-outdoor", label: "실외기 청소", price: 0, type: "boolean" },
      { key: "opt-mold-coat", label: "곰팡이 방지 코팅", price: 0, type: "boolean" },
      { key: "opt-eco-chem", label: "친환경 약품 사용", price: 0, type: "boolean" }
    ],
    guideText: "※ 에어컨 브랜드 및 현장 작업 조건(높이 등)에 따라 추가 비용이 발생할 수 있습니다."
  },
  "move-out": {
    pricePerPyung: { premium: 16000, regular: 13000, budget: 11000 },
    extraSpaces: [
      { key: "space-veranda", label: "베란다", price: 0, type: "boolean" },
      { key: "space-loft", label: "복층", price: 0, type: "boolean" },
      { key: "space-toilet", label: "화장실 추가", price: 0, type: "number" },
      { key: "space-room", label: "방 추가", price: 0, type: "number" },
      { key: "space-kitchen", label: "주방 추가", price: 0, type: "number" }
    ],
    options: [
      { key: "opt-mold", label: "곰팡이 완전 제거", price: 0, type: "boolean" },
      { key: "opt-window", label: "창틀/방충망 집중 케어", price: 0, type: "boolean" }
    ],
    guideText: "※ 퇴거청소 진행 시 대량의 쓰레기 배출이 필요한 경우 사전에 특이사항에 적어주세요."
  },
  special: {
    pricePerPyung: { premium: 25000, regular: 20000, budget: 15000 },
    extraSpaces: [],
    options: [
      { key: "opt-organize", label: "유품 정리", price: 0, type: "boolean" },
      { key: "opt-odor", label: "특수 탈취/오존 살균", price: 0, type: "boolean" },
      { key: "opt-demolish", label: "벽지/장판 철거", price: 0, type: "boolean" },
      { key: "opt-waste-car", label: "폐기물 차량 대수", price: 0, type: "number" }
    ],
    guideText: "※ 특수청소(화재, 누수, 고독사 등)는 현장 오염도와 오염 유형에 따라 비용이 변동될 수 있습니다."
  },
  regular: {
    pricePerPyung: { premium: 10000, regular: 8000, budget: 7000 },
    extraSpaces: [],
    options: [
      { key: "opt-waxing", label: "바닥 왁싱", price: 0, type: "boolean" },
      { key: "opt-window", label: "유리창 대청소", price: 0, type: "boolean" },
      { key: "opt-toilet", label: "화장실 정밀 청소", price: 0, type: "boolean" },
      { key: "opt-waste", label: "쓰레기 분리수거 대행", price: 0, type: "boolean" }
    ],
    guideText: "※ 정기청소는 월 구독 형태로 계약되며 방문 빈도에 따라 최종 월별 금액이 정산됩니다."
  }
};

interface AddressPreset {
  address: string;
  city: string;
  district: string;
  title: string;
  lat: number;
  lng: number;
  partners: Array<{ name: string; distance: string; status: string; rating: number }>;
}

const ADDRESS_PRESETS: AddressPreset[] = [
  {
    address: "서울특별시 서초구 서초대로 397 (부티크모나코)",
    city: "서울특별시",
    district: "서초구",
    title: "부티크모나코",
    lat: 37.4979,
    lng: 127.0276,
    partners: [
      { name: "서초베스트클린", distance: "0.8km", status: "즉시 매칭 가능", rating: 4.9 },
      { name: "반포반짝청소", distance: "2.1km", status: "방문 협의 대기", rating: 4.8 },
      { name: "강남비즈니스케어", distance: "1.5km", status: "즉시 매칭 가능", rating: 4.7 }
    ]
  },
  {
    address: "서울특별시 강남구 테헤란로 218 (아펠가모 강남)",
    city: "서울특별시",
    district: "강남구",
    title: "아펠가모 강남",
    lat: 37.5034,
    lng: 127.0415,
    partners: [
      { name: "강남비즈니스케어", distance: "0.6km", status: "즉시 매칭 가능", rating: 4.7 },
      { name: "역삼올인원클린", distance: "1.2km", status: "방문 협의 대기", rating: 4.9 },
      { name: "삼성스마트홈", distance: "2.4km", status: "즉시 매칭 가능", rating: 4.8 }
    ]
  },
  {
    address: "서울특별시 마포구 월드컵북로 396 (누리꿈스퀘어)",
    city: "서울특별시",
    district: "마포구",
    title: "누리꿈스퀘어",
    lat: 37.5794,
    lng: 126.8902,
    partners: [
      { name: "마포상암청소클럽", distance: "0.4km", status: "즉시 매칭 가능", rating: 4.8 },
      { name: "합정그린케어", distance: "1.8km", status: "즉시 매칭 가능", rating: 4.6 }
    ]
  },
  {
    address: "서울특별시 종로구 세종대로 175 (세종문화회관)",
    city: "서울특별시",
    district: "종로구",
    title: "세종문화회관",
    lat: 37.5718,
    lng: 126.9760,
    partners: [
      { name: "광화문클린시스템", distance: "0.5km", status: "즉시 매칭 가능", rating: 4.9 },
      { name: "종로역사클린", distance: "1.9km", status: "광속 대기", rating: 4.5 }
    ]
  },
  {
    address: "서울특별시 용산구 한강대로 405 (서울역)",
    city: "서울특별시",
    district: "용산구",
    title: "서울역",
    lat: 37.5559,
    lng: 126.9723,
    partners: [
      { name: "용산센트럴클린", distance: "0.9km", status: "즉시 매칭 가능", rating: 4.8 },
      { name: "숙대입구그린케어", distance: "1.6km", status: "즉시 매칭 가능", rating: 4.7 }
    ]
  },
  {
    address: "부산광역시 해운대구 센텀남대로 35 (신세계백화점 센텀시티)",
    city: "부산광역시",
    district: "해운대구",
    title: "신세계백화점 센텀시티",
    lat: 35.1689,
    lng: 129.1302,
    partners: [
      { name: "부산해운대스타", distance: "0.7km", status: "즉시 매칭 가능", rating: 4.9 },
      { name: "수영만청소마스터", distance: "2.3km", status: "방문 협의 대기", rating: 4.6 }
    ]
  }
];

function parseAddress(addr: string): { city: string; district: string } | null {
  const parts = addr.trim().split(/\s+/);
  if (parts.length < 2) return null;

  let city = "";
  const rawCity = parts[0];
  if (rawCity.startsWith("서울")) city = "서울특별시";
  else if (rawCity.startsWith("부산")) city = "부산광역시";
  else if (rawCity.startsWith("대구")) city = "대구광역시";
  else if (rawCity.startsWith("인천")) city = "인천광역시";
  else if (rawCity.startsWith("광주")) city = "광주광역시";
  else if (rawCity.startsWith("대전")) city = "대전광역시";
  else if (rawCity.startsWith("울산")) city = "울산광역시";
  else if (rawCity.startsWith("세종")) city = "세종특별자치시";
  else if (rawCity.startsWith("경기")) city = "경기도";
  else if (rawCity.startsWith("강원")) city = "강원특별자치도";
  else if (rawCity.startsWith("충북") || rawCity.startsWith("충청북도")) city = "충청북도";
  else if (rawCity.startsWith("충남") || rawCity.startsWith("충청남도")) city = "충청남도";
  else if (rawCity.startsWith("전북") || rawCity.startsWith("전라북도")) city = "전라북도";
  else if (rawCity.startsWith("전남") || rawCity.startsWith("전라남도")) city = "전라남도";
  else if (rawCity.startsWith("경북") || rawCity.startsWith("경상북도")) city = "경상북도";
  else if (rawCity.startsWith("경남") || rawCity.startsWith("경상남도")) city = "경상남도";
  else if (rawCity.startsWith("제주")) city = "제주특별자치도";

  if (!city) return null;

  let district = "";
  const rawDistrict = parts[1];
  if (parts.length > 2 && (rawDistrict.endsWith("시") || rawDistrict.endsWith("군")) && parts[2].endsWith("구")) {
    district = `${rawDistrict} ${parts[2]}`;
  } else if (rawDistrict.endsWith("시") || rawDistrict.endsWith("군") || rawDistrict.endsWith("구")) {
    district = rawDistrict;
  }

  if (!district) return null;

  return { city, district };
}

function isCompleteRoadNameAddress(addr: string): boolean {
  const clean = addr.trim();
  const parts = clean.split(/\s+/);
  if (parts.length < 3) return false;

  // 1. 시/도 확인
  const hasCityProvince = /^(서울|경기|부산|인천|대구|대전|광주|울산|세종|충청|전라|경상|강원|제주|충북|충남|전북|전남|경북|경남|특별)/.test(parts[0]);
  if (!hasCityProvince) return false;

  // 2. 구/군/시 확인
  const hasDistrict = parts.some((p, idx) => idx > 0 && idx < 3 && /(시|군|구)$/.test(p));
  if (!hasDistrict) return false;

  // 3. 도로명 + 건물번호 확인 (로/길 + 숫자)
  const hasRoadAndBuildingNum = /([로|길]\s*\d+)/.test(clean);
  if (!hasRoadAndBuildingNum) return false;

  return true;
}

function loadDaumPostcode(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined") {
      resolve();
      return;
    }
    if (window.daum?.Postcode) {
      resolve();
      return;
    }
    const script = document.createElement("script");
    script.src = "//t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js";
    script.async = true;
    script.onload = () => resolve();
    script.onerror = (e) => reject(e);
    document.head.appendChild(script);
  });
}

function InteractiveMapWidget({ address, preset }: { address: string; preset: AddressPreset | null }) {
  if (!preset) return null;

  const partners = preset.partners;

  return (
    <div className="flex flex-col">
      <div className="relative h-56 bg-zinc-100 dark:bg-zinc-950 overflow-hidden">
        {/* Real Google Maps embed iframe */}
        <iframe
          src={`https://maps.google.com/maps?q=${encodeURIComponent(address)}&t=&z=16&ie=UTF8&iwloc=&output=embed`}
          width="100%"
          height="100%"
          style={{ border: 0, filter: "contrast(1.05) saturate(1.05)" }}
          allowFullScreen
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          className="w-full h-full animate-[fade-in_0.3s_ease-out]"
        />
      </div>

      <div className="p-3.5 bg-white dark:bg-zinc-900 border-t border-zinc-150 dark:border-zinc-850 flex flex-col gap-1.5 min-h-[64px] justify-center transition-all duration-200">
        {partners.length > 0 ? (
          <div>
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="font-extrabold text-zinc-800 dark:text-zinc-200">구역 내 안심 매칭 파트너 ({partners.length}개사 대기)</span>
              <span className="inline-flex items-center gap-0.5 rounded-full bg-emerald-50 px-2 py-0.5 text-[9px] font-black text-emerald-600 border border-emerald-200/50 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900/30 animate-pulse">
                즉시 매치 가능
              </span>
            </div>
            <div className="flex flex-wrap gap-2 mt-1.5">
              {partners.map((p, idx) => (
                <span 
                  key={idx}
                  className="inline-flex items-center gap-1 rounded-xl bg-zinc-50 border border-zinc-200 px-2.5 py-1 text-[11px] font-extrabold text-zinc-700 dark:bg-zinc-950 dark:border-zinc-800 dark:text-zinc-300 shadow-xs"
                >
                  🏢 {p.name} <span className="text-[9.5px] text-zinc-400 font-bold">({p.distance})</span>
                </span>
              ))}
            </div>
          </div>
        ) : (
          <div className="text-center py-1.5">
            <p className="text-[11px] font-extrabold text-zinc-550 dark:text-zinc-400">
              구역 분석 중... 도로명 주소 입력을 완료해 주세요.
            </p>
            <p className="text-[9.5px] text-zinc-400 dark:text-zinc-500 mt-0.5">
              전체 행정 구역이 확인되면 인접한 청명 매칭망이 여기에 연동됩니다.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

interface Props {
  requestId: string;
  initialCategory?: QuoteCategory;
  /** v1.1b #2 provider-profile · "견적 요청하기" 경로에서 우선 청명 지정 */
  preferredProviderId?: string;
}

const CATEGORY_STYLE: Record<
  QuoteCategory,
  { Icon: LucideIcon; bg: string; text: string }
> = {
  "move-in": {
    Icon: Home,
    bg: "bg-blue-50/70 dark:bg-blue-950/40",
    text: "text-blue-600 dark:text-blue-400",
  },
  office: {
    Icon: Building2,
    bg: "bg-emerald-50/70 dark:bg-emerald-950/40",
    text: "text-emerald-600 dark:text-emerald-400",
  },
  aircon: {
    Icon: Wind,
    bg: "bg-sky-50/70 dark:bg-sky-950/40",
    text: "text-sky-600 dark:text-sky-400",
  },
  "move-out": {
    Icon: Truck,
    bg: "bg-violet-50/70 dark:bg-violet-950/40",
    text: "text-violet-600 dark:text-violet-400",
  },
  special: {
    Icon: Sparkles,
    bg: "bg-rose-50/70 dark:bg-rose-950/40",
    text: "text-rose-600 dark:text-rose-400",
  },
  regular: {
    Icon: CalendarDays,
    bg: "bg-amber-50/70 dark:bg-amber-950/40",
    text: "text-amber-600 dark:text-amber-400",
  },
};

export function QuoteForm({
  requestId,
  initialCategory,
  preferredProviderId,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [submitError, setSubmitError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    formState: { errors },
  } = useForm<QuoteRequestInput>({
    resolver: zodResolver(quoteRequestInputSchema),
    defaultValues: {
      requestId,
      category: initialCategory ?? "move-in",
      region: FORM_REGION_OPTIONS[0].region,
      address: "",
      size: null,
      preferredDate: null,
      contactPhone: "",
      photos: [],
      note: null,
      preferredProviderId,
    },
  });

  const category = watch("category");
  const photos = watch("photos") ?? [];
  const noteValue = watch("note") ?? "";
  const region = watch("region");
  const size = watch("size");
  const preferredDate = watch("preferredDate");
  const contactPhone = watch("contactPhone") ?? "";

  // 추가 옵션 수량 상태 관리
  const [selectedOptions, setSelectedOptions] = useState<Record<string, number>>({});

  // v1.7 견적유형 및 청소횟수 상태 추가
  const [quoteType, setQuoteType] = useState<"premium" | "regular" | "budget">("regular");
  const [frequency, setFrequency] = useState<string>("once");
  const [frequencyCount, setFrequencyCount] = useState<number>(1);

  // v1.10 - 명함 자동 완성 상태 추가
  const [isAnalyzingCard, setIsAnalyzingCard] = useState(false);
  const [cardUploaded, setCardUploaded] = useState(false);
  const [cardInfo, setCardInfo] = useState<{ company: string; name: string; phone: string; address: string } | null>(null);

  // 주소 검색 및 대화형 지도 관련 상태 추가
  const [address, setAddress] = useState("");
  const [suggestions, setSuggestions] = useState<AddressPreset[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [activePreset, setActivePreset] = useState<AddressPreset | null>(null);
  const [isOpenPostcode, setIsOpenPostcode] = useState(false);

  const handleAddressSearch = (val: string) => {
    setAddress(val);
    setValue("address", val, { shouldValidate: true });
    
    // 주소 실시간 파싱을 통한 region 바인딩
    const parsed = parseAddress(val);
    if (parsed) {
      setValue("region", { city: parsed.city, district: parsed.district }, { shouldValidate: true });
    } else {
      setValue("region", { city: "", district: "" }, { shouldValidate: true });
    }

    if (val.trim().length === 0) {
      setSuggestions(ADDRESS_PRESETS);
    } else {
      const filtered = ADDRESS_PRESETS.filter(
        (p) => p.title.includes(val) || p.address.includes(val) || p.district.includes(val)
      );
      setSuggestions(filtered);
    }
    setShowSuggestions(true);
  };

  const selectPresetAddress = (preset: AddressPreset) => {
    setAddress(preset.address);
    setValue("address", preset.address, { shouldValidate: true });
    setValue("region", { city: preset.city, district: preset.district }, { shouldValidate: true });
    setActivePreset(preset);
    setShowSuggestions(false);
  };

  const handleSearchAddressPopup = () => {
    setIsOpenPostcode(true);
  };

  const postcodeContainerRef = useCallback((node: HTMLDivElement | null) => {
    if (node !== null) {
      loadDaumPostcode()
        .then(() => {
          new window.daum.Postcode({
            oncomplete: (data: any) => {
              const fullAddr = data.roadAddress || data.address;
              setAddress(fullAddr);
              setValue("address", fullAddr, { shouldValidate: true });
              
              const parsed = parseAddress(fullAddr);
              if (parsed) {
                setValue("region", { city: parsed.city, district: parsed.district }, { shouldValidate: true });
              } else {
                let city = data.sido;
                if (city.startsWith("서울")) city = "서울특별시";
                else if (city.startsWith("부산")) city = "부산광역시";
                else if (city.startsWith("대구")) city = "대구광역시";
                else if (city.startsWith("인천")) city = "인천광역시";
                else if (city.startsWith("광주")) city = "광주광역시";
                else if (city.startsWith("대전")) city = "대전광역시";
                else if (city.startsWith("울산")) city = "울산광역시";
                else if (city.startsWith("세종")) city = "세종특별자치시";
                else if (city.startsWith("경기")) city = "경기도";
                else if (city.startsWith("강원")) city = "강원특별자치도";
                else if (city.startsWith("충북") || city.startsWith("충청북도")) city = "충청북도";
                else if (city.startsWith("충남") || city.startsWith("충청남도")) city = "충청남도";
                else if (city.startsWith("전북") || city.startsWith("전라북도")) city = "전라북도";
                else if (city.startsWith("전남") || city.startsWith("전라남도")) city = "전라남도";
                else if (city.startsWith("경북") || city.startsWith("경상북도")) city = "경상북도";
                else if (city.startsWith("경남") || city.startsWith("경상남도")) city = "경상남도";
                else if (city.startsWith("제주")) city = "제주특별자치도";
                
                setValue("region", { city, district: data.sigungu }, { shouldValidate: true });
              }
              setIsOpenPostcode(false);
            },
            width: "100%",
            height: "100%",
          }).embed(node);
        })
        .catch((err) => {
          console.error("다음 우편번호 API 로드 오류:", err);
        });
    }
  }, [setValue]);

  // 주소 실시간 파싱 및 동적 맵 핀 바인딩
  useEffect(() => {
    if (!address) {
      setActivePreset(null);
      return;
    }
    const matched = ADDRESS_PRESETS.find(
      (p) => address.includes(p.title) || address.includes(p.address)
    );
    if (matched) {
      setActivePreset(matched);
    } else {
      const parsed = parseAddress(address);
      if (parsed) {
        setActivePreset({
          address,
          city: parsed.city,
          district: parsed.district,
          title: address.split("(")[0]?.trim() || "입력한 위치",
          lat: 37.5665,
          lng: 126.9780,
          partners: [
            { name: `${parsed.district.split(" ").pop()}제일청소`, distance: "1.4km", status: "즉시 매칭 가능", rating: 4.8 },
            { name: `${parsed.district.split(" ").pop()}그린케어`, distance: "2.7km", status: "방문 협의 대기", rating: 4.6 }
          ]
        });
      } else {
        // 불완전한 도로명 주소 입력 시 임시 프리셋 (지도에 핀만 표시하고 대기 목록은 비워둠)
        setActivePreset({
          address,
          city: "서울특별시",
          district: "서초구",
          title: "위치 정보 입력 대기...",
          lat: 37.5665,
          lng: 126.9780,
          partners: []
        });
      }
    }
  }, [address]);

  // 바깥 누르면 suggestions 닫기
  useEffect(() => {
    const handleGlobalClick = () => {
      setShowSuggestions(false);
    };
    window.addEventListener("click", handleGlobalClick);
    return () => window.removeEventListener("click", handleGlobalClick);
  }, []);

  const handleCardUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsAnalyzingCard(true);
    setTimeout(() => {
      setIsAnalyzingCard(false);
      setCardUploaded(true);
      const info = {
        company: "스타트업 크림타임",
        name: "김민수 팀장",
        phone: "010-8953-2345",
        address: "서울특별시 서초구 서초대로 397 (부티크모나코)"
      };
      setCardInfo(info);
      
      // 연락처, 주소 및 특이사항 자동 완성
      setValue("contactPhone", info.phone, { shouldValidate: true });
      setAddress(info.address);
      setValue("address", info.address, { shouldValidate: true });
      setValue("region", { city: "서울특별시", district: "서초구" }, { shouldValidate: true });
      
      const currentNote = watch("note") ?? "";
      const infoText = `[명함 자동 인식 정보]\n- 회사명: ${info.company}\n- 의뢰인: ${info.name}`;
      setValue("note", currentNote ? `${infoText}\n\n${currentNote}` : infoText, { shouldValidate: true });
    }, 1500);
  };

  // (useForm hook relocated to top of component body to prevent hoisting issues)

  // 카테고리가 변경될 때마다 추가 옵션 및 횟수 리셋
  useEffect(() => {
    setSelectedOptions({});
    setFrequency("once");
    setFrequencyCount(1);
  }, [category]);

  // 실시간 기본 견적 금액 계산
  const basePricePerPyung = DYNAMIC_OPTIONS[category]?.pricePerPyung[quoteType] ?? 0;
  const currentSize = size ?? 0;
  
  let baseAmount = 0;
  if (category === "aircon") {
    // 에어컨청소는 형태별 단가 * 수량이 기본 금액입니다.
    baseAmount = Object.entries(selectedOptions).reduce((acc, [optKey, qty]) => {
      const opt = DYNAMIC_OPTIONS.aircon.options.find((o) => o.key === optKey);
      if (!opt || opt.price === 0) return acc;
      return acc + opt.price * qty;
    }, 0);
  } else {
    baseAmount = currentSize * basePricePerPyung * frequencyCount;
  }

  // 옵션 단가는 모두 제거되었으므로 0원
  const optionsAmount = 0;
  const totalAmount = baseAmount;

  function onRegionChange(value: string) {
    const option = FORM_REGION_OPTIONS.find((o) => o.value === value);
    if (option) setValue("region", option.region, { shouldValidate: true });
  }

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const clean = e.target.value.replace(/[^0-9]/g, "");
    let formatted = clean;
    if (clean.length >= 3 && clean.length < 7) {
      formatted = `${clean.slice(0, 3)}-${clean.slice(3)}`;
    } else if (clean.length >= 7 && clean.length < 11) {
      formatted = `${clean.slice(0, 3)}-${clean.slice(3, 6)}-${clean.slice(6)}`;
    } else if (clean.length >= 11) {
      formatted = `${clean.slice(0, 3)}-${clean.slice(3, 7)}-${clean.slice(7, 11)}`;
    }
    setValue("contactPhone", formatted, { shouldValidate: true });
  };

  function onSubmit(data: QuoteRequestInput) {
    setSubmitError(null);
    
    // 선택된 옵션 목록 구조화 (추가공간 + 옵션 병합)
    const optionsList: Array<{ label: string; qty: number; price: number }> = [];
    
    // 1. 추가공간 추가
    DYNAMIC_OPTIONS[data.category].extraSpaces.forEach((space) => {
      const qty = selectedOptions[space.key];
      if (qty !== undefined) {
        optionsList.push({
          label: `[추가공간] ${space.label}`,
          qty,
          price: 0
        });
      }
    });

    // 2. 옵션 추가 (에어컨 기본 서비스 종류는 실제 단가를 넘겨줌)
    DYNAMIC_OPTIONS[data.category].options.forEach((opt) => {
      const qty = selectedOptions[opt.key];
      if (qty !== undefined) {
        const isAirconBase = data.category === "aircon" && ["wallAircon", "standAircon", "systemAircon"].includes(opt.key);
        optionsList.push({
          label: isAirconBase ? opt.label : `[옵션] ${opt.label}`,
          qty,
          price: isAirconBase ? opt.price : 0
        });
      }
    });

    const finalPayload = {
      ...data,
      quoteType,
      frequency,
      frequencyCount,
      baseAmount,
      optionsAmount,
      totalAmount,
      optionsList
    };

    startTransition(async () => {
      const result = await submitQuoteRequest(finalPayload);
      if (result.ok) {
        router.push(`/quote/thanks?id=${result.data.requestId}`);
      } else {
        setSubmitError(result.message);
      }
    });
  }

  const selectedRegionValue =
    FORM_REGION_OPTIONS.find(
      (o) =>
        o.region.city === region?.city &&
        o.region.district === region?.district,
    )?.value ?? FORM_REGION_OPTIONS[0].value;

  // Count completed fields
  const completedCount = [
    !!category,
    isCompleteRoadNameAddress(address),
    size !== null && size !== undefined && size > 0,
    !!preferredDate,
    !!contactPhone && contactPhone.length >= 10,
    photos.length > 0,
    !!noteValue && noteValue.length > 0,
  ].filter(Boolean).length;
  
  const completionPercentage = Math.round((completedCount / 7) * 100);

  const SIZE_CHIPS = [
    { label: "10평 이하", value: 9 },
    { label: "10~20평", value: 15 },
    { label: "20~30평", value: 25 },
    { label: "30평 이상", value: 35 },
  ];

  const getSelectedChipValue = (val: number | null) => {
    if (val === null) return null;
    if (val <= 10) return 9;
    if (val > 10 && val <= 20) return 15;
    if (val > 20 && val <= 30) return 25;
    return 35;
  };

  const isPhoneValid = /^[0-9]{2,4}-?[0-9]{3,4}-?[0-9]{4}$/.test(contactPhone);
  const isValidForm = !!category && isCompleteRoadNameAddress(address) && !!region?.city && isPhoneValid;

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
      {/* CSS Animation Keyframes Inject */}
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes scaleIn {
          from { transform: scale(0.6); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
        @keyframes orbit {
          from { transform: rotate(0deg) translateX(56px) rotate(0deg); }
          to { transform: rotate(360deg) translateX(56px) rotate(-360deg); }
        }
        @keyframes slideUp {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        .animate-fade-in {
          animation: fadeIn 0.2s ease-out forwards;
        }
        .animate-slide-up {
          animation: slideUp 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
      `}} />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* 왼쪽 컬럼: 입력 폼 (7칸) */}
        <div className="lg:col-span-7 space-y-4">
          {/* Progress Steps Indicator */}
          <div className="rounded-[20px] border border-zinc-200/50 bg-white p-4.5 shadow-[0_6px_16px_rgba(15,23,42,0.01)] dark:border-zinc-850 dark:bg-zinc-950 flex flex-col gap-2">
            <div className="flex items-center justify-between text-xs font-bold">
              <span className="text-zinc-500 dark:text-zinc-400">견적 요청 진행률</span>
              <span className="text-[#2563EB] dark:text-[#3B82F6]">{completedCount} / 7개 완료</span>
            </div>
            <div className="h-2 w-full bg-zinc-100 rounded-full overflow-hidden dark:bg-zinc-900">
              <div 
                className="h-full bg-gradient-to-r from-[#3B82F6] to-[#2563EB] transition-all duration-300 rounded-full"
                style={{ width: `${completionPercentage}%` }}
              />
            </div>
          </div>

          {/* 카테고리 */}
          <Field 
            label="카테고리" 
            hint="6종 중 1개 선택" 
            error={errors.category?.message}
            completed={!!category}
          >
            <div className="grid grid-cols-3 gap-2">
              {QUOTE_CATEGORIES.map((c) => {
                const selected = c === category;
                const style = CATEGORY_STYLE[c];
                const Icon = style.Icon;
                return (
                  <button
                    key={c}
                    type="button"
                    onClick={() =>
                      setValue("category", c, { shouldValidate: true })
                    }
                    className={`relative flex flex-col items-center justify-center gap-1 rounded-2xl px-2 py-4 text-xs transition-all duration-205 focus:outline-none border cursor-pointer ${
                      selected
                        ? "bg-[#EFF6FF] text-zinc-950 border-[#2563EB] shadow-[0_6px_16px_rgba(37,99,235,0.08)] scale-[1.02] dark:bg-blue-950/20 dark:border-[#3B82F6] dark:text-zinc-50"
                        : "bg-white text-zinc-600 border-zinc-200 hover:border-zinc-300 hover:scale-[1.01] active:scale-[0.97] shadow-sm dark:bg-zinc-900 dark:text-zinc-400 dark:border-zinc-800"
                    }`}
                  >
                    {/* Active Check Indicator */}
                    {selected && (
                      <span className="absolute top-2 right-2 flex h-4.5 w-4.5 items-center justify-center rounded-full bg-[#2563EB] text-white animate-[scaleIn_0.15s_ease-out] dark:bg-[#3B82F6] shadow-sm z-10">
                        <Check className="h-2.5 w-2.5 stroke-[3.5]" />
                      </span>
                    )}
                    
                    <div
                      className={`flex h-11 w-11 items-center justify-center rounded-xl transition-colors ${
                        selected ? style.bg : "bg-zinc-100 dark:bg-zinc-850"
                      } ${style.text}`}
                    >
                      <Icon className="h-5 w-5" strokeWidth={2.2} />
                    </div>
                    <span className="font-extrabold mt-1 tracking-tight">{QUOTE_CATEGORY_LABELS[c]}</span>
                    <span className="text-[9.5px] font-bold text-zinc-400 dark:text-zinc-500 leading-none">
                      {QUOTE_CATEGORY_SUBTITLES[c]}
                    </span>
                  </button>
                );
              })}
            </div>
          </Field>

          {/* 견적 종류 */}
          {category !== "aircon" && (
            <Field 
              label="견적 종류" 
              hint="3가지 견적 타입 중 선택"
              completed={!!quoteType}
            >
              <div className="grid grid-cols-3 gap-2">
                {[
                  { value: "premium", label: "프리미엄 견적", desc: "인증업체 배정 / 전문 약품" },
                  { value: "regular", label: "일반 견적", desc: "표준 정밀 클리닝" },
                  { value: "budget", label: "가성비 견적", desc: "실속형 실질 클리닝" },
                ].map((type) => {
                  const selected = quoteType === type.value;
                  return (
                    <button
                      key={type.value}
                      type="button"
                      onClick={() => setQuoteType(type.value as any)}
                      className={`relative flex flex-col items-center justify-center gap-1 rounded-2xl px-2 py-3.5 text-xs transition-all duration-200 focus:outline-none border cursor-pointer ${
                        selected
                          ? "bg-[#EFF6FF] text-zinc-950 border-[#2563EB] shadow-sm dark:bg-blue-950/20 dark:border-[#3B82F6] dark:text-zinc-50"
                          : "bg-white text-zinc-650 border-zinc-200 hover:border-zinc-300 shadow-xs dark:bg-zinc-900 dark:text-zinc-400 dark:border-zinc-800"
                      }`}
                    >
                      {selected && (
                        <span className="absolute top-1.5 right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-[#2563EB] text-white dark:bg-[#3B82F6] z-10">
                          <Check className="h-2.5 w-2.5 stroke-[3.5]" />
                        </span>
                      )}
                      <span className="font-extrabold">{type.label}</span>
                      <span className="text-[9px] text-zinc-450 dark:text-zinc-500 mt-0.5 text-center leading-tight">
                        {type.desc}
                      </span>
                    </button>
                  );
                })}
              </div>
              {quoteType === "premium" && (
                <p className="mt-2 text-[10px] text-blue-600 dark:text-blue-400 font-bold">
                  * 프리미엄 청소: 손해보험(배상책임보험) 가입 전문 친환경 약품 사용, 우수 인증업체 우선 배정
                </p>
              )}
            </Field>
          )}

          {/* 청소 횟수 */}
          <Field 
            label="청소 횟수" 
            completed={!!frequency}
          >
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setFrequency("once");
                  setFrequencyCount(1);
                }}
                className={`flex-1 rounded-xl py-2.5 text-xs font-bold border transition-all cursor-pointer ${
                  frequency === "once"
                    ? "bg-[#EFF6FF] border-[#2563EB] text-zinc-950 dark:bg-blue-950/20 dark:border-[#3B82F6] dark:text-zinc-50"
                    : "bg-white border-zinc-200 text-zinc-650 hover:bg-zinc-50 dark:bg-zinc-900 dark:text-zinc-400 dark:border-zinc-800"
                }`}
              >
                1회성 청소 (한번)
              </button>
              <button
                type="button"
                onClick={() => {
                  setFrequency("regular");
                  setFrequencyCount(4); // Default to 주1회 (월 4회)
                }}
                className={`flex-1 rounded-xl py-2.5 text-xs font-bold border transition-all cursor-pointer ${
                  frequency === "regular"
                    ? "bg-[#EFF6FF] border-[#2563EB] text-zinc-950 dark:bg-blue-950/20 dark:border-[#3B82F6] dark:text-zinc-50"
                    : "bg-white border-zinc-200 text-zinc-650 hover:bg-zinc-50 dark:bg-zinc-900 dark:text-zinc-400 dark:border-zinc-800"
                }`}
              >
                정기 청소 (구독)
              </button>
            </div>
            
            {frequency === "regular" && (
              <div className="mt-3 animate-[fadeIn_0.2s_ease-out]">
                <label className="block text-[11px] font-extrabold text-zinc-500 dark:text-zinc-400 mb-1.5">
                  정기 청소 주기 선택
                </label>
                <div className="relative">
                  <select
                    value={frequencyCount}
                    onChange={(e) => setFrequencyCount(Number(e.target.value))}
                    className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-[13px] font-bold text-zinc-800 outline-none focus:border-[#2563EB] dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200 appearance-none cursor-pointer"
                  >
                    <option value={1}>월 1회 (월 1회 방문)</option>
                    <option value={4}>주 1회 (월 4회 방문)</option>
                    <option value={8}>주 2회 (월 8회 방문)</option>
                    <option value={12}>주 3회 (월 12회 방문)</option>
                    <option value={16}>주 4회 (월 16회 방문)</option>
                    <option value={20}>주 5회 (월 20회 방문)</option>
                    <option value={24}>주 6회 (월 24회 방문)</option>
                    <option value={30}>매일 (월 30회 방문)</option>
                  </select>
                  <ChevronDown className="absolute right-3.5 top-3.5 h-4 w-4 text-zinc-400 pointer-events-none" />
                </div>
              </div>
            )}
          </Field>

          {/* 명함 등록 */}
          <Field
            label="명함 등록 (선택)"
            hint="연락처/회사정보 3초 자동 완성"
            completed={cardUploaded}
          >
            <div className="relative">
              {isAnalyzingCard ? (
                <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-blue-200 bg-blue-50/10 p-6 text-center shadow-xs">
                  <div className="h-7 w-7 animate-spin rounded-full border-2 border-[#2563EB] border-t-transparent mb-2" />
                  <p className="text-[11.5px] font-semibold text-[#2563EB]">명함 이미지를 분석하여 연락처 및 사업장 정보를 입력 중입니다...</p>
                </div>
              ) : cardUploaded && cardInfo ? (
                <div className="flex items-center gap-3.5 rounded-2xl border border-emerald-200 bg-emerald-50/10 p-4 shadow-xs">
                  <div className="w-10 h-10 rounded-lg bg-emerald-50 dark:bg-zinc-800 flex items-center justify-center font-bold text-emerald-600 shrink-0 text-lg">
                    🪪
                  </div>
                  <div className="min-w-0 flex-1 text-[12.5px]">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-extrabold text-zinc-900 dark:text-zinc-50">{cardInfo.company}</span>
                      <span className="inline-flex items-center gap-0.5 rounded-full bg-emerald-50 border border-emerald-200 px-1.5 py-[0.5px] text-[9px] font-bold text-emerald-600">
                        인식 완료 ✓
                      </span>
                    </div>
                    <p className="text-zinc-650 dark:text-zinc-400 mt-0.5 font-medium">{cardInfo.name} · {cardInfo.phone}</p>
                  </div>
                  <button 
                    type="button" 
                    onClick={() => {
                      setCardUploaded(false);
                      setCardInfo(null);
                      setValue("contactPhone", "");
                    }} 
                    className="text-xs font-bold text-zinc-400 hover:text-red-500 cursor-pointer"
                  >
                    삭제
                  </button>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-zinc-200 bg-zinc-50/50 hover:bg-zinc-50 p-6 text-center cursor-pointer transition-all hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-900">
                  <span className="text-2xl mb-1.5" aria-hidden>📸</span>
                  <span className="text-xs font-bold text-zinc-700 dark:text-zinc-300">본인 명함 올리기</span>
                  <span className="text-[10px] text-zinc-400 dark:text-zinc-500 mt-1">업로드 시 이름, 연락처, 회사명이 자동 입력됩니다.</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleCardUpload}
                    className="hidden"
                  />
                </label>
              )}
            </div>
          </Field>

          {/* 서비스 받으실 위치 / 주소 */}
          <Field 
            label="서비스 받으실 도로명 주소 (위치)" 
            error={errors.address?.message}
            completed={isCompleteRoadNameAddress(address)}
          >
            <div className="space-y-3">
              {/* 주소 검색창 */}
              <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                <div className="relative flex-1">
                  <input
                    type="text"
                    placeholder="도로명 주소를 입력하세요 (예: 서초대로 397)"
                    value={address}
                    onFocus={() => setShowSuggestions(true)}
                    onChange={(e) => handleAddressSearch(e.target.value)}
                    className="w-full rounded-xl border border-zinc-200 bg-white pl-10 pr-4 py-2.5 text-[14px] font-bold text-zinc-800 outline-none transition-all placeholder-zinc-350 focus:border-[#2563EB] focus:ring-1 focus:ring-blue-100/50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200"
                  />
                  <Search className="absolute left-3.5 top-3.5 h-4 w-4 text-zinc-400" />
                  
                  {/* 주소 자동완성 / 추천 프리셋 드롭다운 */}
                  {showSuggestions && (
                    <div className="absolute left-0 right-0 top-full mt-1.5 z-20 max-h-60 overflow-y-auto rounded-xl border border-zinc-200 bg-white p-2.5 shadow-xl dark:border-zinc-800 dark:bg-zinc-900 animate-[fade-in_0.15s_ease-out]">
                      <p className="text-[10px] font-extrabold text-zinc-400 mb-1.5 px-1.5">데모 추천/검색 주소</p>
                      <div className="space-y-1">
                        {(suggestions.length > 0 ? suggestions : ADDRESS_PRESETS).map((preset) => (
                          <button
                            key={preset.address}
                            type="button"
                            onClick={() => selectPresetAddress(preset)}
                            className="w-full text-left rounded-lg px-2.5 py-2 text-xs hover:bg-zinc-50 dark:hover:bg-zinc-850 flex items-center justify-between cursor-pointer group"
                          >
                            <div className="min-w-0 flex-1">
                              <p className="font-extrabold text-zinc-800 dark:text-zinc-200 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                                {preset.title}
                              </p>
                              <p className="text-[10.5px] text-zinc-450 truncate mt-0.5">{preset.address}</p>
                            </div>
                            <span className="text-[9.5px] font-bold bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded-sm dark:bg-blue-950/30 dark:text-blue-400 shrink-0">
                              선택
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                <button
                  type="button"
                  onClick={handleSearchAddressPopup}
                  className="px-4 py-2.5 bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-[13px] font-bold rounded-xl shadow-xs transition-colors shrink-0 flex items-center justify-center cursor-pointer dark:bg-[#3B82F6] dark:hover:bg-[#2563EB]"
                >
                  주소 검색
                </button>
              </div>

              {/* 도로명 주소 실시간 검증 피드백 */}
              <div className="text-[11px] font-bold mt-1 px-1">
                {!address ? (
                  <p className="text-zinc-400 dark:text-zinc-500 leading-normal">
                    * 정확한 현장 매칭을 위해 도로명 주소(로/길)와 건물번호를 함께 입력해 주세요.
                  </p>
                ) : !isCompleteRoadNameAddress(address) ? (
                  <p className="text-amber-600 dark:text-amber-400 flex items-center gap-1 animate-pulse leading-normal">
                    {address.split(/\s+/).length < 3 || !/^(서울|경기|부산|인천|대구|대전|광주|울산|세종|충청|전라|경상|강원|제주|충북|충남|전북|전남|경북|경남|특별)/.test(address.trim().split(/\s+/)[0])
                      ? "⚠️ 시/도, 시/군/구 행정구역을 포함한 전체 주소를 입력해 주세요. (예: 경기도 남양주시 경춘북로 252)"
                      : "⚠️ 도로명(로/길)과 건물번호(숫자)를 함께 입력해 주세요. (예: 테헤란로 218)"}
                  </p>
                ) : (
                  <p className="text-emerald-600 dark:text-emerald-450 flex items-center gap-1">
                    ✓ 올바른 도로명 주소 형식입니다.
                  </p>
                )}
              </div>

              {/* 대화형 프리미엄 지도 시뮬레이터 */}
              {address && (
                <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-zinc-50 dark:border-zinc-850 dark:bg-zinc-950 shadow-xs relative">
                  <InteractiveMapWidget 
                    address={address} 
                    preset={activePreset} 
                  />
                </div>
              )}
            </div>
          </Field>


          {/* 평수 */}
          <Field 
            label={category === "aircon" ? "평수 (에어컨 청소는 선택 안 함)" : "평수 (선택)"} 
            hint="정수만 입력" 
            error={errors.size?.message}
            completed={size !== null && size !== undefined && size > 0}
          >
            <Controller
              control={control}
              name="size"
              render={({ field }) => (
                <div>
                  <input
                    type="number"
                    inputMode="numeric"
                    min={1}
                    max={500}
                    disabled={category === "aircon"}
                    placeholder={category === "aircon" ? "에어컨 청소는 평수를 입력하지 않습니다." : "예: 24"}
                    value={field.value ?? ""}
                    onChange={(e) => {
                      const v = e.target.value;
                      field.onChange(v === "" ? null : Number(v));
                    }}
                    className="w-full rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-[14px] font-bold text-zinc-800 outline-none transition-all placeholder-zinc-350 focus:border-[#2563EB] focus:ring-1 focus:ring-blue-100/50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200 disabled:bg-zinc-50 dark:disabled:bg-zinc-950"
                  />
                  
                  {/* Quick Size Select Chips */}
                  {category !== "aircon" && (
                    <div className="mt-2.5 flex flex-wrap gap-2 animate-[fade-in_0.2s_ease-out]">
                      {SIZE_CHIPS.map((chip) => {
                        const isSelected = getSelectedChipValue(field.value) === chip.value;
                        return (
                          <button
                            key={chip.value}
                            type="button"
                            onClick={() => setValue("size", chip.value, { shouldValidate: true })}
                            className={`rounded-full px-3 py-1.5 text-[11px] font-bold border transition-all duration-200 cursor-pointer ${
                              isSelected
                                ? "bg-[#2563EB] text-white border-[#2563EB] shadow-xs dark:bg-[#3B82F6] dark:border-[#3B82F6]"
                                : "bg-zinc-50 text-zinc-650 border-zinc-200 hover:bg-zinc-100 hover:border-zinc-300 dark:bg-zinc-900 dark:text-zinc-400 dark:border-zinc-800 dark:hover:bg-zinc-850"
                            }`}
                          >
                            {chip.label}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            />
          </Field>

          {/* 동적 추가 공간 필드 */}
          {DYNAMIC_OPTIONS[category]?.extraSpaces?.length > 0 && (
            <Field
              label="추가 공간 선택"
              hint="현장 견적용 추가 공간 선택 (금액합산 제외)"
              completed={DYNAMIC_OPTIONS[category].extraSpaces.some((s) => selectedOptions[s.key] !== undefined)}
            >
              <div className="space-y-2.5">
                {DYNAMIC_OPTIONS[category].extraSpaces.map((space) => {
                  const isChecked = selectedOptions[space.key] !== undefined;
                  const currentQty = selectedOptions[space.key] || 0;

                  return (
                    <div
                      key={space.key}
                      className={`flex items-center justify-between rounded-xl border p-3.5 transition-colors duration-200 ${
                        isChecked
                          ? "border-blue-200 bg-blue-50/10 dark:border-blue-900/20 dark:bg-blue-950/10"
                          : "border-zinc-150 bg-white hover:bg-zinc-50/50 dark:border-zinc-800 dark:bg-zinc-900"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          id={`space-${space.key}`}
                          checked={isChecked}
                          onChange={(e) => {
                            const checked = e.target.checked;
                            setSelectedOptions((prev) => {
                              const next = { ...prev };
                              if (checked) {
                                next[space.key] = 1;
                              } else {
                                delete next[space.key];
                              }
                              return next;
                            });
                          }}
                          className="h-4 w-4 rounded border-zinc-300 text-blue-600 focus:ring-blue-500 accent-blue-600 cursor-pointer"
                        />
                        <div>
                          <label
                            htmlFor={`space-${space.key}`}
                            className="cursor-pointer text-xs font-bold text-zinc-800 dark:text-zinc-200 block"
                          >
                            {space.label}
                          </label>
                          <span className="text-[10px] text-zinc-400 font-medium">
                            현장 실측 후 확정
                          </span>
                        </div>
                      </div>

                      {isChecked && space.type === "number" && (
                        <div className="flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white p-0.5 dark:border-zinc-800 dark:bg-zinc-950 animate-[scaleIn_0.15s_ease-out]">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedOptions((prev) => {
                                const next = { ...prev };
                                if (currentQty > 1) {
                                  next[space.key] = currentQty - 1;
                                } else {
                                  delete next[space.key];
                                }
                                return next;
                              });
                            }}
                            className="flex h-5 w-5 items-center justify-center rounded text-xs hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer"
                          >
                            -
                          </button>
                          <span className="w-5 text-center text-xs font-bold text-zinc-800 dark:text-zinc-200">
                            {currentQty}
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedOptions((prev) => {
                                const next = { ...prev };
                                next[space.key] = currentQty + 1;
                                return next;
                              });
                            }}
                            className="flex h-5 w-5 items-center justify-center rounded text-xs hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer"
                          >
                            +
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </Field>
          )}

          {/* 동적 추가 옵션 필드 */}
          {DYNAMIC_OPTIONS[category]?.options.length > 0 && (
            <Field
              label={category === "aircon" ? "에어컨 세척 종류 및 옵션" : `${QUOTE_CATEGORY_LABELS[category]} 전용 추가 옵션`}
              hint="맞춤 추가 서비스 선택"
              completed={DYNAMIC_OPTIONS[category].options.some((o) => selectedOptions[o.key] !== undefined)}
            >
              <div className="space-y-2.5">
                {category === "aircon" && (
                  <p className="text-[11px] font-bold text-blue-600 dark:text-blue-400 mb-1">
                    [기본 서비스] 세척할 에어컨 수량 선택
                  </p>
                )}

                {DYNAMIC_OPTIONS[category].options.map((opt) => {
                  const isChecked = selectedOptions[opt.key] !== undefined;
                  const currentQty = selectedOptions[opt.key] || 0;
                  const isAirconBase = category === "aircon" && ["wallAircon", "standAircon", "systemAircon"].includes(opt.key);
                  const isFirstAirconOption = category === "aircon" && opt.key === "opt-disassemble";

                  return (
                    <div key={opt.key}>
                      {isFirstAirconOption && (
                        <p className="text-[11px] font-bold text-blue-600 dark:text-blue-400 mt-4 mb-2">
                          [추가 옵션] 현장 확인용 케어 선택 (단가 0원)
                        </p>
                      )}
                      
                      <div
                        className={`flex items-center justify-between rounded-xl border p-3.5 transition-colors duration-200 ${
                          isChecked
                            ? "border-blue-200 bg-blue-50/10 dark:border-blue-900/20 dark:bg-blue-950/10"
                            : "border-zinc-150 bg-white hover:bg-zinc-50/50 dark:border-zinc-800 dark:bg-zinc-900"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            id={`opt-${opt.key}`}
                            checked={isChecked}
                            onChange={(e) => {
                              const checked = e.target.checked;
                              setSelectedOptions((prev) => {
                                const next = { ...prev };
                                if (checked) {
                                  next[opt.key] = 1;
                                } else {
                                  delete next[opt.key];
                                }
                                return next;
                              });
                            }}
                            className="h-4 w-4 rounded border-zinc-300 text-blue-600 focus:ring-blue-500 accent-blue-600 cursor-pointer"
                          />
                          <div>
                            <label
                              htmlFor={`opt-${opt.key}`}
                              className="cursor-pointer text-xs font-bold text-zinc-800 dark:text-zinc-200 block"
                            >
                              {opt.label}
                            </label>
                            <span className="text-[10px] text-zinc-400 font-medium">
                              {opt.price > 0 ? `+ ${opt.price.toLocaleString()}원` : "현장 확인 후 안내"}
                              {opt.type === "number" ? " (1개당)" : ""}
                            </span>
                          </div>
                        </div>

                        {isChecked && opt.type === "number" && (
                          <div className="flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white p-0.5 dark:border-zinc-800 dark:bg-zinc-950 animate-[scaleIn_0.15s_ease-out]">
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedOptions((prev) => {
                                  const next = { ...prev };
                                  if (currentQty > 1) {
                                    next[opt.key] = currentQty - 1;
                                  } else {
                                    delete next[opt.key];
                                  }
                                  return next;
                                });
                              }}
                              className="flex h-5 w-5 items-center justify-center rounded text-xs hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer"
                            >
                              -
                            </button>
                            <span className="w-5 text-center text-xs font-bold text-zinc-800 dark:text-zinc-200">
                              {currentQty}
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedOptions((prev) => {
                                  const next = { ...prev };
                                  next[opt.key] = currentQty + 1;
                                  return next;
                                });
                              }}
                              className="flex h-5 w-5 items-center justify-center rounded text-xs hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer"
                            >
                              +
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </Field>
          )}

          {/* 희망일 */}
          <Field 
            label="희망일 (선택)" 
            error={errors.preferredDate?.message}
            completed={!!preferredDate}
          >
            <Controller
              control={control}
              name="preferredDate"
              render={({ field }) => (
                <input
                  type="date"
                  value={field.value ? field.value.slice(0, 10) : ""}
                  onChange={(e) => {
                    const v = e.target.value;
                    field.onChange(v ? new Date(v).toISOString() : null);
                  }}
                  className="w-full rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-[14px] font-bold text-zinc-800 outline-none transition-all focus:border-[#2563EB] focus:ring-1 focus:ring-blue-100/50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200 cursor-pointer"
                />
              )}
            />
          </Field>

          {/* 연락처 */}
          <Field
            label="연락처"
            hint="010-1234-5678 형식"
            error={errors.contactPhone?.message}
            completed={!!contactPhone && contactPhone.length >= 10}
          >
            <input
              {...register("contactPhone")}
              onChange={handlePhoneChange}
              maxLength={13}
              type="tel"
              placeholder="010-1234-5678"
              className="w-full rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-[14px] font-bold text-zinc-800 outline-none transition-all placeholder-zinc-350 focus:border-[#2563EB] focus:ring-1 focus:ring-blue-100/50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200"
            />
          </Field>

          {/* 사진 */}
          <Field 
            label="사진" 
            hint="최대 3장, 대표 이미지 포함"
            completed={photos.length > 0}
          >
            <PhotoUpload
              pageId={requestId}
              pathPrefix="quote-photos"
              photos={photos}
              onChange={(next: Photo[]) =>
                setValue("photos", next, { shouldValidate: true })
              }
            />
            <p className="text-[11px] font-medium text-zinc-400 dark:text-zinc-500 mt-2.5 leading-normal">
              JPEG/PNG/WebP, 파일당 최대 5MB. 첫 번째 사진이 견적 상세 대표 사진으로 사용됩니다.
            </p>
          </Field>

          {/* 특이사항 */}
          <Field
            label="특이사항 (선택)"
            hint={`${noteValue.length} / 500`}
            error={errors.note?.message}
            completed={!!noteValue && noteValue.length > 0}
          >
            <Controller
              control={control}
              name="note"
              render={({ field }) => (
                <textarea
                  rows={4}
                  maxLength={500}
                  value={field.value ?? ""}
                  onChange={(e) => field.onChange(e.target.value || null)}
                  placeholder="반려동물 여부, 주차 가능 정보, 문 비밀번호나 상세 요청 사항을 적어주시면 상세한 맞춤 견적을 받아보실 수 있습니다."
                  className="w-full resize-none rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-[14px] font-bold text-zinc-800 outline-none transition-all placeholder-zinc-350 focus:border-[#2563EB] focus:ring-1 focus:ring-blue-100/50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200"
                />
              )}
            />
          </Field>
        </div>

        {/* 오른쪽 컬럼: 실시간 영수증 모크업 (5칸) */}
        <div className="lg:col-span-5 lg:sticky lg:top-24 mt-6 lg:mt-0">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">
              Realtime Estimate Preview
            </span>
            <span className="inline-flex items-center rounded-full bg-blue-50 px-2 py-0.5 text-[9px] font-bold text-blue-600 dark:bg-blue-950/40">
              자동 요금 합계
            </span>
          </div>

          <div
            className="relative rounded-3xl border border-zinc-200 bg-white p-6 shadow-xl dark:border-zinc-800 dark:bg-zinc-900/90"
            style={{
              backgroundImage: "radial-gradient(#2563EB05 1px, transparent 1px)",
              backgroundSize: "20px 20px"
            }}
          >
            {/* 상단 장식 효과 */}
            <div className="absolute top-0 left-6 right-6 flex justify-between -translate-y-1">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="h-2 w-2 rounded-full bg-zinc-100 dark:bg-zinc-950" />
              ))}
            </div>

            <div className="mt-2 text-center">
              <span className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-blue-600 dark:text-blue-400">
                CHG CLEANING ESTIMATE
              </span>
              <h2 className="mt-1 text-lg font-black text-zinc-950 dark:text-zinc-50">
                {QUOTE_CATEGORY_LABELS[category]} 기본 견적서
              </h2>
              <p className="mt-1 text-[9px] font-mono text-zinc-450">
                NO. {requestId.toUpperCase().slice(0, 8)}
              </p>
            </div>

            {/* 내역 명세표 */}
            <div className="mt-5 border-t-2 border-dashed border-zinc-200 pt-4 text-xs space-y-2.5 dark:border-zinc-800">
              {/* 견적 유형 표시 */}
              {category !== "aircon" && (
                <div className="flex justify-between items-start text-[11px] text-zinc-500 dark:text-zinc-400 font-bold mb-1">
                  <span>견적 타입</span>
                  <span>{quoteType === "premium" ? "프리미엄" : quoteType === "budget" ? "가성비" : "일반"}</span>
                </div>
              )}
              {/* 청소 주기 표시 */}
              <div className="flex justify-between items-start text-[11px] text-zinc-500 dark:text-zinc-400 font-bold mb-2">
                <span>청소 주기</span>
                <span>
                  {frequency === "once" 
                    ? "1회성 (한번)" 
                    : `정기 구독 (월 ${frequencyCount}회)`}
                </span>
              </div>

              {/* 기본 요금 */}
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-bold text-zinc-800 dark:text-zinc-200">기본 {QUOTE_CATEGORY_LABELS[category]}</p>
                  <span className="text-[10px] text-zinc-400">
                    {category === "aircon" 
                      ? "대수 기준 단가 적용" 
                      : `${currentSize}평 x ${basePricePerPyung.toLocaleString()}원` + (frequencyCount > 1 ? ` x 월 ${frequencyCount}회` : "")}
                  </span>
                </div>
                <span className="font-bold text-zinc-800 dark:text-zinc-200">
                  {category === "aircon" ? "0원" : `${baseAmount.toLocaleString()}원`}
                </span>
              </div>

              {/* 추가 공간 및 옵션 내역 */}
              {Object.entries(selectedOptions).map(([key, qty]) => {
                let item = DYNAMIC_OPTIONS[category].extraSpaces.find((s) => s.key === key);
                let isSpace = true;
                if (!item) {
                  item = DYNAMIC_OPTIONS[category].options.find((o) => o.key === key);
                  isSpace = false;
                }
                if (!item) return null;
                
                const isAirconBase = category === "aircon" && ["wallAircon", "standAircon", "systemAircon"].includes(item.key);
                const displayPrice = isAirconBase 
                  ? `${(item.price * qty).toLocaleString()}원` 
                  : "현장 확인";

                return (
                  <div key={item.key} className="flex justify-between items-start text-xs text-zinc-700 dark:text-zinc-300 pl-2.5 border-l-2 border-blue-200 dark:border-blue-900/60 animate-[scaleIn_0.15s_ease-out]">
                    <div>
                      <p className="font-semibold">
                        {isSpace ? `[추가공간] ${item.label}` : item.label}
                      </p>
                      {item.type === "number" && (
                        <span className="text-[9px] text-zinc-400">수량: {qty}개</span>
                      )}
                    </div>
                    <span className="font-semibold text-zinc-550">{displayPrice}</span>
                  </div>
                );
              })}
            </div>

            {/* 합계 */}
            <div className="mt-5 border-t-2 border-dashed border-zinc-200 pt-4 dark:border-zinc-800 flex justify-between items-end">
              <span className="text-xs font-bold text-zinc-850 dark:text-zinc-200">총 1차 견적 예상금</span>
              <span className="text-xl font-black text-blue-600 dark:text-blue-400">
                {totalAmount.toLocaleString()}원
              </span>
            </div>

            {/* 하단 면책 및 홍보 */}
            <div className="mt-6 border-t border-zinc-100 pt-4 text-center dark:border-zinc-850">
              {DYNAMIC_OPTIONS[category]?.guideText && (
                <p className="text-[10px] font-bold text-blue-700 bg-blue-50/50 py-1.5 px-2 rounded-lg dark:text-blue-400 dark:bg-blue-950/20 leading-normal mb-2">
                  {DYNAMIC_OPTIONS[category].guideText}
                </p>
              )}
              <p className="text-[9px] leading-4 text-zinc-400 text-left">
                ※ 본 견적서는 현장 방문 전 기본 사항을 바탕으로 작성된 것으로, 실제 청소업체(청명)의 현장 실측 상태에 따라 최종 요금이 달라질 수 있습니다.
              </p>
            </div>
          </div>
        </div>
      </div>

      {submitError && (
        <p className="rounded-2xl bg-red-50 border border-red-100 px-4 py-3 text-sm font-semibold text-red-700 dark:bg-red-950/30 dark:border-red-900/50 dark:text-red-300">
          ⚠️ {submitError}
        </p>
      )}

      {/* Sticky Bottom CTA Button Area */}
      <div className="sticky bottom-[64px] z-30 -mx-5 bg-gradient-to-t from-[#F9FAFB] via-[#F9FAFB]/95 to-transparent px-5 pt-6 pb-4 dark:from-zinc-950 dark:via-zinc-950/95">
        <button
          type="submit"
          disabled={isPending || !isValidForm}
          className={`w-full flex items-center justify-center gap-2 rounded-2xl px-4 py-3.5 text-sm font-extrabold active:scale-[0.98] active:translate-y-[2px] transition-all duration-300 cursor-pointer ${
            isValidForm
              ? "bg-gradient-to-b from-[#3B82F6] to-[#2563EB] text-white hover:from-[#4F8FF7] hover:to-[#2A6DF0] shadow-[0_8px_20px_rgba(37,99,235,0.2)] border-b-4 border-[#1D4ED8] dark:border-[#1E40AF]"
              : "bg-zinc-100 text-zinc-400 border border-zinc-200 cursor-not-allowed border-b-4 border-b-zinc-300 dark:bg-zinc-900 dark:border-zinc-800 dark:border-b-zinc-950 dark:text-zinc-600"
          }`}
        >
          {isPending ? "제출 중..." : "견적 요청 제출"}
        </button>
      </div>

      {/* Full Screen Matching Animation Overlay */}
      {isPending && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-white/95 dark:bg-zinc-950/95 backdrop-blur-md animate-[page-fade-in_0.25s_ease-out]">
          <div className="relative flex flex-col items-center max-w-xs text-center px-4">
            {/* Radar glow */}
            <div className="absolute w-32 h-32 bg-blue-500/10 rounded-full blur-xl animate-pulse" />
            
            {/* Rotating / Pulsing Graphic */}
            <div className="relative w-28 h-28 flex items-center justify-center bg-gradient-to-tr from-blue-50 to-indigo-50 dark:from-zinc-900 dark:to-zinc-850 rounded-full border border-blue-100 dark:border-zinc-800 shadow-[inset_0_2px_6px_rgba(0,0,0,0.03)] mb-6">
              <Home className="h-12 w-12 text-blue-600 dark:text-blue-400 animate-[bounce_2s_infinite]" />
              
              {/* Orbiter container */}
              <div 
                className="absolute"
                style={{
                  animation: "orbit 4s linear infinite",
                }}
              >
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-white shadow-md border border-zinc-150 dark:bg-zinc-800 dark:border-zinc-700">
                  <Search className="h-4 w-4 text-blue-500 dark:text-blue-400" />
                </div>
              </div>
              
              <Sparkles className="absolute top-4 right-4 h-5 w-5 text-amber-400 animate-pulse" />
              <Sparkles className="absolute bottom-5 left-4 h-4 w-4 text-amber-300 animate-pulse delay-500" />
            </div>

            <h3 className="text-base font-extrabold text-zinc-950 dark:text-zinc-50 tracking-tight">
              청광 매니저 매칭 분석 중
            </h3>
            
            <p className="mt-2 text-[11px] text-zinc-650 dark:text-zinc-400 leading-relaxed font-semibold">
              고객님의 1차 견적 요청 접수 후,<br />
              청광이 조건에 최적화된 인증 파트너를 분류하고 있습니다.
            </p>
            <p className="mt-1.5 text-[10.5px] text-zinc-450 dark:text-zinc-500 leading-normal">
              접수 즉시 청광 매니저가 내용을 검토하여 연락을 드리며,<br />
              매치 가능한 우수 청명 파트너 풀이 대기방에 연동됩니다.
            </p>

            {/* Simple dot-flashing indicator */}
            <div className="mt-6 flex gap-1.5 items-center justify-center">
              <span className="w-2 h-2 rounded-full bg-blue-600 dark:bg-blue-400 animate-[bounce_1s_infinite]" />
              <span className="w-2 h-2 rounded-full bg-blue-500 dark:bg-blue-400 animate-[bounce_1s_infinite_0.2s]" />
              <span className="w-2 h-2 rounded-full bg-blue-400 dark:bg-blue-500 animate-[bounce_1s_infinite_0.4s]" />
            </div>
          </div>
        </div>
      )}

      {/* 다음 우편번호 모달 */}
      {isOpenPostcode && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/60 backdrop-blur-xs p-0 md:p-4 animate-fade-in">
          {/* backdrop click overlay */}
          <div className="absolute inset-0" onClick={() => setIsOpenPostcode(false)} />
          
          {/* 모달 카드 */}
          <div className="relative w-full md:max-w-lg bg-white dark:bg-zinc-900 rounded-t-3xl md:rounded-3xl shadow-2xl flex flex-col max-h-[85vh] md:max-h-[90vh] overflow-hidden animate-slide-up">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4.5 border-b border-zinc-100 dark:border-zinc-800">
              <span className="text-base font-extrabold text-zinc-950 dark:text-zinc-50">
                주소 검색
              </span>
              <button
                type="button"
                onClick={() => setIsOpenPostcode(false)}
                className="p-1 rounded-lg text-zinc-400 hover:text-zinc-650 hover:bg-zinc-100 dark:hover:text-zinc-200 dark:hover:bg-zinc-800 cursor-pointer transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            {/* Embed Target Container */}
            <div className="flex-1 bg-zinc-50 dark:bg-zinc-950 min-h-[450px] md:min-h-[480px] relative">
              <div 
                ref={postcodeContainerRef} 
                className="w-full h-[450px] md:h-[480px]"
              />
            </div>
          </div>
        </div>
      )}
    </form>
  );
}

function Field({
  label,
  hint,
  error,
  completed,
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  completed?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className={`flex flex-col gap-2 rounded-[24px] border p-4.5 shadow-[0_8px_20px_rgba(15,23,42,0.015)] transition-all duration-300 ${
      completed
        ? "border-blue-200/80 bg-blue-50/5 dark:border-blue-900/30 bg-white dark:bg-zinc-950"
        : "border-zinc-200/50 bg-white dark:border-zinc-850 dark:bg-zinc-950"
    }`}>
      <span className="flex items-baseline justify-between">
        <span className="flex items-center gap-1.5">
          <span className="text-[14px] font-extrabold text-zinc-900 dark:text-zinc-50">
            {label}
          </span>
          {completed && (
            <span className="inline-flex items-center gap-0.5 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-extrabold text-emerald-600 border border-emerald-200/60 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900/50 animate-[scaleIn_0.2s_ease-out]">
              완료 ✓
            </span>
          )}
        </span>
        {hint && !completed && (
          <span className="text-[11px] font-bold text-zinc-400 dark:text-zinc-500">
            {hint}
          </span>
        )}
      </span>
      <div className="mt-1">{children}</div>
      {error && (
        <span className="text-xs font-semibold text-red-600 dark:text-red-400 mt-1 flex items-center gap-1">
          ⚠️ {error}
        </span>
      )}
    </div>
  );
}
