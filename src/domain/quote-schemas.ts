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
  category: z.enum(
    QUOTE_CATEGORIES as unknown as [QuoteCategory, ...QuoteCategory[]],
  ),
  region: regionSchema,
  size: z.number().int().positive().max(500).nullable(),
  // ISO date string; Server Action 내에서 Date로 변환해 Repository에 전달.
  preferredDate: z.string().datetime().nullable(),
  contactPhone: z
    .string()
    .regex(
      /^[0-9]{2,4}-?[0-9]{3,4}-?[0-9]{4}$/,
      "전화번호 형식이 올바르지 않습니다",
    ),
  photos: z.array(photoSchema).max(5),
  note: z.string().max(500).nullable(),
  /** v1.1b #2 provider-profile — provider-profile → "견적 요청하기" 경로에서 우선 청명 지정 */
  preferredProviderId: z.string().min(10).optional(),
});

export type QuoteRequestInput = z.infer<typeof quoteRequestInputSchema>;
