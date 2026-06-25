"use server";

import { cookies } from "next/headers";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase/admin";
import {
  SESSION_COOKIE_NAME,
  verifySessionCookie,
} from "@/lib/firebase/auth-admin";
import { checkAndIncrement } from "@/lib/firebase/rate-limit";
import { userRepository } from "@/lib/firebase/user-repository";
import { buildProviderResponseId } from "@/types/provider-response";
import { isRespondable, canAcceptQuote } from "@/domain/quote-status";
import {
  submitQuoteInputSchema,
  passRequestInputSchema,
  type SubmitQuoteInput,
  type PassRequestInput,
} from "@/domain/quote-proposal-schema";
import { z } from "zod";
import { providerRepository } from "@/lib/firebase/provider-repository";
import {
  buildThreadPayload,
  INITIAL_LAST_MESSAGE_PREVIEW,
} from "@/lib/quote/thread-upsert";
import { buildThreadId } from "@/domain/chat-schemas";
import {
  AppError,
  actionError,
  toActionError,
  type ActionResult,
} from "@/lib/errors";

// ─── acceptQuote (v1.1 #3 received-quotes) ──────────────
const acceptQuoteInputSchema = z.object({
  quoteId: z.string().min(10),
});
export type AcceptQuoteInput = z.infer<typeof acceptQuoteInputSchema>;

const QUOTE_RATE_LIMIT = 10;
const QUOTE_RATE_WINDOW_MS = 60 * 1000;

async function requireProviderContext(): Promise<{
  uid: string;
  providerId: string;
}> {
  const jar = await cookies();
  const uid = await verifySessionCookie(jar.get(SESSION_COOKIE_NAME)?.value);
  const user = await userRepository.get(uid);
  const providerId = (user as { providerId?: string } | null)?.providerId;
  if (!providerId) {
    throw new AppError("FORBIDDEN", "청명 계정만 사용할 수 있어요");
  }
  return { uid, providerId };
}

export async function passRequest(
  rawInput: PassRequestInput,
): Promise<ActionResult<{ requestId: string }>> {
  try {
    const input = passRequestInputSchema.parse(rawInput);
    const { providerId } = await requireProviderContext();

    const id = buildProviderResponseId(providerId, input.requestId);
    await adminDb
      .collection("providerResponses")
      .doc(id)
      .set(
        {
          providerId,
          requestId: input.requestId,
          status: "passed",
          respondedAt: FieldValue.serverTimestamp(),
        },
        { merge: true },
      );

    return { ok: true, data: { requestId: input.requestId } };
  } catch (e) {
    if (typeof e === "object" && e !== null && "issues" in e) {
      return actionError("INVALID_INPUT", "입력 정보가 올바르지 않습니다");
    }
    return toActionError(e);
  }
}

