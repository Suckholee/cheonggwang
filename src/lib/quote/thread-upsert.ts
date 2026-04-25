import { maskName } from "@/lib/firebase/review-repository";

/**
 * v1.2 #1 chat — Thread 생성 payload pure helper.
 * submitQuote TX 내부에서 호출 · denormalized 필드 snapshot.
 */

export interface BuildThreadPayloadInput {
  clientUid: string;
  providerId: string;
  providerOwnerUid: string;
  requestId: string;
  quoteId: string;
  companyName: string;
  clientDisplayNameRaw: string | null;
}

export interface ThreadBasePayload {
  clientUid: string;
  providerId: string;
  providerOwnerUid: string;
  requestId: string;
  quoteId: string;
  companyName: string;
  clientDisplayName: string;
}

export function buildThreadPayload(
  input: BuildThreadPayloadInput,
): ThreadBasePayload {
  const clientDisplayName = maskName(
    input.clientDisplayNameRaw ?? input.clientUid.slice(0, 6),
  );
  return {
    clientUid: input.clientUid,
    providerId: input.providerId,
    providerOwnerUid: input.providerOwnerUid,
    requestId: input.requestId,
    quoteId: input.quoteId,
    companyName: input.companyName,
    clientDisplayName,
  };
}

export const INITIAL_LAST_MESSAGE_PREVIEW =
  "견적이 도착했어요 · 협의를 시작하세요";
