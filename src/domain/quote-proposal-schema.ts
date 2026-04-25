import { z } from "zod";

export const quoteItemSchema = z.object({
  label: z.string().min(1, "항목명 필수").max(40, "항목명은 40자 이하"),
  price: z.number().int().min(0, "0원 이상").max(100_000_000),
  note: z.string().max(200).nullable().optional(),
});

/** Server Action input — totalAmount 없음 (서버 재계산) */
export const submitQuoteInputSchema = z.object({
  requestId: z.string().min(10),
  items: z.array(quoteItemSchema).min(1, "최소 1개 항목").max(10, "최대 10개 항목"),
  /** ISO datetime string | null */
  scheduledAt: z.string().datetime().nullable(),
  estimatedWorkHours: z.number().int().min(1).max(48).nullable(),
  insured: z.boolean(),
  insuranceAmount: z.number().int().min(0).max(10_000_000_000).nullable().optional(),
});

export type SubmitQuoteInput = z.infer<typeof submitQuoteInputSchema>;

export const passRequestInputSchema = z.object({
  requestId: z.string().min(10),
});

export type PassRequestInput = z.infer<typeof passRequestInputSchema>;

/** Client RHF 폼 schema — 날짜/시간 분리 + useFieldArray 호환 */
export const proposalFormSchema = z.object({
  items: z.array(quoteItemSchema).min(1).max(10),
  scheduledAtDate: z.string().optional(),
  scheduledAtTime: z.string().optional(),
  estimatedWorkHours: z.number().int().min(1).max(48).nullable(),
  insured: z.boolean(),
  insuranceAmount: z.number().int().min(0).nullable().optional(),
});

export type ProposalFormInput = z.infer<typeof proposalFormSchema>;