export async function submitQuote(
  rawInput: SubmitQuoteInput,
): Promise<ActionResult<{ quoteId: string }>> {
  try {
    // 1. Zod
    const input = submitQuoteInputSchema.parse(rawInput);

    // 2. auth + provider guard
    const { providerId } = await requireProviderContext();

    // 3. rate limit
    await checkAndIncrement(
      `quote:${providerId}`,
      QUOTE_RATE_LIMIT,
      QUOTE_RATE_WINDOW_MS,
    );

    // 4. 서버 재계산 totalAmount (client 신뢰 X)
    const totalAmount = input.items.reduce(
      (sum, item) => sum + item.price,
      0,
    );

    // 5. TX
    const reqRef = adminDb.collection("quoteRequests").doc(input.requestId);
    const prId = buildProviderResponseId(providerId, input.requestId);
    const prRef = adminDb.collection("providerResponses").doc(prId);
    const quoteRef = adminDb.collection("quotes").doc();
    const quoteId = quoteRef.id;
    const scheduledAt = input.scheduledAt
      ? new Date(input.scheduledAt)
      : null;

    await adminDb.runTransaction(async (tx) => {
      const reqSnap = await tx.get(reqRef);
      if (!reqSnap.exists) {
        throw new AppError("INVALID_INPUT", "요청을 찾을 수 없습니다");
      }
      const reqData = reqSnap.data()!;
      const currentStatus = String(reqData.status);
      if (!isRespondable(currentStatus as never)) {
        throw new AppError(
          "INVALID_STATE",
          "이미 진행중이거나 종료된 요청입니다",
        );
      }
      const clientUid = String(reqData.clientUid);
      if (!clientUid) {
        throw new AppError("INTERNAL_ERROR", "요청 데이터 오류");
      }

      const prSnap = await tx.get(prRef);
      if (prSnap.exists && prSnap.data()!.status === "quoted") {
        throw new AppError("ALREADY_QUOTED", "이미 견적을 보낸 요청입니다");
      }

      // v1.2 #1 chat — thread 자동 생성용 denorm fetch (provider + client)
      const providerRef = adminDb.collection("providers").doc(providerId);
      const providerSnap = await tx.get(providerRef);
      if (!providerSnap.exists) {
        throw new AppError("INTERNAL_ERROR", "청명 데이터 오류");
      }
      const providerData = providerSnap.data()!;
      const providerOwnerUid = String(providerData.ownerUid);
      const companyName = String(providerData.companyName);

      const clientUserRef = adminDb.collection("users").doc(clientUid);
      const clientUserSnap = await tx.get(clientUserRef);
      const clientDisplayNameRaw = clientUserSnap.exists
        ? ((clientUserSnap.data()!.displayName as string | undefined) ?? null)
        : null;

      const threadId = buildThreadId(input.requestId, providerId);
      const threadRef = adminDb.collection("threads").doc(threadId);
      const threadSnap = await tx.get(threadRef);

      // quotes.create
      tx.create(quoteRef, {
        requestId: input.requestId,
        providerId,
        clientUid,
        items: input.items.map((i) => ({
          label: i.label,
          price: i.price,
          note: i.note ?? null,
        })),
        scheduledAt: scheduledAt ? Timestamp.fromDate(scheduledAt) : null,
        estimatedWorkHours: input.estimatedWorkHours,
        totalAmount,
        insured: input.insured,
        insuranceAmount: input.insuranceAmount ?? null,
        status: "sent",
        sentAt: FieldValue.serverTimestamp(),
        acceptedAt: null,
        rejectedAt: null,
      });

      // providerResponses.set
      tx.set(
        prRef,
        {
          providerId,
          requestId: input.requestId,
          status: "quoted",
          respondedAt: FieldValue.serverTimestamp(),
        },
        { merge: true },
      );

      // quoteRequests.update — 이미 'quoted'면 idempotent (같은 값)
      if (currentStatus === "submitted") {
        tx.update(reqRef, { status: "quoted" });
      }

      // v1.2 #1 chat — thread upsert (재제출 시 unread 보존)
      const threadBase = buildThreadPayload({
        clientUid,
        providerId,
        providerOwnerUid,
        requestId: input.requestId,
        quoteId,
        companyName,
        clientDisplayNameRaw,
      });

      if (threadSnap.exists) {
        tx.update(threadRef, { ...threadBase });
      } else {
        tx.create(threadRef, {
          ...threadBase,
          lastMessageAt: null,
          lastMessagePreview: INITIAL_LAST_MESSAGE_PREVIEW,
          lastMessageSenderUid: null,
          unreadByClient: 1,
          unreadByProvider: 0,
          createdAt: FieldValue.serverTimestamp(),
        });
      }
    });

    return { ok: true, data: { quoteId } };
  } catch (e) {
    if (typeof e === "object" && e !== null && "issues" in e) {
      return actionError("INVALID_INPUT", "입력 정보가 올바르지 않습니다");
    }
    return toActionError(e);
  }
}

/**
 * acceptQuote — 의뢰인이 특정 청명의 견적서를 수락.
 * 9-step TX:
 *  1. Zod → 2. verifySessionCookie → clientUid
 *  3. TX: tx.get(quote) + status='sent' 검증
 *       + tx.get(request) + clientUid 일치 + canAcceptQuote(status) 검증
 *       + tx.update(quote, 'accepted') + tx.update(request, 'negotiating')
 *  4. providerRepository.get(providerId) → companyName (toast용)
 *  5. return {providerId, companyName}
 * 다른 quote들은 'sent' 유지 (경쟁 보존 — 의뢰인이 여러 청명과 협의 가능 v1.2+).
 */
export async function acceptQuote(
  rawInput: { quoteId: string },
): Promise<
  ActionResult<{ providerId: string; companyName: string }>
