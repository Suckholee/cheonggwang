import { z } from "zod";
import { THREAD_ID_REGEX } from "@/domain/chat-schemas";

const FIVE_MIN_MS = 5 * 60 * 1000;

/**
 * v1.3 #1 booking — confirmBooking Server Action input schema.
 * scheduledAt은 Client `toISOString()`로 offset 포함 ISO 전송 · loose parse로 refine.
 */
export const confirmBookingInputSchema = z.object({
  threadId: z.string().regex(THREAD_ID_REGEX, "유효하지 않은 threadId"),
  scheduledAt: z
    .string()
    .min(1, "일정을 선택해 주세요")
    .refine(
      (v) => !Number.isNaN(new Date(v).getTime()),
      "유효하지 않은 일정",
    )
    .refine(
      (v) => new Date(v).getTime() >= Date.now() - FIVE_MIN_MS,
      "과거 시각은 확정할 수 없어요",
    ),
  memo: z
    .string()
    .trim()
    .max(200, "200자 이하로 작성해 주세요")
    .nullable(),
});

export type ConfirmBookingInput = z.infer<typeof confirmBookingInputSchema>;
