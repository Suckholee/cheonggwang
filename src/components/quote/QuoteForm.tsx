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
  QUOTE_CATEGORY_EMOJIS,
  type QuoteCategory,
} from "@/domain/quote-category";
import { CLEAN_SERVICES_CONFIG, type SubServiceConfig } from "@/domain/clean-services-config";
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
  Hammer,
  Shield,
  HelpCircle,
  Factory,
  ChevronDown,
  Check,
  Search,
  X,
  type LucideIcon,
} from "lucide-react";

declare global {
  interface Window {
    daum: any;
  }
}

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

  const hasCityProvince = /^(서울|경기|부산|인천|대구|대전|광주|울산|세종|충청|전라|경상|강원|제주|특별)/.test(parts[0]);
  if (!hasCityProvince) return false;

  const hasDistrict = parts.some((p, idx) => idx > 0 && idx < 3 && /(시|군|구)$/.test(p));
  if (!hasDistrict) return false;

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
    script.src = "https://t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js";
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
          </div>
        )}
      </div>
    </div>
  );
}

const CATEGORY_STYLE: Record<
  QuoteCategory,
  { Icon: LucideIcon; bg: string; text: string }
> = {
  residential: { Icon: Home, bg: "bg-blue-50/70 dark:bg-blue-950/40", text: "text-blue-600 dark:text-blue-400" },
  regular: { Icon: CalendarDays, bg: "bg-amber-50/70 dark:bg-amber-950/40", text: "text-amber-600 dark:text-amber-400" },
  construction: { Icon: Hammer, bg: "bg-orange-50/70 dark:bg-orange-950/40", text: "text-orange-600 dark:text-orange-400" },
  exterior: { Icon: Building2, bg: "bg-indigo-50/70 dark:bg-indigo-950/40", text: "text-indigo-600 dark:text-indigo-400" },
  sanitation: { Icon: Shield, bg: "bg-emerald-50/70 dark:bg-emerald-950/40", text: "text-emerald-600 dark:text-emerald-400" },
  specialist: { Icon: Sparkles, bg: "bg-rose-50/70 dark:bg-rose-950/40", text: "text-rose-600 dark:text-rose-455" },
  lodging: { Icon: Home, bg: "bg-violet-50/70 dark:bg-violet-950/40", text: "text-violet-600 dark:text-violet-400" },
  industrial: { Icon: Factory, bg: "bg-teal-50/70 dark:bg-teal-950/40", text: "text-teal-600 dark:text-teal-400" },
  special: { Icon: Sparkles, bg: "bg-purple-50/70 dark:bg-purple-950/40", text: "text-purple-600 dark:text-purple-400" },
  etc: { Icon: Building2, bg: "bg-zinc-100/70 dark:bg-zinc-800/40", text: "text-zinc-650 dark:text-zinc-300" },
};