> {
  try {
    const input = acceptQuoteInputSchema.parse(rawInput);

    const jar = await cookies();
    const clientUid = await verifySessionCookie(
      jar.get(SESSION_COOKIE_NAME)?.value,
    );

    const quoteRef = adminDb.collection("quotes").doc(input.quoteId);

    let providerId = "";
    await adminDb.runTransaction(async (tx) => {
      const quoteSnap = await tx.get(quoteRef);
      if (!quoteSnap.exists) {
        throw new AppError("INVALID_INPUT", "견적을 찾을 수 없습니다");
      }
      const quoteData = quoteSnap.data()!;
      if (quoteData.status !== "sent") {
        throw new AppError(
          "ALREADY_ACCEPTED",
          "이미 수락되었거나 더 이상 수락할 수 없는 견적입니다",
        );
      }

      const requestId = String(quoteData.requestId);
      providerId = String(quoteData.providerId);
      const requestRef = adminDb
        .collection("quoteRequests")
        .doc(requestId);
      const requestSnap = await tx.get(requestRef);
      if (!requestSnap.exists) {
        throw new AppError("INVALID_INPUT", "요청을 찾을 수 없습니다");
      }
      const requestData = requestSnap.data()!;
      if (requestData.clientUid !== clientUid) {
        throw new AppError("FORBIDDEN", "본인 요청만 수락할 수 있어요");
      }
      const currentStatus = String(requestData.status);
      if (!canAcceptQuote(currentStatus as never)) {
        throw new AppError(
          "INVALID_STATE",
          "이미 다른 청명이 수락되었거나 진행중입니다",
        );
      }

      tx.update(quoteRef, {
        status: "accepted",
        acceptedAt: FieldValue.serverTimestamp(),
      });
      tx.update(requestRef, { status: "negotiating" });
    });

    // TX 성공 후 provider fetch (toast에 companyName 표시)
    const provider = await providerRepository.get(providerId);
    const companyName = provider?.companyName ?? "청명";

    return { ok: true, data: { providerId, companyName } };
  } catch (e) {
    if (typeof e === "object" && e !== null && "issues" in e) {
      return actionError("INVALID_INPUT", "입력 정보가 올바르지 않습니다");
    }
    return toActionError(e);
  }
}

// ─── updateFieldEstimate [NEW] ──────────────
const updateFieldEstimateInputSchema = z.object({
  quoteId: z.string().min(10),
  additionalAmount: z.number().int().nonnegative(),
  additionalReason: z.string().min(1).max(500),
});
export type UpdateFieldEstimateInput = z.infer<typeof updateFieldEstimateInputSchema>;

export async function updateFieldEstimate(
  rawInput: UpdateFieldEstimateInput,
): Promise<ActionResult<{ quoteId: string }>> {
  try {
    const input = updateFieldEstimateInputSchema.parse(rawInput);
    const { providerId } = await requireProviderContext();

    const quoteRef = adminDb.collection("quotes").doc(input.quoteId);

    await adminDb.runTransaction(async (tx) => {
      const quoteSnap = await tx.get(quoteRef);
      if (!quoteSnap.exists) {
        throw new AppError("INVALID_INPUT", "견적을 찾을 수 없습니다");
      }
      const quoteData = quoteSnap.data()!;
      if (quoteData.providerId !== providerId) {
        throw new AppError("FORBIDDEN", "본인이 보낸 견적만 업데이트할 수 있습니다");
      }
      // 해당 견적의 현재 상태가 accepted 또는 booked 또는 negotiating 인지 검증 (매칭 완료 상태)
      if (quoteData.status !== "accepted" && quoteData.status !== "booked") {
        throw new AppError(
          "INVALID_STATE",
          "매칭 완료된 견적만 현장 추가금을 등록할 수 있습니다",
        );
      }

      const totalAmount = typeof quoteData.totalAmount === "number" ? quoteData.totalAmount : 0;
      const finalAmount = totalAmount + input.additionalAmount;

      tx.update(quoteRef, {
        additionalAmount: input.additionalAmount,
        additionalReason: input.additionalReason,
        finalAmount,
      });

      // 실시간 채팅방에도 시스템 메시지를 남겨 알릴 수 있습니다.
      const threadId = buildThreadId(quoteData.requestId, providerId);
      const threadRef = adminDb.collection("threads").doc(threadId);
      const threadSnap = await tx.get(threadRef);
      if (threadSnap.exists) {
        const messageRef = threadRef.collection("messages").doc();
        const systemText = `🔔 현장 실측 결과가 반영된 2차 견적이 등록되었습니다.\n• 추가금: +${input.additionalAmount.toLocaleString()}원\n• 사유: ${input.additionalReason}\n• 최종 금액: ${finalAmount.toLocaleString()}원`;
        
        tx.create(messageRef, {
          threadId,
          senderUid: providerId,
          senderRole: "system",
          type: "system",
          text: systemText,
          createdAt: FieldValue.serverTimestamp(),
        });

        tx.update(threadRef, {
          lastMessageAt: FieldValue.serverTimestamp(),
          lastMessagePreview: `[2차 견적] 추가금 +${input.additionalAmount.toLocaleString()}원`,
          lastMessageSenderUid: providerId,
          unreadByClient: FieldValue.increment(1),
        });
      }
    });

    return { ok: true, data: { quoteId: input.quoteId } };
  } catch (e) {
    if (typeof e === "object" && e !== null && "issues" in e) {
      return actionError("INVALID_INPUT", "입력 정보가 올바르지 않습니다");
    }
    return toActionError(e);
  }
}

