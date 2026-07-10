export type OptionType = "check" | "quantity" | "select";

export interface CleaningOption {
  id: string;
  label: string;
  type: OptionType;
  selectOptions?: string[]; // Used if type is "select"
}

export interface ExtraSpace {
  id: string;
  label: string;
  type: OptionType;
}

export interface CleaningCategoryConfig {
  id: string;
  label: string;
  extraSpaces: ExtraSpace[];
  options: CleaningOption[];
  noticeMessage: string;
}

export const CLEANING_CATEGORIES: Record<string, CleaningCategoryConfig> = {
  "move-in": {
    id: "move-in",
    label: "입주청소",
    extraSpaces: [
      { id: "veranda", label: "베란다", type: "check" },
      { id: "bathroom", label: "화장실", type: "quantity" },
      { id: "duplex", label: "복층", type: "check" },
    ],
    options: [
      { id: "new-house-syndrome", label: "새집증후군", type: "check" },
      { id: "ac-cleaning", label: "에어컨청소", type: "quantity" },
      { id: "mold-removal", label: "곰팡이제거", type: "select", selectOptions: ["상", "중", "하"] },
    ],
    noticeMessage: "※ 추가공간 및 옵션 선택사항은 현장확인 후 최종 견적 반영됩니다.",
  },
  "move-out": {
    id: "move-out",
    label: "이사청소",
    extraSpaces: [
      { id: "veranda", label: "베란다", type: "check" },
      { id: "bathroom", label: "화장실", type: "quantity" },
      { id: "duplex", label: "복층", type: "check" },
    ],
    options: [
      { id: "ac-cleaning", label: "에어컨청소", type: "quantity" },
      { id: "mold-removal", label: "곰팡이제거", type: "select", selectOptions: ["상", "중", "하"] },
    ],
    noticeMessage: "※ 추가공간 및 옵션 선택사항은 현장확인 후 최종 견적 반영됩니다.",
  },
  "cafe": {
    id: "cafe",
    label: "상가/카페청소",
    extraSpaces: [
      { id: "terrace", label: "테라스", type: "check" },
      { id: "roasting-room", label: "로스팅룸/주방", type: "check" },
      { id: "bathroom", label: "내부 화장실", type: "quantity" },
    ],
    options: [
      { id: "coffee-machine", label: "커피머신 외부청소", type: "check" },
      { id: "display-case", label: "쇼케이스 청소", type: "quantity" },
    ],
    noticeMessage: "※ 상가의 경우 집기류와 기구 배치가 다양하여 현장 방문 후 정확한 견적이 산출됩니다.",
  },
};
