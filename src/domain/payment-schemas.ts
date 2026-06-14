import { z } from "zod";
import { THREAD_ID_REGEX } from "./chat-schemas";

export const requestPaymentInputSchema = z.object({
  threadId: z.string().regex(THREAD_ID_REGEX, "유효하지 않은 threadId"),
  bookingId: z.string().min(1, "유효하지 않은 bookingId"),
  amount: z.number().positive("금액은 양수여야 합니다"),
});

export type RequestPaymentInput = z.infer<typeof requestPaymentInputSchema>;

export const approvePaymentInputSchema = z.object({
  paymentKey: z.string().min(1, "paymentKey는 필수입니다"),
  orderId: z.string().min(1, "orderId는 필수입니다"),
  amount: z.number().positive("금액은 양수여야 합니다"),
  bookingId: z.string().min(1, "bookingId는 필수입니다"),
  threadId: z.string().min(1, "threadId는 필수입니다"),
});

export type ApprovePaymentInput = z.infer<typeof approvePaymentInputSchema>;
