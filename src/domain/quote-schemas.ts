import { z } from "zod";
import { QUOTE_CATEGORIES, type QuoteCategory } from "./quote-category";

export const regionSchema = z.object({
  city: z.string().min(1).max(20),
  district: z.string().min(1).max(30),
});

export const photoSchema = z.object({
  url: z.string().url(),
  path: z.string().min(1),
  order: z.number().int().min(0).max(4),
});

export const quoteRequestInputSchema = z.object({
  requestId: z.string().regex(/^[a-z0-9]{16}$/, "유효하지 않은 요청 ID"),
  clientName: z.string().min(1, "고객명을 입력해 주세요"),
  category: z.enum(
    QUOTE_CATEGORIES as unknown as [QuoteCategory, ...QuoteCategory[]],
  ),
  subService: z.string().min(1, "세부 청소 종류를 선택해 주세요"),
  region: regionSchema,
  size: z.number().int().positive().max(10000).nullable(), // Support building floor height / area up to 10000
  preferredDate: z.string().datetime().nullable(),
  preferredTime: z.string().min(1, "작업희망시간을 입력해 주세요"),
  hasElevator: z.enum(["yes", "no"]),
  parkingAvailable: z.enum(["yes", "no", "discuss"]),
  contactPhone: z
    .string()
    .regex(
      /^[0-9]{2,4}-?[0-9]{3,4}-?[0-9]{4}$/,
      "전화번호 형식이 올바르지 않습니다",
    ),
  photos: z.array(photoSchema).max(10), // Limit increased to support more photos
  note: z.string().max(500).nullable(),
  address: z.string().max(200).optional(),
  /** v1.1b #2 provider-profile — provider-profile → "견적 요청하기" 경로에서 우선 청명 지정 */
  preferredProviderId: z.string().min(10).optional(),
  
  // v1.7 견적기 맞춤화 관련 추가 필드
  quoteType: z.enum(["premium", "regular", "budget"]).optional(),
  frequency: z.string().optional(),
  frequencyCount: z.number().int().positive().optional(),
  
  // 2단계 견적을 위한 1차 기본 견적 계산 결과 필드
  baseAmount: z.number().int().nonnegative().optional(),
  optionsAmount: z.number().int().nonnegative().optional(),
  totalAmount: z.number().int().nonnegative().optional(),
  optionsList: z.array(z.object({
    label: z.string(),
    qty: z.number().int().positive(),
    price: z.number().int().nonnegative()
  })).optional(),
});

export type QuoteRequestInput = z.infer<typeof quoteRequestInputSchema>;