interface Props {
  requestId: string;
  initialCategory?: QuoteCategory;
  preferredProviderId?: string;
}

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
      clientName: "",
      category: initialCategory ?? "residential",
      subService: "",
      region: FORM_REGION_OPTIONS[0].region,
      address: "",
      size: null,
      preferredDate: null,
      preferredTime: "오전 09:00",
      hasElevator: "no",
      parkingAvailable: "discuss",
      contactPhone: "",
      photos: [],
      note: "",
      preferredProviderId,
    },
  });

  const category = watch("category");
  const subService = watch("subService");
  const photos = watch("photos") ?? [];
  const noteValue = watch("note") ?? "";
  const region = watch("region");
  const size = watch("size");
  const preferredDate = watch("preferredDate");
  const preferredTime = watch("preferredTime");
  const hasElevator = watch("hasElevator");
  const parkingAvailable = watch("parkingAvailable");
  const clientName = watch("clientName");
  const contactPhone = watch("contactPhone") ?? "";

  // 동적 추가 옵션 / 공간 / 추가 필드 상태 관리
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string | boolean>>({});
  const [selectedExtraSpaces, setSelectedExtraSpaces] = useState<Record<string, boolean>>({});
  const [dynamicFields, setDynamicFields] = useState<Record<string, string>>({});

  // 정기청소 및 요금 가성비/프리미엄 토글
  const [quoteType, setQuoteType] = useState<"premium" | "regular" | "budget">("regular");
  const [frequency, setFrequency] = useState<string>("once");
  const [frequencyCount, setFrequencyCount] = useState<number>(1);

  // 명함 자동 완성 상태
  const [isAnalyzingCard, setIsAnalyzingCard] = useState(false);
  const [cardUploaded, setCardUploaded] = useState(false);

  // 주소 관련 상태
  const [address, setAddress] = useState("");
  const [suggestions, setSuggestions] = useState<AddressPreset[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [activePreset, setActivePreset] = useState<AddressPreset | null>(null);
  const [isOpenPostcode, setIsOpenPostcode] = useState(false);

  // 카테고리별 하위 서비스 목록 추출
  const availableServices = Object.values(CLEAN_SERVICES_CONFIG).filter(
    (s) => s.category === category
  );

  // 카테고리 변경 시 subService 및 옵션 상태 리셋
  useEffect(() => {
    const firstService = Object.values(CLEAN_SERVICES_CONFIG).find((s) => s.category === category);
    setValue("subService", firstService?.key ?? "");
    setSelectedOptions({});
    setSelectedExtraSpaces({});
    setDynamicFields({});
  }, [category, setValue]);

  // 세부 서비스 변경 시 옵션 상태 리셋
  useEffect(() => {
    setSelectedOptions({});
    setSelectedExtraSpaces({});
    setDynamicFields({});
  }, [subService]);

  const activeServiceConfig: SubServiceConfig | undefined = CLEAN_SERVICES_CONFIG[subService];

  // 요금 계산 공식 바인딩
  const calculatePrice = () => {
    if (!activeServiceConfig) return 0;
    
    let baseQty = size ?? 0;
    
    // Formula Types: pyung | pyung_min_25 | count | vehicle | floor | fixed
    let baseAmount = 0;
    const formula = activeServiceConfig.priceFormulaType;
    const unitPrice = activeServiceConfig.unitPrice;

    if (formula === "pyung_min_25") {
      baseAmount = Math.max(25, baseQty) * unitPrice;
    } else if (formula === "pyung" || formula === "count" || formula === "vehicle" || formula === "floor") {
      baseAmount = baseQty * unitPrice;
    } else if (formula === "fixed") {
      baseAmount = unitPrice;
    }

    // Apply Quote Type Multipliers (Premium: 1.2, Budget: 0.85)
    if (quoteType === "premium") {
      baseAmount = Math.round(baseAmount * 1.2);
    } else if (quoteType === "budget") {
      baseAmount = Math.round(baseAmount * 0.85);
    }

    // Apply Regular Cleaning Discount & Frequency Multiplier
    if (category === "regular" && frequency === "regular") {
      let discount = 0;
      if (frequencyCount >= 16) discount = 0.20; // 주 4회 이상 (월 16회+)
      else if (frequencyCount >= 12) discount = 0.15; // 주 3회 (월 12회)
      else if (frequencyCount >= 8) discount = 0.10;  // 주 2회 (월 8회)
      else if (frequencyCount >= 4) discount = 0.05;  // 주 1회 (월 4회)

      baseAmount = Math.round(baseAmount * frequencyCount * (1 - discount));
    }

    return baseAmount;
  };

  const calculatedBasePrice = calculatePrice();
  const calculatedTotalAmount = calculatedBasePrice; // Live 옵션금액은 0원 연동 사양

  const handleAddressSearch = (val: string) => {
    setAddress(val);
    setValue("address", val, { shouldValidate: true });
    
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
                
                setValue("region", { city, district: data.sigungu }, { shouldValidate: true });
              }
              setIsOpenPostcode(false);
            },
            width: "100%",
            height: "100%",
          }).embed(node);
        })
        .catch((err) => {
          console.error("Daum postcode API load error:", err);
        });
    }
  }, [setValue]);

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
            { name: `${parsed.district.split(" ").pop()} 제일청소`, distance: "1.4km", status: "즉시 매칭 가능", rating: 4.8 },
            { name: `${parsed.district.split(" ").pop()} 그린케어`, distance: "2.7km", status: "방문 협의 대기", rating: 4.6 }
          ]
        });
      }
    }
  }, [address]);

  useEffect(() => {
    const handleGlobalClick = () => {
      setShowSuggestions(false);
    };
    window.addEventListener("click", handleGlobalClick);
    return () => window.removeEventListener("click", handleGlobalClick);
  }, []);

  useEffect(() => {
    if (isOpenPostcode) {
      const handleTouchStart = () => {};
      document.addEventListener("touchstart", handleTouchStart, { passive: true });
      return () => {
        document.removeEventListener("touchstart", handleTouchStart);
      };
    }
  }, [isOpenPostcode]);

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
      
      setValue("clientName", info.name, { shouldValidate: true });
      setValue("contactPhone", info.phone, { shouldValidate: true });
      setAddress(info.address);
      setValue("address", info.address, { shouldValidate: true });
      setValue("region", { city: "서울특별시", district: "서초구" }, { shouldValidate: true });
      setValue("note", `[명함 자동 인식 정보]\n- 회사명: ${info.company}\n- 의뢰인: ${info.name}`, { shouldValidate: true });
    }, 1500);
  };

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

  const onSubmit = (data: QuoteRequestInput) => {
    setSubmitError(null);
    
    // 추가공간 및 옵션 선택사항 구조화
    const optionsList: Array<{ label: string; qty: number; price: number }> = [];
    
    // 1. 추가공간 데이터 가공
    Object.entries(selectedExtraSpaces).forEach(([spaceKey, isSelected]) => {
      if (isSelected && activeServiceConfig) {
        const space = activeServiceConfig.extraSpaces.find((s) => s.key === spaceKey);
        if (space) {
          optionsList.push({
            label: `[추가공간] ${space.label}`,
            qty: 1,
            price: 0
          });
        }
      }
    });

    // 2. 옵션 데이터 가공
    Object.entries(selectedOptions).forEach(([optKey, val]) => {
      if (val && activeServiceConfig) {
        const opt = activeServiceConfig.options.find((o) => o.key === optKey);
        if (opt) {
          const qtyLabel = typeof val === "string" ? ` (${val})` : "";
          optionsList.push({
            label: `[옵션] ${opt.label}${qtyLabel}`,
            qty: 1,
            price: 0
          });
        }
      }
    });

    // 3. 세부 상세 필드(방개수 등)는 note에 덧붙여서 보존
    let enrichedNote = data.note ?? "";
    if (Object.keys(dynamicFields).length > 0 && activeServiceConfig) {
      const fieldsText = Object.entries(dynamicFields)
        .map(([fKey, fVal]) => {
          const field = activeServiceConfig.fields.find((f) => f.key === fKey);
          return `${field?.label ?? fKey}: ${fVal}`;
        })
        .join(", ");
      
      enrichedNote = `[상세 조건] ${fieldsText}\n\n${enrichedNote}`;
    }

    const finalPayload = {
      ...data,
      note: enrichedNote.trim() || null,
      quoteType,
      frequency,
      frequencyCount: frequency === "regular" ? frequencyCount : 1,
      baseAmount: calculatedBasePrice,
      optionsAmount: 0,
      totalAmount: calculatedTotalAmount,
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
  };

  const completedCount = [
    !!clientName,
    !!category,
    !!subService,
    isCompleteRoadNameAddress(address),
    size !== null && size !== undefined && size > 0,
    !!preferredDate,
    !!contactPhone && contactPhone.length >= 10,
  ].filter(Boolean).length;
  
  const completionPercentage = Math.round((completedCount / 7) * 100);

  const isPhoneValid = /^[0-9]{2,4}-?[0-9]{3,4}-?[0-9]{4}$/.test(contactPhone);
  const isValidForm = !!clientName && !!category && !!subService && isCompleteRoadNameAddress(address) && isPhoneValid;

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
              ) : cardUploaded ? (
                <div className="flex items-center gap-3.5 rounded-2xl border border-emerald-200 bg-emerald-50/10 p-4 shadow-xs">
                  <div className="w-10 h-10 rounded-lg bg-emerald-50 dark:bg-zinc-800 flex items-center justify-center font-bold text-emerald-600 shrink-0 text-lg">
                    🪪
                  </div>
                  <div className="min-w-0 flex-1 text-[12.5px]">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-extrabold text-zinc-900 dark:text-zinc-50">{clientName} 고객님</span>
                      <span className="inline-flex items-center gap-0.5 rounded-full bg-emerald-50 border border-emerald-200 px-1.5 py-[0.5px] text-[9px] font-bold text-emerald-600">
                        인식 완료 ✓
                      </span>
                    </div>
                    <p className="text-zinc-650 dark:text-zinc-400 mt-0.5 font-medium">{contactPhone}</p>
                  </div>
                  <button 
                    type="button" 
                    onClick={() => {
                      setCardUploaded(false);
                      setValue("clientName", "");
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

          {/* 공통 고객 접수 정보 (상단 추가) */}
          <div className="p-5 bg-white border border-zinc-200 rounded-[24px] shadow-sm space-y-4 dark:bg-zinc-950 dark:border-zinc-850">
            <h3 className="text-sm font-black text-zinc-900 dark:text-zinc-100 border-b pb-2 mb-2">공통 고객 접수 정보</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* 고객명 */}
              <div>
                <label className="block text-[11px] font-extrabold text-zinc-500 mb-1">고객명 *</label>
                <input
                  {...register("clientName")}
                  type="text"
                  placeholder="예: 홍길동"
                  className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-[13px] font-bold text-zinc-800 outline-none focus:border-[#2563EB] dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200"
                />
                {errors.clientName?.message && <span className="text-[10px] text-red-500">{errors.clientName.message}</span>}
              </div>

              {/* 연락처 */}
              <div>
                <label className="block text-[11px] font-extrabold text-zinc-500 mb-1">연락처 *</label>
                <input
                  {...register("contactPhone")}
                  onChange={handlePhoneChange}
                  maxLength={13}
                  type="tel"
                  placeholder="010-1234-5678"
                  className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-[13px] font-bold text-zinc-800 outline-none focus:border-[#2563EB] dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200"
                />
                {errors.contactPhone?.message && <span className="text-[10px] text-red-500">{errors.contactPhone.message}</span>}
              </div>
            </div>

            {/* 서비스 받으실 위치 / 주소 */}
            <div>
              <label className="block text-[11px] font-extrabold text-zinc-500 mb-1">서비스 받으실 도로명 주소 *</label>
              <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                <input
                  type="text"
                  placeholder="도로명 주소를 입력하세요 (예: 서초대로 397)"
                  value={address}
                  onFocus={() => setShowSuggestions(true)}
                  onChange={(e) => handleAddressSearch(e.target.value)}
                  className="flex-1 rounded-xl border border-zinc-200 bg-white px-3 py-2 text-[13px] font-bold text-zinc-800 outline-none focus:border-[#2563EB] dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200"
                />
                <button
                  type="button"
                  onClick={handleSearchAddressPopup}
                  className="px-3 py-2 bg-[#2563EB] text-white text-[12px] font-bold rounded-xl hover:bg-blue-700 transition"
                >
                  주소 검색
                </button>
              </div>

              {/* 주소 제안 */}
              {showSuggestions && suggestions.length > 0 && (
                <div className="mt-1.5 z-20 max-h-40 overflow-y-auto rounded-xl border border-zinc-200 bg-white p-2 shadow-xl dark:border-zinc-800 dark:bg-zinc-900">
                  {suggestions.map((preset) => (
                    <button
                      key={preset.address}
                      type="button"
                      onClick={() => selectPresetAddress(preset)}
                      className="w-full text-left rounded-lg px-2.5 py-2 text-xs hover:bg-zinc-50 dark:hover:bg-zinc-850 flex items-center justify-between cursor-pointer"
                    >
                      <div>
                        <p className="font-extrabold text-zinc-800 dark:text-zinc-200">{preset.title}</p>
                        <p className="text-[10px] text-zinc-450 truncate">{preset.address}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              <div className="text-[10px] font-bold mt-1">
                {address && !isCompleteRoadNameAddress(address) ? (
                  <p className="text-amber-600">⚠️ 도로명(로/길)과 건물번호(숫자)를 함께 전체 형식으로 기재해 주세요.</p>
                ) : address ? (
                  <p className="text-emerald-600">✓ 올바른 도로명 주소 형식입니다.</p>
                ) : null}
              </div>

              {address && (
                <div className="overflow-hidden rounded-xl border border-zinc-200 bg-zinc-50 mt-2">
                  <InteractiveMapWidget address={address} preset={activePreset} />
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* 작업희망일 */}
              <div>
                <label className="block text-[11px] font-extrabold text-zinc-500 mb-1">작업희망일 *</label>
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
                      className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-[13px] font-bold text-zinc-800 outline-none focus:border-[#2563EB] dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200"
                    />
                  )}
                />
              </div>

              {/* 작업희망시간 */}
              <div>
                <label className="block text-[11px] font-extrabold text-zinc-500 mb-1">작업희망시간 *</label>
                <select
                  {...register("preferredTime")}
                  className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-[13px] font-bold text-zinc-800 outline-none focus:border-[#2563EB] dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200"
                >
                  <option value="오전 09:00">오전 09:00</option>
                  <option value="오전 10:00">오전 10:00</option>
                  <option value="오전 11:00">오전 11:00</option>
                  <option value="오후 12:00">오후 12:00</option>
                  <option value="오후 01:00">오후 01:00</option>
                  <option value="오후 02:00">오후 02:00</option>
                  <option value="오후 03:00">오후 03:00</option>
                  <option value="오후 04:00">오후 04:00</option>
                  <option value="야간/협의">야간/시간협의</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* 엘리베이터 유무 */}
              <div>
                <label className="block text-[11px] font-extrabold text-zinc-500 mb-1">엘리베이터 유무 *</label>
                <select
                  {...register("hasElevator")}
                  className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-[13px] font-bold text-zinc-800 outline-none focus:border-[#2563EB] dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200"
                >
                  <option value="yes">엘리베이터 있음 (사용 가능)</option>
                  <option value="no">엘리베이터 없음 (계단 이용)</option>
                </select>
              </div>

              {/* 주차 가능 여부 */}
              <div>
                <label className="block text-[11px] font-extrabold text-zinc-500 mb-1">주차 가능 여부 *</label>
                <select
                  {...register("parkingAvailable")}
                  className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-[13px] font-bold text-zinc-800 outline-none focus:border-[#2563EB] dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200"
                >
                  <option value="yes">무료 주차 가능</option>
                  <option value="no">주차 불가능 (유료주차장 이용 필요)</option>
                  <option value="discuss">협의 필요 / 유동적</option>
                </select>
              </div>
            </div>

            {/* 현장 사진 첨부 */}
            <div>
              <label className="block text-[11px] font-extrabold text-zinc-500 mb-1">현장 사진 첨부</label>
              <PhotoUpload
                pageId={requestId}
                pathPrefix="quote-photos"
                photos={photos}
                onChange={(next: Photo[]) =>
                  setValue("photos", next, { shouldValidate: true })
                }
              />
              <p className="text-[10px] text-zinc-400 mt-1">JPEG/PNG/WebP 지원, 최대 10장 업로드 가능. 현장 상황 파악에 도움이 됩니다.</p>
            </div>

            {/* 특이사항 */}
            <div>
              <label className="block text-[11px] font-extrabold text-zinc-500 mb-1">특이사항 메모 (선택)</label>
              <textarea
                rows={3}
                maxLength={500}
                {...register("note")}
                placeholder="반려동물 동반 여부, 현장 진입 방법, 비밀번호 공유 등 특이사항을 적어주세요."
                className="w-full resize-none rounded-xl border border-zinc-200 bg-white px-3 py-2 text-[13px] font-bold text-zinc-800 outline-none focus:border-[#2563EB] dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200"
              />
            </div>
          </div>

          {/* 대분류 카테고리 선택 (10개) */}
          <Field 
            label="1단계: 청소 서비스 대분류" 
            hint="10대 카테고리 중 1개 선택" 
            completed={!!category}
          >
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
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
                    className={`relative flex flex-col items-center justify-center gap-1 rounded-2xl px-2 py-3.5 text-xs transition-all border cursor-pointer ${
                      selected
                        ? "bg-blue-50 text-zinc-950 border-blue-600 dark:bg-blue-950/20 dark:border-blue-500 dark:text-zinc-50"
                        : "bg-white text-zinc-650 border-zinc-200 hover:border-zinc-300 dark:bg-zinc-900 dark:text-zinc-400 dark:border-zinc-800"
                    }`}
                  >
                    {selected && (
                      <span className="absolute top-1.5 right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-blue-600 text-white text-[8px] font-bold">
                        ✓
                      </span>
                    )}
                    <span className="text-xl mb-1">{QUOTE_CATEGORY_EMOJIS[c]}</span>
                    <span className="font-extrabold tracking-tight text-[11px]">{QUOTE_CATEGORY_LABELS[c]}</span>
                  </button>
                );
              })}
            </div>
          </Field>

          {/* 세부 서비스 (청소 종류) 선택 */}
          <Field
            label="2단계: 상세 청소 종류"
            hint="대분류의 하위 서비스 종류 선택"
            completed={!!subService}
          >
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {availableServices.map((service) => {
                const selected = service.key === subService;
                return (
                  <button
                    key={service.key}
                    type="button"
                    onClick={() => setValue("subService", service.key)}
                    className={`rounded-xl border py-2.5 px-3 text-xs font-bold text-center transition-all cursor-pointer ${
                      selected
                        ? "bg-[#EFF6FF] border-[#2563EB] text-[#1E40AF] dark:bg-blue-950/20 dark:border-[#3B82F6] dark:text-zinc-50"
                        : "bg-white border-zinc-200 text-zinc-650 hover:bg-zinc-50 dark:bg-zinc-900 dark:text-zinc-400 dark:border-zinc-800"
                    }`}
                  >
                    {service.label}
                  </button>
                );
              })}
            </div>
          </Field>

          {/* 3단계: 세부 서비스 특화 필드 동적 렌더링 */}
          {activeServiceConfig && (
            <div className="p-5 bg-white border border-zinc-200 rounded-[24px] shadow-sm space-y-4 dark:bg-zinc-950 dark:border-zinc-850">
              <h4 className="text-xs font-black text-blue-600 dark:text-blue-400 uppercase tracking-wider">{activeServiceConfig.label} 특화 정보</h4>
              
              {/* 기본 요금제 및 견적 타입 설정 (사무실/가전 등 구분) */}
              {category !== "specialist" && (
                <div className="space-y-2">
                  <label className="block text-[11px] font-extrabold text-zinc-500">견적 등급 선택</label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { value: "premium", label: "프리미엄", desc: "고급 친환경/인증" },
                      { value: "regular", label: "일반 표준", desc: "기본 정밀 세척" },
                      { value: "budget", label: "실속 가성비", desc: "실용 청소 중심" },
                    ].map((type) => (
                      <button
                        key={type.value}
                        type="button"
                        onClick={() => setQuoteType(type.value as any)}
                        className={`rounded-xl border p-2 text-xs font-extrabold text-center transition cursor-pointer ${
                          quoteType === type.value
                            ? "bg-blue-50 border-blue-500 text-blue-700 dark:bg-blue-950/20 dark:border-blue-500 dark:text-zinc-100"
                            : "bg-white border-zinc-200 text-zinc-650 dark:bg-zinc-900 dark:border-zinc-800"
                        }`}
                      >
                        <div>{type.label}</div>
                        <div className="text-[9px] text-zinc-400 font-medium mt-0.5">{type.desc}</div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* 정기 청소 주기 설정 */}
              {category === "regular" && (
                <div className="space-y-2">
                  <label className="block text-[11px] font-extrabold text-zinc-500">청소 정기 구독 설정</label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setFrequency("once");
                        setFrequencyCount(1);
                      }}
                      className={`flex-1 rounded-xl py-2.5 text-xs font-bold border transition cursor-pointer ${
                        frequency === "once"
                          ? "bg-blue-50 border-blue-500 text-blue-700 dark:bg-blue-950/20 dark:border-blue-500"
                          : "bg-white border-zinc-200 text-zinc-650 dark:bg-zinc-900 dark:border-zinc-800"
                      }`}
                    >
                      1회성 (한번)
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setFrequency("regular");
                        setFrequencyCount(4);
                      }}
                      className={`flex-1 rounded-xl py-2.5 text-xs font-bold border transition cursor-pointer ${
                        frequency === "regular"
                          ? "bg-blue-50 border-blue-500 text-blue-700 dark:bg-blue-950/20 dark:border-blue-500"
                          : "bg-white border-zinc-200 text-zinc-650 dark:bg-zinc-900 dark:border-zinc-800"
                      }`}
                    >
                      정기 구독 (월 정기)
                    </button>
                  </div>

                  {frequency === "regular" && (
                    <div className="mt-2">
                      <label className="block text-[10px] text-zinc-450 mb-1">방문 빈도</label>
                      <select
                        value={frequencyCount}
                        onChange={(e) => setFrequencyCount(Number(e.target.value))}
                        className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-[13px] font-bold text-zinc-800 outline-none focus:border-[#2563EB] dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200"
                      >
                        <option value={1}>월 1회 방문</option>
                        <option value={4}>주 1회 (월 4회 방문, 5% 할인)</option>
                        <option value={8}>주 2회 (월 8회 방문, 10% 할인)</option>
                        <option value={12}>주 3회 (월 12회 방문, 15% 할인)</option>
                        <option value={16}>주 4회 (월 16회 방문, 20% 할인)</option>
                        <option value={20}>주 5회 (월 20회 방문, 20% 할인)</option>
                        <option value={24}>주 6회 (월 24회 방문, 20% 할인)</option>
                        <option value={30}>매일 (월 30회 방문, 20% 할인)</option>
                      </select>
                    </div>
                  )}
                </div>
              )}

              {/* 수량 / 면적 / 평수 입력 */}
              <div>
                <label className="block text-[11px] font-extrabold text-zinc-500 mb-1">
                  {activeServiceConfig.priceFormulaType === "floor"
                    ? "건물 층수 *"
                    : activeServiceConfig.priceFormulaType === "vehicle"
                    ? "차량 대수 *"
                    : activeServiceConfig.priceFormulaType === "count"
                    ? "간판 크기/개수 *"
                    : activeServiceConfig.priceFormulaType === "fixed" && subService === "aircon-cleaning"
                    ? "에어컨 수량 *"
                    : activeServiceConfig.priceFormulaType === "fixed" && subService === "lodging-cleaning"
                    ? "객실 수 *"
                    : "평수 (정수 입력) *"}
                </label>
                <Controller
                  control={control}
                  name="size"
                  render={({ field }) => (
                    <input
                      type="number"
                      inputMode="numeric"
                      min={1}
                      max={10000}
                      placeholder="예: 24"
                      value={field.value ?? ""}
                      onChange={(e) => {
                        const v = e.target.value;
                        field.onChange(v === "" ? null : Number(v));
                      }}
                      className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-[13px] font-bold text-zinc-800 outline-none focus:border-[#2563EB] dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200"
                    />
                  )}
                />
                {errors.size?.message && <span className="text-[10px] text-red-500">{errors.size.message}</span>}
                {activeServiceConfig.priceFormulaType === "pyung_min_25" && (
                  <p className="text-[10px] text-zinc-400 mt-1">※ 25평 이하 기본 최소 금액 수식이 자동 적용됩니다.</p>
                )}
              </div>

              {/* 동적 상세 기획 필드 (드롭다운) */}
              {activeServiceConfig.fields.map((f) => (
                <div key={f.key}>
                  <label className="block text-[11px] font-extrabold text-zinc-500 mb-1">{f.label}</label>
                  {f.type === "select" ? (
                    <select
                      value={dynamicFields[f.key] ?? ""}
                      onChange={(e) => setDynamicFields({ ...dynamicFields, [f.key]: e.target.value })}
                      className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-[13px] font-bold text-zinc-800 outline-none focus:border-[#2563EB] dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200"
                    >
                      <option value="">선택하세요</option>
                      {f.options?.map((opt) => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type="number"
                      placeholder={f.placeholder ?? "수량 입력"}
                      value={dynamicFields[f.key] ?? ""}
                      onChange={(e) => setDynamicFields({ ...dynamicFields, [f.key]: e.target.value })}
                      className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-[13px] font-bold text-zinc-800 outline-none focus:border-[#2563EB] dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200"
                    />
                  )}
                </div>
              ))}
            </div>
          )}
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
                {activeServiceConfig?.label || "청소"} 기본 견적서
              </h2>
              <p className="mt-1 text-[9px] font-mono text-zinc-450">
                NO. {requestId.toUpperCase().slice(0, 8)}
              </p>
            </div>

            {/* 내역 명세표 */}
            <div className="mt-5 border-t-2 border-dashed border-zinc-200 pt-4 text-xs space-y-2.5 dark:border-zinc-800">
              <div className="flex justify-between items-start text-[11px] text-zinc-500 dark:text-zinc-400 font-bold mb-1">
                <span>고객명</span>
                <span>{clientName || "(미입력)"}</span>
              </div>
              
              {category !== "specialist" && (
                <div className="flex justify-between items-start text-[11px] text-zinc-500 dark:text-zinc-400 font-bold mb-1">
                  <span>견적 등급</span>
                  <span>{quoteType === "premium" ? "프리미엄" : quoteType === "budget" ? "가성비" : "일반 표준"}</span>
                </div>
              )}

              {category === "regular" && (
                <div className="flex justify-between items-start text-[11px] text-zinc-500 dark:text-zinc-400 font-bold mb-2">
                  <span>청소 주기</span>
                  <span>
                    {frequency === "once" 
                      ? "1회성 (한번)" 
                      : `정기 구독 (월 ${frequencyCount}회)`}
                  </span>
                </div>
              )}

              {/* 기본 요금 */}
              <div className="flex justify-between items-start pt-2 border-t border-zinc-100 dark:border-zinc-850">
                <div>
                  <p className="font-bold text-zinc-800 dark:text-zinc-200">기본 {activeServiceConfig?.label || "청소"}</p>
                  <span className="text-[10px] text-zinc-400">
                    {activeServiceConfig ? (
                      activeServiceConfig.priceFormulaType === "pyung_min_25"
                        ? `${size ? Math.max(25, size) : 0}평(25평 최소수식) x ${activeServiceConfig.unitPrice.toLocaleString()}원`
                        : `${size ?? 0}${
                            activeServiceConfig.priceFormulaType === "floor" ? "층" : 
                            activeServiceConfig.priceFormulaType === "vehicle" ? "대" : "평"
                          } x ${activeServiceConfig.unitPrice.toLocaleString()}원`
                    ) : ""}
                    {category === "regular" && frequency === "regular" && ` x 월 ${frequencyCount}회`}
                  </span>
                </div>
                <span className="font-bold text-zinc-800 dark:text-zinc-200">
                  {calculatedBasePrice.toLocaleString()}원
                </span>
              </div>

              {/* 추가 공간 내역 */}
              {Object.entries(selectedExtraSpaces).map(([key, isSelected]) => {
                if (!isSelected) return null;
                const space = activeServiceConfig?.extraSpaces.find((s) => s.key === key);
                if (!space) return null;

                return (
                  <div key={key} className="flex justify-between items-start text-xs text-zinc-700 dark:text-zinc-300 pl-2.5 border-l-2 border-blue-200 dark:border-blue-900/60 animate-[scaleIn_0.15s_ease-out]">
                    <div>
                      <p className="font-semibold">[추가공간] {space.label}</p>
                      <span className="text-[9px] text-zinc-400">현장 실측 후 최종 산정</span>
                    </div>
                    <span className="font-semibold text-zinc-550">실측후 확정</span>
                  </div>
                );
              })}

              {/* 추가 옵션 내역 */}
              {Object.entries(selectedOptions).map(([key, val]) => {
                if (!val) return null;
                const opt = activeServiceConfig?.options.find((o) => o.key === key);
                if (!opt) return null;

                return (
                  <div key={key} className="flex justify-between items-start text-xs text-zinc-700 dark:text-zinc-300 pl-2.5 border-l-2 border-blue-200 dark:border-blue-900/60 animate-[scaleIn_0.15s_ease-out]">
                    <div>
                      <p className="font-semibold">[옵션] {opt.label}</p>
                      {typeof val === "string" && (
                        <span className="text-[9px] text-zinc-400">선택사항: {val}</span>
                      )}
                    </div>
                    <span className="font-semibold text-zinc-550">실측후 확정</span>
                  </div>
                );
              })}
            </div>

            {/* 합계 */}
            <div className="mt-5 border-t-2 border-dashed border-zinc-200 pt-4 dark:border-zinc-800 flex justify-between items-end">
              <span className="text-xs font-bold text-zinc-850 dark:text-zinc-200">총 1차 견적 예상금</span>
              <span className="text-xl font-black text-blue-600 dark:text-blue-400">
                {calculatedTotalAmount.toLocaleString()}원
              </span>
            </div>

            {/* 하단 면책 및 홍보 */}
            <div className="mt-6 border-t border-zinc-100 pt-4 text-center dark:border-zinc-850">
              <p className="text-[10px] font-bold text-blue-700 bg-blue-50/50 py-1.5 px-2 rounded-lg dark:text-blue-400 dark:bg-blue-950/20 leading-normal mb-2">
                기본 견적 외 상세 현장 조건은 실측 상황에 따라 변경될 수 있습니다. 최종 금액은 현장확인 후 확정됩니다.
              </p>
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
            <div className="absolute w-32 h-32 bg-blue-500/10 rounded-full blur-xl animate-pulse" />
            
            <div className="relative w-28 h-28 flex items-center justify-center bg-gradient-to-tr from-blue-50 to-indigo-50 dark:from-zinc-900 dark:to-zinc-850 rounded-full border border-blue-100 dark:border-zinc-800 shadow-[inset_0_2px_6px_rgba(0,0,0,0.03)] mb-6">
              <Home className="h-12 w-12 text-blue-600 dark:text-blue-400 animate-[bounce_2s_infinite]" />
              
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
            </div>

            <h3 className="text-base font-extrabold text-zinc-950 dark:text-zinc-50 tracking-tight">
              청광 매니저 매칭 분석 중
            </h3>
            
            <p className="mt-2 text-[11px] text-zinc-650 dark:text-zinc-400 leading-relaxed font-semibold">
              고객님의 1차 견적 요청 접수 후,<br />
              청광이 조건에 최적화된 인증 파트너를 분류하고 있습니다.
            </p>
          </div>
        </div>
      )}

      {/* 다음 우편번호 모달 */}
      {isOpenPostcode && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/60 backdrop-blur-xs p-0 md:p-4 animate-fade-in">
          <div className="absolute inset-0 z-0" onClick={() => setIsOpenPostcode(false)} />
          <div className="relative z-10 w-full md:max-w-lg bg-white dark:bg-zinc-900 rounded-t-3xl md:rounded-3xl shadow-2xl flex flex-col max-h-[85vh] md:max-h-[90vh] overflow-hidden animate-slide-up">
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
  completed,
  children,
}: {
  label: string;
  hint?: string;
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
    </div>
  );
}
