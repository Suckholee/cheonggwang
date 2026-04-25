import { z } from "zod";
import { QUOTE_CATEGORIES, type QuoteCategory } from "./quote-category";
import { photoSchema, regionSchema } from "./quote-schemas";

/**
 * v1.1b #3 provider-profile-editor — 청명 자기 프로필 편집용 Zod schemas.
 * 4 Server Actions (updateProfileBasic, upsertPriceBook, createWorkCase, deleteWorkCase).
 */

export const basicInfoInputSchema = z.object({
  /** null = 명시적 삭제. "기존 유지"는 클라이언트 defaultValues로 기존 값 그대로 전달. */
  profileImage: photoSchema.nullable(),
  description: z.string().max(500).nullable(),
  regions: z.array(regionSchema).min(1, "지역 1개 이상").max(5, "최대 5개"),
  categories: z
    .array(
      z.enum(QUOTE_CATEGORIES as unknown as [QuoteCategory, ...QuoteCategory[]]),
    )
    .min(1, "카테고리 1개 이상")
    .max(6, "최대 6개"),
  contactPhone: z
    .string()
    .regex(/^[0-9]{2,4}-?[0-9]{3,4}-?[0-9]{4}$/, "전화번호 형식 오류")
    .nullable(),
});
export type BasicInfoInput = z.infer<typeof basicInfoInputSchema>;

export const priceBookEntrySchema = z.object({
  category: z.enum(
    QUOTE_CATEGORIES as unknown as [QuoteCategory, ...QuoteCategory[]],
  ),
  unit: z.enum(["per_visit", "per_month", "per_unit"]),
  unitLabel: z.string().min(1, "단위 라벨 필수").max(40),
  basePrice: z.number().int().min(0).max(100_000_000),
});

export const upsertPriceBookInputSchema = z.object({
  entries: z.array(priceBookEntrySchema).min(0).max(10),
});
export type UpsertPriceBookInput = z.infer<typeof upsertPriceBookInputSchema>;

export const createWorkCaseInputSchema = z.object({
  workCaseId: z.string().regex(/^[a-z0-9]{16}$/, "유효하지 않은 작업 ID"),
  category: z.enum(
    QUOTE_CATEGORIES as unknown as [QuoteCategory, ...QuoteCategory[]],
  ),
  sizeLabel: z.string().min(1, "작업 설명 필수").max(40),
  memo: z.string().max(200).nullable(),
  beforePhoto: photoSchema,
  afterPhoto: photoSchema,
});
export type CreateWorkCaseInput = z.infer<typeof createWorkCaseInputSchema>;

export const deleteWorkCaseInputSchema = z.object({
  workCaseId: z.string().min(10),
});
export type DeleteWorkCaseInput = z.infer<typeof deleteWorkCaseInputSchema>;