// ─── confirmFinalEstimate [NEW] ──────────────
const confirmFinalEstimateInputSchema = z.object({
  quoteId: z.string().min(10),
});
export type ConfirmFinalEstimateInput = z.infer<typeof confirmFinalEstimateInputSchema>;

export async function confirmFinalEstimate(
  rawInput: ConfirmFinalEstimateInput,
): Promise<ActionResult<{ quoteId: string }>> {
  try {
    const input = confirmFinalEstimateInputSchema.parse(rawInput);

    const jar = await cookies();
    const clientUid = await verifySessionCookie(
      jar.get(SESSION_COOKIE_NAME)?.value,
    );

    const quoteRef = adminDb.collection("quotes").doc(input.quoteId);

    await adminDb.runTransaction(async (tx) => {
      const quoteSnap = await tx.get(quoteRef);
      if (!quoteSnap.exists) {
        throw new AppError("INVALID_INPUT", "견적을 찾을 수 없습니다");
      }
      const quoteData = quoteSnap.data()!;
      if (quoteData.clientUid !== clientUid) {
        throw new AppError("FORBIDDEN", "본인 요청의 견적만 확정할 수 있습니다");
      }
      if (quoteData.status !== "accepted" && quoteData.status !== "booked") {
        throw new AppError(
          "INVALID_STATE",
          "진행 중인 견적만 최종 확정할 수 있습니다",
        );
      }

      const requestId = String(quoteData.requestId);
      const requestRef = adminDb.collection("quoteRequests").doc(requestId);
      const requestSnap = await tx.get(requestRef);
      if (!requestSnap.exists) {
        throw new AppError("INVALID_INPUT", "요청을 찾을 수 없습니다");
      }

      const finalConfirmedAmount = typeof quoteData.finalAmount === "number" ? quoteData.finalAmount : quoteData.totalAmount;

      tx.update(quoteRef, {
        finalConfirmed: true,
        finalConfirmedAt: FieldValue.serverTimestamp(),
        status: "completed",
      });

      tx.update(requestRef, {
        status: "completed",
      });

      // 관련 booking이 있다면 booking의 totalAmount도 최종금액으로 갱신
      const bookingsSnap = await tx.get(
        adminDb.collection("bookings").where("quoteId", "==", input.quoteId).limit(1)
      );
      if (!bookingsSnap.empty) {
        const bookingDoc = bookingsSnap.docs[0];
        tx.update(bookingDoc.ref, {
          totalAmount: finalConfirmedAmount,
        });
      }

      // 실시간 채팅방에도 시스템 메시지를 남겨 알릴 수 있습니다.
      const providerId = String(quoteData.providerId);
      const threadId = buildThreadId(requestId, providerId);
      const threadRef = adminDb.collection("threads").doc(threadId);
      const threadSnap = await tx.get(threadRef);
      if (threadSnap.exists) {
        const messageRef = threadRef.collection("messages").doc();
        const systemText = `🎉 최종 견적이 수락되었으며 청소 예약이 최종 확정되었습니다!`;
        
        tx.create(messageRef, {
          threadId,
          senderUid: clientUid,
          senderRole: "system",
          type: "system",
          text: systemText,
          createdAt: FieldValue.serverTimestamp(),
        });

        tx.update(threadRef, {
          lastMessageAt: FieldValue.serverTimestamp(),
          lastMessagePreview: systemText,
          lastMessageSenderUid: clientUid,
          unreadByProvider: FieldValue.increment(1),
        });
      }
    });

    return { ok: true, data: { quoteId: input.quoteId } };
  } catch (e) {
    if (typeof e === "object" && e !== null && "issues" in e) {
      return actionError("INVALID_INPUT", "입력 정보가 올바르지 않습니다");
    }
    return toActionError(e);
  }
}

