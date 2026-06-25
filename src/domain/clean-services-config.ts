import type { QuoteCategory } from "./quote-category";

export interface CleanOptionConfig {
  key: string;
  label: string;
  type: "boolean" | "select" | "number";
  options?: string[];
}

export interface ExtraSpaceConfig {
  key: string;
  label: string;
}

export interface DynamicFieldConfig {
  key: string;
  label: string;
  type: "select" | "number";
  options?: string[];
  placeholder?: string;
}

export interface SubServiceConfig {
  key: string;
  label: string;
  category: QuoteCategory;
  priceFormulaType: "pyung" | "pyung_min_25" | "count" | "vehicle" | "floor" | "fixed";
  unitPrice: number; // default price per unit (pyung, car, room etc)
  extraSpaces: ExtraSpaceConfig[];
  options: CleanOptionConfig[];
  fields: DynamicFieldConfig[];
  guideText?: string;
}

export const CLEAN_SERVICES_CONFIG: Record<string, SubServiceConfig> = {
  // 1. 주거청소 (residential)
  "move-in": {
    key: "move-in",
    label: "입주청소",
    category: "residential",
    priceFormulaType: "pyung_min_25",
    unitPrice: 12000,
    extraSpaces: [
      { key: "space-veranda", label: "베란다(비확장)" },
      { key: "space-loft", label: "복층" },
      { key: "space-outdoor", label: "실외기실" },
      { key: "space-attic", label: "다락방" },
    ],
    options: [
      { key: "opt-sick-house", label: "새집증후군 케어", type: "boolean" },
      { key: "opt-dust", label: "공사 분진 정밀 제거", type: "boolean" },
      { key: "opt-nano-coating", label: "바닥/주방 상판/욕실 나노코팅", type: "boolean" },
      { key: "opt-sticker", label: "스티커/보양지 제거", type: "boolean" },
      { key: "opt-aircon", label: "에어컨 내부 세척", type: "select", options: ["1대", "2대", "3대", "4대 이상"] },
      { key: "opt-refrigerator", label: "냉장고 내부 세척", type: "select", options: ["1대", "2대", "3대 이상"] },
    ],
    fields: [
      { key: "rooms", label: "방 개수", type: "select", options: ["1개", "2개", "3개", "4개", "5개 이상"] },
      { key: "bathrooms", label: "화장실 개수", type: "select", options: ["1개", "2개", "3개 이상"] },
    ],
    guideText: "※ 추가공간 및 옵션선택 내용은 현장상황에 따라 변경될 수 있습니다. 최종 금액은 현장확인 후 확정됩니다.",
  },
  "move-out-residential": {
    key: "move-out-residential",
    label: "이사청소",
    category: "residential",
    priceFormulaType: "pyung_min_25",
    unitPrice: 12000,
    extraSpaces: [
      { key: "space-veranda", label: "베란다(비확장)" },
      { key: "space-loft", label: "복층" },
      { key: "space-utility", label: "다용도실" },
      { key: "space-storage", label: "창고" },
    ],
    options: [
      { key: "opt-mold", label: "곰팡이 제거", type: "select", options: ["상", "중", "하"] },
      { key: "opt-nicotine", label: "니코틴 제거", type: "boolean" },
      { key: "opt-sticker-sheet", label: "스티커/시트지 제거", type: "boolean" },
      { key: "opt-appliances", label: "빌트인 가전 내부 세척 (냉장고, 오븐, 세탁기 등)", type: "select", options: ["1개", "2개", "3개 이상"] },
      { key: "opt-window-exterior", label: "창문 외부 유리창", type: "boolean" },
      { key: "opt-aircon", label: "에어컨 내부 세척", type: "select", options: ["1대", "2대", "3대 이상"] },
    ],
    fields: [
      { key: "rooms", label: "방 개수", type: "select", options: ["1개", "2개", "3개", "4개", "5개 이상"] },
      { key: "bathrooms", label: "화장실 개수", type: "select", options: ["1개", "2개", "3개 이상"] },
    ],
    guideText: "※ 추가공간 및 옵션선택 내용은 현장상황에 따라 변경될 수 있습니다. 최종 금액은 현장확인 후 확정됩니다.",
  },
  living: {
    key: "living",
    label: "거주청소",
    category: "residential",
    priceFormulaType: "pyung",
    unitPrice: 14000,
    extraSpaces: [
      { key: "space-veranda", label: "베란다" },
      { key: "space-dressroom", label: "드레스룸" },
      { key: "space-terrace", label: "테라스" },
    ],
    options: [
      { key: "opt-organize", label: "주방/옷장 정리수납", type: "select", options: ["3시간", "4시간", "5시간", "6시간", "7시간", "8시간"] },
      { key: "opt-pet", label: "반려동물 털 제거 및 소독", type: "boolean" },
      { key: "opt-bedding", label: "침구 진드기 케어", type: "select", options: ["1개", "2개", "3개", "4개 이상"] },
      { key: "opt-dust-back", label: "가전 뒷면 먼지 제거", type: "boolean" },
      { key: "opt-refrigerator", label: "냉장고 내부 세척", type: "select", options: ["1대", "2대 이상"] },
      { key: "opt-aircon", label: "에어컨 내부 세척", type: "select", options: ["1대", "2대 이상"] },
    ],
    fields: [
      { key: "rooms", label: "방 개수", type: "select", options: ["1개", "2개", "3개", "4개", "5개 이상"] },
      { key: "bathrooms", label: "화장실 개수", type: "select", options: ["1개", "2개", "3개 이상"] },
    ],
    guideText: "※ 추가공간 및 옵션선택 내용은 현장상황에 따라 변경될 수 있습니다. 최종 금액은 현장확인 후 확정됩니다.",
  },
  oneroom: {
    key: "oneroom",
    label: "원룸청소",
    category: "residential",
    priceFormulaType: "pyung",
    unitPrice: 10000,
    extraSpaces: [
      { key: "space-mini-veranda", label: "미니 베란다" },
      { key: "space-loft", label: "복층 공간" },
    ],
    options: [
      { key: "opt-built-in-fridge", label: "빌트인 냉장고 세척", type: "select", options: ["1대", "2대"] },
      { key: "opt-built-in-washer", label: "빌트인 세탁기 세척", type: "select", options: ["1대", "2대"] },
      { key: "opt-wall-aircon", label: "벽걸이 에어컨 세척", type: "select", options: ["1대", "2대"] },
      { key: "opt-toilet-kitchen-focus", label: "화장실 물때/주방 기름때 집중 제거", type: "boolean" },
      { key: "opt-trash-separate", label: "쓰레기 분리배출 대행", type: "boolean" },
    ],
    fields: [
      { key: "oneroom-type", label: "원룸 타입", type: "select", options: ["오픈형", "분리형", "복층"] },
    ],
    guideText: "※ 추가공간 및 옵션선택 내용은 현장상황에 따라 변경될 수 있습니다. 최종 금액은 현장확인 후 확정됩니다.",
  },

  // 2. 정기청소 (regular)
  cafe: {
    key: "cafe",
    label: "카페청소",
    category: "regular",
    priceFormulaType: "pyung",
    unitPrice: 9000,
    extraSpaces: [
      { key: "space-toilet", label: "화장실" },
      { key: "space-terrace", label: "테라스" },
      { key: "space-kitchen-inner", label: "주방 내부" },
      { key: "space-hall-floor", label: "홀 바닥" },
    ],
    options: [
      { key: "opt-machine-dust", label: "머신/집기 외부 먼지 제거", type: "boolean" },
      { key: "opt-ice-fridge-outer", label: "제빙기/냉장고 외부 세척", type: "boolean" },
      { key: "opt-window-door", label: "유리창/유리문 관리", type: "boolean" },
      { key: "opt-trash-separate", label: "쓰레기 분리배출 대행", type: "boolean" },
    ],
    fields: [
      { key: "period", label: "청소 주기", type: "select", options: ["주 1회", "주 2회", "주 3회", "주 4회", "주 5회", "주 6회", "매일"] },
    ],
    guideText: "※ 추가공간 및 옵션선택 내용은 현장상황에 따라 변경될 수 있습니다. 최종 금액은 현장확인 후 확정됩니다.",
  },
  restaurant: {
    key: "restaurant",
    label: "식당청소",
    category: "regular",
    priceFormulaType: "pyung",
    unitPrice: 10000,
    extraSpaces: [
      { key: "space-kitchen-floor", label: "주방 바닥" },
      { key: "space-toilet", label: "화장실" },
      { key: "space-hall", label: "홀" },
      { key: "space-storage", label: "식재료 창고" },
    ],
    options: [
      { key: "opt-hood-grease", label: "주방 후드/덕트 기름때 관리", type: "boolean" },
      { key: "opt-food-waste", label: "음식물 쓰레기 배출 대행", type: "boolean" },
      { key: "opt-pest-control", label: "해충 방제/방역", type: "select", options: ["1회성", "정기 관리"] },
      { key: "opt-floor-wax", label: "바닥 왁스 코팅", type: "boolean" },
    ],
    fields: [
      { key: "period", label: "청소 주기", type: "select", options: ["주 1회", "주 2회", "주 3회", "주 4회", "주 5회", "주 6회", "매일"] },
    ],
    guideText: "※ 추가공간 및 옵션선택 내용은 현장상황에 따라 변경될 수 있습니다. 최종 금액은 현장확인 후 확정됩니다.",
  },
  hospital: {
    key: "hospital",
    label: "병원청소",
    category: "regular",
    priceFormulaType: "pyung",
    unitPrice: 11000,
    extraSpaces: [
      { key: "space-clinic", label: "진료실" },
      { key: "space-waiting", label: "대기실" },
      { key: "space-surgery", label: "수술실/처치실" },
      { key: "space-toilet", label: "화장실" },
    ],
    options: [
      { key: "opt-device-dust", label: "의료기기 주변 정밀 먼지 제거", type: "boolean" },
      { key: "opt-sterilization", label: "소독/멸균 작업", type: "select", options: ["부분 소독", "전체 소독"] },
      { key: "opt-medical-waste", label: "의료용 폐기물 분리 지원", type: "boolean" },
      { key: "opt-floor-shine", label: "바닥 광택 작업", type: "boolean" },
    ],
    fields: [
      { key: "period", label: "청소 주기", type: "select", options: ["주 1회", "주 2회", "주 3회", "주 4회", "주 5회", "주 6회", "매일"] },
    ],
    guideText: "※ 추가공간 및 옵션선택 내용은 현장상황에 따라 변경될 수 있습니다. 최종 금액은 현장확인 후 확정됩니다.",
  },
  academy: {
    key: "academy",
    label: "학원청소",
    category: "regular",
    priceFormulaType: "pyung",
    unitPrice: 8500,
    extraSpaces: [
      { key: "space-classroom", label: "강의실" },
      { key: "space-staffroom", label: "교무실" },
      { key: "space-studyroom", label: "자습실" },
      { key: "space-toilet", label: "화장실" },
    ],
    options: [
      { key: "opt-desk-wipe", label: "책상/의자 닦기 및 배치", type: "boolean" },
      { key: "opt-board-dust", label: "칠판/필기구 가루 제거", type: "boolean" },
      { key: "opt-aircon-filter", label: "에어컨 필터 세척", type: "select", options: ["1~2대", "3~5대", "6대 이상"] },
      { key: "opt-trash-separate", label: "쓰레기 분리배출 대행", type: "boolean" },
    ],
    fields: [
      { key: "period", label: "청소 주기", type: "select", options: ["주 1회", "주 2회", "주 3회", "주 4회", "주 5회", "주 6회", "매일"] },
    ],
    guideText: "※ 추가공간 및 옵션선택 내용은 현장상황에 따라 변경될 수 있습니다. 최종 금액은 현장확인 후 확정됩니다.",
  },
  "office-regular": {
    key: "office-regular",
    label: "사무실청소",
    category: "regular",
    priceFormulaType: "pyung",
    unitPrice: 8000,
    extraSpaces: [
      { key: "space-workdesk", label: "개인 업무석" },
      { key: "space-meeting", label: "회의실" },
      { key: "space-pantry", label: "탕비실" },
      { key: "space-ceo", label: "대표실" },
      { key: "space-toilet", label: "화장실" },
    ],
    options: [
      { key: "opt-desk-trash", label: "개인 쓰레기 수거 및 분리배출", type: "boolean" },
      { key: "opt-floor-wax-regular", label: "바닥 왁스 코팅 관리", type: "select", options: ["연 1회", "연 2회", "정기 관리"] },
      { key: "opt-air-purifier", label: "공기청정기/가전 관리", type: "select", options: ["1~2대", "3~5대", "6대 이상"] },
      { key: "opt-window-inner", label: "유리창 내부 세척", type: "boolean" },
    ],
    fields: [
      { key: "period", label: "청소 주기", type: "select", options: ["주 1회", "주 2회", "주 3회", "주 4회", "주 5회", "주 6회", "매일"] },
    ],
    guideText: "※ 추가공간 및 옵션선택 내용은 현장상황에 따라 변경될 수 있습니다. 최종 금액은 현장확인 후 확정됩니다.",
  },
  commercial: {
    key: "commercial",
    label: "상가청소",
    category: "regular",
    priceFormulaType: "pyung",
    unitPrice: 9000,
    extraSpaces: [
      { key: "space-toilet-public", label: "공용 화장실" },
      { key: "space-stairs", label: "계단" },
      { key: "space-lobby", label: "입구 로비" },
      { key: "space-parking", label: "주차장 구역" },
    ],
    options: [
      { key: "opt-window-door", label: "유리창/유리문 케어", type: "boolean" },
      { key: "opt-sign-wash", label: "간판 세척", type: "boolean" },
      { key: "opt-spider-web", label: "거미줄 제거 및 외곽 비질", type: "boolean" },
      { key: "opt-sticker-remover", label: "스티커/전단지 제거", type: "boolean" },
    ],
    fields: [
      { key: "period", label: "청소 주기", type: "select", options: ["주 1회", "주 2회", "주 3회", "주 4회", "주 5회", "주 6회", "매일"] },
    ],
    guideText: "※ 추가공간 및 옵션선택 내용은 현장상황에 따라 변경될 수 있습니다. 최종 금액은 현장확인 후 확정됩니다.",
  },
  "public-area": {
    key: "public-area",
    label: "공용부 청소",
    category: "regular",
    priceFormulaType: "floor",
    unitPrice: 50000,
    extraSpaces: [
      { key: "space-stairs-hall", label: "계단실" },
      { key: "space-hallway", label: "복도" },
      { key: "space-elevator", label: "엘리베이터 내부" },
      { key: "space-toilet-public", label: "공용 화장실" },
      { key: "space-recycle", label: "분리수거장" },
    ],
    options: [
      { key: "opt-handrail", label: "난간/소화전 닦기", type: "boolean" },
      { key: "opt-flyer", label: "전단지 제거", type: "boolean" },
      { key: "opt-recycle-clean", label: "분리수거장 정리 및 세척", type: "boolean" },
      { key: "opt-parking-water", label: "주차장 물청소", type: "boolean" },
    ],
    fields: [
      { key: "floors", label: "건물 층수", type: "number", placeholder: "예: 5" },
      { key: "period", label: "청소 주기", type: "select", options: ["주 1회", "주 2회", "주 3회", "주 4회", "주 5회 이상"] },
    ],
    guideText: "※ 추가공간 및 옵션선택 내용은 현장상황에 따라 변경될 수 있습니다. 최종 금액은 현장확인 후 확정됩니다.",
  },

  // 3. 건설청소 (construction)
  "post-construction": {
    key: "post-construction",
    label: "준공청소",
    category: "construction",
    priceFormulaType: "pyung",
    unitPrice: 15000,
    extraSpaces: [
      { key: "space-veranda", label: "베란다" },
      { key: "space-window-frame", label: "창틀" },
      { key: "space-boiler", label: "보일러실" },
      { key: "space-outdoor", label: "실외기실" },
    ],
    options: [
      { key: "opt-protect-film", label: "보양지/테이프 제거", type: "boolean" },
      { key: "opt-cement-dust", label: "분진 및 시멘트 가루 정밀 제거", type: "boolean" },
      { key: "opt-floor-wax", label: "바닥 왁스 코팅", type: "boolean" },
      { key: "opt-window-outer", label: "외부 유리창 세척", type: "boolean" },
    ],
    fields: [
      { key: "pollution", label: "오염도", type: "select", options: ["상", "중", "하"] },
    ],
    guideText: "※ 추가공간 및 옵션선택 내용은 현장상황에 따라 변경될 수 있습니다. 최종 금액은 현장확인 후 확정됩니다.",
  },
  "after-work": {
    key: "after-work",
    label: "공사후청소",
    category: "construction",
    priceFormulaType: "pyung",
    unitPrice: 14000,
    extraSpaces: [
      { key: "space-all-zone", label: "작업 구역 전체" },
      { key: "space-toilet", label: "화장실" },
      { key: "space-utility", label: "다용도실" },
    ],
    options: [
      { key: "opt-waste-small", label: "공사 폐기물 소량 처리", type: "boolean" },
      { key: "opt-wall-dust", label: "벽면/천장 분진 흡입", type: "boolean" },
      { key: "opt-glue-mark", label: "몰딩/걸레받이 풀 자국 제거", type: "boolean" },
    ],
    fields: [
      { key: "pollution", label: "오염도", type: "select", options: ["상", "중", "하"] },
    ],
    guideText: "※ 추가공간 및 옵션선택 내용은 현장상황에 따라 변경될 수 있습니다. 최종 금액은 현장확인 후 확정됩니다.",
  },
  interior: {
    key: "interior",
    label: "인테리어청소",
    category: "construction",
    priceFormulaType: "pyung",
    unitPrice: 13000,
    extraSpaces: [
      { key: "space-sink-inner", label: "싱크대 내부" },
      { key: "space-wardrobe", label: "붙박이장" },
      { key: "space-balcony", label: "발코니" },
    ],
    options: [
      { key: "opt-drawer-remove", label: "서랍장 탈거 세척", type: "boolean" },
      { key: "opt-white-cement", label: "백시멘트 제거", type: "boolean" },
      { key: "opt-phytoncide", label: "피톤치드 소독", type: "boolean" },
    ],
    fields: [
      { key: "scope", label: "범위", type: "select", options: ["전체", "부분"] },
    ],
    guideText: "※ 추가공간 및 옵션선택 내용은 현장상황에 따라 변경될 수 있습니다. 최종 금액은 현장확인 후 확정됩니다.",
  },
  "construction-waste": {
    key: "construction-waste",
    label: "폐기물 처리 (공사)",
    category: "construction",
    priceFormulaType: "vehicle",
    unitPrice: 300000,
    extraSpaces: [],
    options: [
      { key: "opt-ladder-car", label: "사다리차 이용", type: "boolean" },
      { key: "opt-helper-count", label: "상차 인원 추가", type: "select", options: ["1명", "2명", "3명 이상"] },
      { key: "opt-site-arrange", label: "현장 정리 지원", type: "boolean" },
    ],
    fields: [
      { key: "waste-volume", label: "폐기물 양", type: "select", options: ["1톤", "2.5톤", "5톤"] },
      { key: "waste-type", label: "폐기물 종류", type: "select", options: ["목재", "콘크리트", "혼합 폐기물", "기타"] },
      { key: "cars", label: "차량 대수", type: "number", placeholder: "예: 1" },
    ],
    guideText: "※ 추가공간 및 옵션선택 내용은 현장상황에 따라 변경될 수 있습니다. 최종 금액은 현장확인 후 확정됩니다.",
  },

  // 4. 외부청소 (exterior)
  "window-cleaning": {
    key: "window-cleaning",
    label: "유리창청소",
    category: "exterior",
    priceFormulaType: "pyung",
    unitPrice: 8000,
    extraSpaces: [],
    options: [
      { key: "opt-chem-clean", label: "특수 약품 세척", type: "boolean" },
      { key: "opt-frame-dust", label: "창틀 먼지 세척", type: "boolean" },
      { key: "opt-mesh-clean", label: "방충망 청소", type: "boolean" },
    ],
    fields: [
      { key: "height", label: "층수/높이", type: "select", options: ["1층", "2~5층", "6층 이상"] },
      { key: "equipment", label: "장비 사용", type: "select", options: ["사다리", "로프 작업", "스카이차 지원"] },
    ],
    guideText: "※ 추가공간 및 옵션선택 내용은 현장상황에 따라 변경될 수 있습니다. 최종 금액은 현장확인 후 확정됩니다.",
  },
  signboard: {
    key: "signboard",
    label: "간판청소",
    category: "exterior",
    priceFormulaType: "count",
    unitPrice: 150000,
    extraSpaces: [],
    options: [
      { key: "opt-light-replace", label: "간판 내부 등 교체", type: "boolean" },
      { key: "opt-awning-clean", label: "어닝 세척 추가", type: "boolean" },
      { key: "opt-spider-web", label: "거미줄 제거", type: "boolean" },
    ],
    fields: [
      { key: "signboard-count", label: "간판 크기/개수", type: "number", placeholder: "예: 1" },
      { key: "height", label: "설치 높이", type: "select", options: ["1층", "2층 이상"] },
      { key: "signboard-type", label: "간판 종류", type: "select", options: ["플렉스 간판", "LED 채널 간판", "돌출 간판", "기타"] },
    ],
    guideText: "※ 추가공간 및 옵션선택 내용은 현장상황에 따라 변경될 수 있습니다. 최종 금액은 현장확인 후 확정됩니다.",
  },
  "outer-wall": {
    key: "outer-wall",
    label: "외벽청소",
    category: "exterior",
    priceFormulaType: "pyung",
    unitPrice: 6000,
    extraSpaces: [],
    options: [
      { key: "opt-high-pressure", label: "고압 물세척", type: "boolean" },
      { key: "opt-waterproof-coat", label: "외벽 발수 코팅", type: "boolean" },
      { key: "opt-white-efflo", label: "백화 현상 제거", type: "boolean" },
    ],
    fields: [
      { key: "height", label: "건물 높이", type: "select", options: ["5층 이하", "5~10층", "10층 이상"] },
      { key: "material", label: "외벽 재질", type: "select", options: ["석재", "판넬", "유리", "벽돌", "기타"] },
    ],
    guideText: "※ 추가공간 및 옵션선택 내용은 현장상황에 따라 변경될 수 있습니다. 최종 금액은 현장확인 후 확정됩니다.",
  },

  // 5. 위생/방역청소 (sanitation)
  disinfection: {
    key: "disinfection",
    label: "소독 / 방역 / 해충방제 / EM",
    category: "sanitation",
    priceFormulaType: "pyung",
    unitPrice: 4000,
    extraSpaces: [],
    options: [
      { key: "opt-pest-trap", label: "해충 트랩 설치", type: "number" },
      { key: "opt-space-disinfect", label: "공간 소독", type: "boolean" },
      { key: "opt-em-spray", label: "EM 살포 및 탈취", type: "boolean" },
      { key: "opt-cert", label: "소독 증명서 발급", type: "boolean" },
    ],
    fields: [
      { key: "facility-type", label: "시설 유형", type: "select", options: ["상가", "사무실", "가정집", "식당/카페", "기타"] },
      { key: "frequency", label: "작업 빈도", type: "select", options: ["1회성 소독", "월 1회 정기", "분기 1회 정기"] },
    ],
    guideText: "※ 추가공간 및 옵션선택 내용은 현장상황에 따라 변경될 수 있습니다. 최종 금액은 현장확인 후 확정됩니다.",
  },

  // 6. 전문크리닝 (specialist)
  sofa: {
    key: "sofa",
    label: "소파크리닝",
    category: "specialist",
    priceFormulaType: "fixed",
    unitPrice: 120000,
    extraSpaces: [],
    options: [
      { key: "opt-dry-tick", label: "건식 진드기 케어", type: "boolean" },
      { key: "opt-wet-stain", label: "습식 얼룩 제거", type: "boolean" },
      { key: "opt-leather-coat", label: "가죽 코팅/영양", type: "boolean" },
      { key: "opt-odor-pet", label: "반려동물 악취 제거", type: "boolean" },
    ],
    fields: [
      { key: "material", label: "재질", type: "select", options: ["패브릭", "가죽", "기능성 아쿠아텍스"] },
      { key: "size-label", label: "크기", type: "select", options: ["1인용", "2인용", "3인용", "4인용", "5인용", "6인용 이상", "카우치형", "리클라이너"] },
    ],
    guideText: "※ 추가공간 및 옵션선택 내용은 현장상황에 따라 변경될 수 있습니다. 최종 금액은 현장확인 후 확정됩니다.",
  },
  mattress: {
    key: "mattress",
    label: "매트리스크리닝",
    category: "specialist",
    priceFormulaType: "fixed",
    unitPrice: 90000,
    extraSpaces: [],
    options: [
      { key: "opt-dry-care", label: "건식 정밀 케어", type: "boolean" },
      { key: "opt-wet-sanitize", label: "습식 살균/얼룩 제거", type: "boolean" },
      { key: "opt-deodor", label: "항균 탈취", type: "boolean" },
      { key: "opt-tick-patch", label: "진드기 방제 패치", type: "boolean" },
    ],
    fields: [
      { key: "size", label: "사이즈", type: "select", options: ["싱글(S)", "슈퍼싱글(SS)", "더블(D)", "퀸(Q)", "킹(K)", "패밀리"] },
      { key: "side-care", label: "케어 범위", type: "select", options: ["단면 케어", "양면 케어"] },
    ],
    guideText: "※ 추가공간 및 옵션선택 내용은 현장상황에 따라 변경될 수 있습니다. 최종 금액은 현장확인 후 확정됩니다.",
  },
  carpet: {
    key: "carpet",
    label: "카펫크리닝",
    category: "specialist",
    priceFormulaType: "pyung",
    unitPrice: 15000,
    extraSpaces: [],
    options: [
      { key: "opt-wet-shampoo", label: "전체 습식 샴푸", type: "boolean" },
      { key: "opt-stain-focus", label: "부분 집중 얼룩 제거", type: "boolean" },
      { key: "opt-deodor-process", label: "항균 탈취 가공", type: "boolean" },
    ],
    fields: [
      { key: "carpet-type", label: "종류", type: "select", options: ["일반 카펫", "타일 카펫", "고정식 카펫"] },
    ],
    guideText: "※ 추가공간 및 옵션선택 내용은 현장상황에 따라 변경될 수 있습니다. 최종 금액은 현장확인 후 확정됩니다.",
  },
  "aircon-cleaning": {
    key: "aircon-cleaning",
    label: "에어컨청소",
    category: "specialist",
    priceFormulaType: "fixed",
    unitPrice: 80000,
    extraSpaces: [],
    options: [
      { key: "opt-disassemble", label: "완전 분해 세척", type: "boolean" },
      { key: "opt-outdoor-unit", label: "실외기 청소", type: "boolean" },
      { key: "opt-mold-coat", label: "곰팡이 방지 코팅", type: "boolean" },
      { key: "opt-eco-chem", label: "친환경 약품 사용", type: "boolean" },
    ],
    fields: [
      { key: "aircon-type", label: "형태", type: "select", options: ["벽걸이형", "스탠드형", "천장형 (1way)", "천장형 (2way)", "천장형 (4way)", "창문형"] },
      { key: "count", label: "수량", type: "number", placeholder: "예: 1" },
    ],
    guideText: "※ 추가공간 및 옵션선택 내용은 현장상황에 따라 변경될 수 있습니다. 최종 금액은 현장확인 후 확정됩니다.",
  },
  refrigerator: {
    key: "refrigerator",
    label: "냉장고청소",
    category: "specialist",
    priceFormulaType: "fixed",
    unitPrice: 120000,
    extraSpaces: [],
    options: [
      { key: "opt-shelf-wash", label: "선반 전체 탈거 세척", type: "boolean" },
      { key: "opt-steam-sanitize", label: "고온 스팀 살균", type: "boolean" },
      { key: "opt-motor-dust", label: "기계실 먼지 제거", type: "boolean" },
      { key: "opt-filter-replace", label: "탈취 필터 교체", type: "boolean" },
    ],
    fields: [
      { key: "fridge-type", label: "형태", type: "select", options: ["1도어", "2도어", "3도어", "4도어", "양문형", "김치냉장고"] },
      { key: "volume", label: "용량", type: "select", options: ["300L 이하", "300~500L", "500~800L", "800L 이상"] },
    ],
    guideText: "※ 추가공간 및 옵션선택 내용은 현장상황에 따라 변경될 수 있습니다. 최종 금액은 현장확인 후 확정됩니다.",
  },
  washer: {
    key: "washer",
    label: "세탁기분해청소",
    category: "specialist",
    priceFormulaType: "fixed",
    unitPrice: 130000,
    extraSpaces: [],
    options: [
      { key: "opt-tub-sanitize", label: "살균 소독 서비스", type: "boolean" },
      { key: "opt-baby-washer", label: "아기 세탁기 추가", type: "boolean" },
      { key: "opt-dryer-install", label: "건조기 분리/재설치", type: "select", options: ["선택 안 함", "단순 분리", "분리 후 완벽 재설치"] },
    ],
    fields: [
      { key: "washer-type", label: "타입", type: "select", options: ["일반 통돌이", "드럼 세탁기", "트윈워시", "빌트인 세탁기"] },
      { key: "capacity", label: "용량", type: "select", options: ["10kg 이하", "10~15kg", "15~20kg", "20kg 이상"] },
    ],
    guideText: "※ 추가공간 및 옵션선택 내용은 현장상황에 따라 변경될 수 있습니다. 최종 금액은 현장확인 후 확정됩니다.",
  },
  "hood-duct": {
    key: "hood-duct",
    label: "주방 후드 / 덕트 청소",
    category: "specialist",
    priceFormulaType: "fixed",
    unitPrice: 150000,
    extraSpaces: [],
    options: [
      { key: "opt-filter-replace", label: "필터망 교체", type: "boolean" },
      { key: "opt-motor-degrease", label: "모터 내부 기름때 제거", type: "boolean" },
      { key: "opt-tile-clean", label: "주방 타일 세척", type: "boolean" },
    ],
    fields: [
      { key: "hood-type", label: "후드 형태", type: "select", options: ["슬림 빌트인형", "침니형", "아일랜드형", "업소용 대형 후드"] },
      { key: "duct-length", label: "덕트 길이 (m)", type: "number", placeholder: "예: 2" },
    ],
    guideText: "※ 추가공간 및 옵션선택 내용은 현장상황에 따라 변경될 수 있습니다. 최종 금액은 현장확인 후 확정됩니다.",
  },

  // 7. 숙박청소 (lodging)
  "lodging-cleaning": {
    key: "lodging-cleaning",
    label: "객실 / 펜션 / 고시텔 / 숙박업소 공용부",
    category: "lodging",
    priceFormulaType: "fixed",
    unitPrice: 40000,
    extraSpaces: [
      { key: "space-terrace", label: "테라스" },
      { key: "space-bbq", label: "바베큐장" },
      { key: "space-public-kitchen", label: "공용 주방/복도" },
    ],
    options: [
      { key: "opt-linen-change", label: "침구 교체 및 세탁", type: "select", options: ["1세트", "2세트", "3세트", "4세트", "5세트 이상"] },
      { key: "opt-amenities", label: "비품 세팅", type: "boolean" },
      { key: "opt-toilet-deep", label: "화장실 정밀 요석 제거", type: "boolean" },
      { key: "opt-trash-out", label: "퇴거 쓰레기 처리", type: "boolean" },
    ],
    fields: [
      { key: "room-count", label: "객실 수", type: "number", placeholder: "예: 3" },
      { key: "room-type", label: "객실 타입", type: "select", options: ["원룸형", "투룸형", "복층형"] },
    ],
    guideText: "※ 추가공간 및 옵션선택 내용은 현장상황에 따라 변경될 수 있습니다. 최종 금액은 현장확인 후 확정됩니다.",
  },

  // 8. 산업청소 (industrial)
  "industrial-cleaning": {
    key: "industrial-cleaning",
    label: "공장 / 기계설비 / 창고 청소",
    category: "industrial",
    priceFormulaType: "pyung",
    unitPrice: 18000,
    extraSpaces: [],
    options: [
      { key: "opt-machine-degrease", label: "설비 기름때 제거", type: "boolean" },
      { key: "opt-ceiling-dust", label: "배관/천장 분진 제거", type: "boolean" },
      { key: "opt-epoxy-care", label: "바닥 에폭시 관리", type: "boolean" },
      { key: "opt-chem-treatment", label: "특수 약품 처리", type: "boolean" },
    ],
    fields: [
      { key: "ceiling-height", label: "층고 높이", type: "select", options: ["3m 이하", "3~5m", "5m 이상"] },
      { key: "facility-type", label: "시설 종류", type: "select", options: ["제조공장", "식품가공소", "물류창고", "정밀설비실"] },
    ],
    guideText: "※ 추가공간 및 옵션선택 내용은 현장상황에 따라 변경될 수 있습니다. 최종 금액은 현장확인 후 확정됩니다.",
  },

  // 9. 특수청소 (special)
  "special-cleaning": {
    key: "special-cleaning",
    label: "고독사 / 화재 / 침수 / 쓰레기집 / 악취제거",
    category: "special",
    priceFormulaType: "pyung",
    unitPrice: 25000,
    extraSpaces: [],
    options: [
      { key: "opt-inheritance-arrange", label: "유품 정리", type: "boolean" },
      { key: "opt-waste-ton", label: "폐기물 차량 톤수", type: "select", options: ["1톤 트럭", "2.5톤 트럭", "5톤 트럭", "10톤 이상"] },
      { key: "opt-ozone-odor", label: "특수 탈취/오존 살균", type: "boolean" },
      { key: "opt-demolish-wall-floor", label: "벽지/장판 철거", type: "boolean" },
    ],
    fields: [
      { key: "pollution", label: "오염도", type: "select", options: ["상", "중", "하"] },
      { key: "special-type", label: "유형 선택", type: "select", options: ["고독사 현장", "화재 복구", "침수 복구", "쓰레기집 정리", "특수 악취 제거"] },
    ],
    guideText: "※ 추가공간 및 옵션선택 내용은 현장상황에 따라 변경될 수 있습니다. 최종 금액은 현장확인 후 확정됩니다.",
  },

  // 10. 기타 시설 청소 (etc)
  "etc-cleaning": {
    key: "etc-cleaning",
    label: "학교/교육시설, 전산실/데이터센터, 대형주차장, 이벤트/행사장",
    category: "etc",
    priceFormulaType: "pyung",
    unitPrice: 15000,
    extraSpaces: [],
    options: [
      { key: "opt-floor-machine-wax", label: "바닥 기계 세척/왁스", type: "boolean" },
      { key: "opt-secure-stay", label: "보안 구역 상주", type: "select", options: ["1명", "2명", "3명 이상"] },
      { key: "opt-large-waste", label: "대량 폐기물 처리", type: "boolean" },
      { key: "opt-helper-add", label: "인원 추가", type: "select", options: ["1명", "2명", "3명 이상"] },
    ],
    fields: [
      { key: "timezone", label: "시간대", type: "select", options: ["주간 (할증 없음)", "야간 (20% 할증)"] },
      { key: "zones", label: "구역 수", type: "number", placeholder: "예: 2" },
    ],
    guideText: "※ 추가공간 및 옵션선택 내용은 현장상황에 따라 변경될 수 있습니다. 최종 금액은 현장확인 후 확정됩니다.",
  },
};
