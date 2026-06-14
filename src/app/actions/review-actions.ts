"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase/admin";
import {
  SESSION_COOKIE_NAME,
  verifySessionCookie,
} from "@/lib/firebase/auth-admin";
import {
  createReviewInputSchema,
  type CreateReviewInput,
} from "@/domain/review-schemas";
import { reviewRepository } from "@/lib/firebase/review-repository";
import {
  AppError,
  actionError,
  toActionError,
  type ActionResult,
} from "@/lib/errors";

async function resolveUid(): Promise<string> {
  const jar = await cookies();
  return verifySessionCookie(jar.get(SESSION_COOKIE_NAME)?.value);
}

/**
 * v2 review — 고객이 작업 완료 후 후기 작성.
 */
export async function createReview(
  rawInput: CreateReviewInput,
): Promise<ActionResult<{ reviewId: string }>> {
  try {
    const input = createReviewInputSchema.parse(rawInput);
    const uid = await resolveUid();

    const bookingRef = adminDb.collection("bookings").doc(input.bookingId);
    const reviewRef = adminDb.collection("reviews").doc();
    const reviewId = reviewRef.id;

    let threadId = "";
    let providerId = "";

    await adminDb.runTransaction(async (tx) => {
      // 1. 예약 검증
      const bookingSnap = await tx.get(bookingRef);
      if (!bookingSnap.exists) {
        throw new AppError("INVALID_STATE", "일정을 찾을 수 없어요");
      }
      const booking = bookingSnap.data()!;
      if (booking.clientUid !== uid) {
        throw new AppError("FORBIDDEN", "본인의 일정에만 후기를 작성할 수 있어요");
      }
      if (booking.status !== "completed") {
        throw new AppError("INVALID_STATE", "완료된 일정에만 후기를 작성할 수 있어요");
      }

      threadId = String(booking.threadId);
      providerId = String(booking.providerId);

      // 2. 중복 검사
      const existingReviewsQuery = adminDb
        .collection("reviews")
        .where("bookingId", "==", input.bookingId)
        .limit(1);
      const existingSnap = await tx.get(existingReviewsQuery);
      if (!existingSnap.empty) {
        throw new AppError("INVALID_STATE", "이미 이 일정에 후기를 작성하셨습니다");
      }

      // 3. 청명 프로필 평점 및 리뷰 수 업데이트
      const providerRef = adminDb.collection("providers").doc(providerId);
      const providerSnap = await tx.get(providerRef);
      if (!providerSnap.exists) {
        throw new AppError("INVALID_STATE", "청명을 찾을 수 없어요");
      }
      const provider = providerSnap.data()!;
      
      const oldAvg = typeof provider.rating === "number" ? provider.rating : 0;
      const oldCount = typeof provider.reviewCount === "number" ? provider.reviewCount : 0;
      const newCount = oldCount + 1;
      const newAvg = Number(((oldAvg * oldCount + input.rating) / newCount).toFixed(1));

      // 4. 작성
      tx.create(reviewRef, {
        bookingId: input.bookingId,
        providerId,
        clientUid: uid,
        rating: input.rating,
        text: input.text,
        createdAt: FieldValue.serverTimestamp(),
        providerReply: null,
      });

      tx.update(providerRef, {
        rating: newAvg,
        reviewCount: newCount,
        updatedAt: FieldValue.serverTimestamp(),
      });

      // 5. 채팅방 시스템 메시지 전송
      const threadRef = adminDb.collection("threads").doc(threadId);
      const messageRef = threadRef.collection("messages").doc();
      const systemText = `⭐️ 고객님이 후기를 작성했습니다 (평점: ${input.rating}점)\n"${input.text}"`;

      tx.create(messageRef, {
        threadId,
        senderUid: uid,
        senderRole: "client",
        type: "system",
        text: systemText,
        createdAt: FieldValue.serverTimestamp(),
      });

      tx.update(threadRef, {
        lastMessageAt: FieldValue.serverTimestamp(),
        lastMessagePreview: `⭐️ 후기 작성: ${input.text.slice(0, 50)}`,
        lastMessageSenderUid: uid,
        unreadByProvider: FieldValue.increment(1),
      });
    });

    revalidatePath(`/chat/${threadId}`);
    revalidatePath(`/providers/${providerId}`);
    revalidatePath("/provider/home");

    return { ok: true, data: { reviewId } };
  } catch (e) {
    if (typeof e === "object" && e !== null && "issues" in e) {
      return actionError("INVALID_INPUT", "입력 정보가 올바르지 않습니다");
    }
    return toActionError(e);
  }
}
