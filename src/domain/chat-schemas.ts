import { z } from "zod";

/**
 * v1.2 #1 chat — Zod schemas + threadId regex.
 * threadId 형식: `${requestId}_${providerId}`
 *   · requestId = customAlphabet("0123456789abcdefghijklmnopqrstuvwxyz", 16)
 *   · providerId = Firestore auto ID [A-Za-z0-9]{20}
 */
export const THREAD_ID_REGEX = /^[A-Za-z0-9_-]+$/;

const threadIdSchema = z
  .string()
  .regex(THREAD_ID_REGEX, "유효하지 않은 threadId");

export const sendMessageInputSchema = z.object({
  threadId: threadIdSchema,
  text: z
    .string()
    .trim()
    .min(1, "메시지를 입력해 주세요")
    .max(2000, "2000자 이하로 작성해 주세요"),
});
export type SendMessageInput = z.infer<typeof sendMessageInputSchema>;

export const markThreadAsReadInputSchema = z.object({
  threadId: threadIdSchema,
});
export type MarkThreadAsReadInput = z.infer<typeof markThreadAsReadInputSchema>;

/** threadId 구성 util · deterministic · submitQuote TX · Client CTA 공통 */
export function buildThreadId(requestId: string, providerId: string): string {
  return `${requestId}_${providerId}`;
}
