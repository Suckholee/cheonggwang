"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { cookies } from "next/headers";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase/admin";
import {
  SESSION_COOKIE_NAME,
  verifySessionCookie,
} from "@/lib/firebase/auth-admin";
import {
  confirmBookingInputSchema,
  type ConfirmBookingInput,
} from "@/domain/booking-schemas";
import { formatScheduledLabel } from "@/domain/booking-day-bucket";
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
 * v1.3 #1 booking — 청명 chat에서 일정 확정.
 * TX 3R/5W:
 *   reads  = thread · quote · request
 *   writes = booking.create · quote.update · request.update · message.create · thread.update
 */
export async function confirmBooking(
  rawInput: ConfirmBookingInput,
): Promise<ActionResult<{ bookingId: string }>> {
  try {
    const input = confirmBookingInputSchema.parse(rawInput);
    const uid = await resolveUid();

    const threadRef = adminDb.collection("threads").doc(input.threadId);
    const bookingRef = adminDb.collection("bookings").doc();
    const bookingId = bookingRef.id;
    const messageRef = threadRef.collection("messages").doc();

    const scheduledDate = new Date(input.scheduledAt);
    const scheduledLabel = formatScheduledLabel(scheduledDate.getTime());
    const baseText = `🗓️ ${scheduledLabel} 일정이 확정됐어요`;
    const systemText = input.memo ? `${baseText}\n${input.memo}` : baseText;

    let createdBookingId = bookingId;
    let requestIdForRevalidate = "";

    await adminDb.runTransaction(async (tx) => {
      // ── Reads (3)
      const threadSnap = await tx.get(threadRef);
      if (!threadSnap.exists) {
        throw new AppError("FORBIDDEN", "채팅방을 찾을 수 없어요");
      }
      const thread = threadSnap.data()!;
      if (String(thread.providerOwnerUid) !== uid) {
        throw new AppError("FORBIDDEN", "청명만 일정을 확정할 수 있어요");
      }
      const quoteId = thread.quoteId as string | null;
      if (!quoteId) {
        throw new AppError("INVALID_STATE", "견적이 없는 채팅방이에요");
      }
      const quoteRef = adminDb.collection("quotes").doc(quoteId);
      const quoteSnap = await tx.get(quoteRef);
      if (!quoteSnap.exists) {
        throw new AppError("INVALID_STATE", "견적을 찾을 수 없어요");
      }
      const quote = quoteSnap.data()!;
      const quoteStatus = String(quote.status);
      if (quoteStatus === "booked") {
        throw new AppError("INVALID_STATE", "이미 확정된 일정이에요");
      }
      if (quoteStatus !== "sent" && quoteStatus !== "accepted") {
        throw new AppError(
          "INVALID_STATE",
          "취소된 견적에는 일정을 확정할 수 없어요",
        );
      }

      const requestId = String(thread.requestId);
      requestIdForRevalidate = requestId;
      const requestRef = adminDb.collection("quoteRequests").doc(requestId);
      const requestSnap = await tx.get(requestRef);
      if (!requestSnap.exists) {
        throw new AppError("INVALID_STATE", "요청을 찾을 수 없어요");
      }
      const request = requestSnap.data()!;

      // ── Denorm fail-fast
      const providerId = String(thread.providerId);
      const providerOwnerUid = String(thread.providerOwnerUid);
      const clientUid = String(thread.clientUid);
      const companyName = String(thread.companyName);
      const clientDisplayName = String(thread.clientDisplayName);
      if (
        !providerId ||
        !providerOwnerUid ||
        !clientUid ||
        !companyName ||
        !clientDisplayName
      ) {
        throw new AppError("INTERNAL_ERROR", "채팅방 데이터 오류");
      }

      const regionRaw = request.region as
        | { city?: string; district?: string }
        | undefined;
      const regionLabel =
        regionRaw?.city && regionRaw?.district
          ? `${regionRaw.city} ${regionRaw.district}`
          : "지역 미지정";

      const totalAmount =
        typeof quote.totalAmount === "number" ? quote.totalAmount : 0;
      const category = quote.category ?? request.category;

      // ── Writes (5)
      tx.create(bookingRef, {
        quoteId,
        requestId,
        threadId: input.threadId,
        providerId,
        providerOwnerUid,
        clientUid,
        companyName,
        clientDisplayName,
        category,
        regionLabel,
        scheduledAt: Timestamp.fromDate(scheduledDate),
        totalAmount,
        memo: input.memo,
        status: "confirmed",
        createdBy: uid,
        createdAt: FieldValue.serverTimestamp(),
      });

      tx.update(quoteRef, {
        status: "booked",
        acceptedAt: quote.acceptedAt ?? FieldValue.serverTimestamp(),
      });

      tx.update(requestRef, { status: "booked" });

      tx.create(messageRef, {
        threadId: input.threadId,
        senderUid: uid,
        senderRole: "provider",
        type: "system",
        text: systemText,
        createdAt: FieldValue.serverTimestamp(),
      });

      tx.update(threadRef, {
        lastMessageAt: FieldValue.serverTimestamp(),
        lastMessagePreview: systemText.slice(0, 80),
        lastMessageSenderUid: uid,
        unreadByClient: FieldValue.increment(1),
      });

      createdBookingId = bookingId;
    });

    // Static views revalidate (chat은 onSnapshot 자동 반영)
    revalidatePath("/provider/works");
    if (requestIdForRevalidate) {
      revalidatePath(`/received/${requestIdForRevalidate}`);
    }

    return { ok: true, data: { bookingId: createdBookingId } };
  } catch (e) {
    if (typeof e === "object" && e !== null && "issues" in e) {
      return actionError("INVALID_INPUT", "입력 정보가 올바르지 않습니다");
    }
    return toActionError(e);
  }
}

const submitWorkReportInputSchema = z.object({
  bookingId: z.string(),
  completionStatus: z.string(),
  checklist: z.array(z.string()),
  note: z.string().nullable(),
  photos: z.array(z.string()),
});

export type SubmitWorkReportInput = z.infer<typeof submitWorkReportInputSchema>;

export async function submitWorkReport(
  rawInput: SubmitWorkReportInput,
): Promise<ActionResult<{ bookingId: string }>> {
  try {
    const input = submitWorkReportInputSchema.parse(rawInput);
    const uid = await resolveUid();

    const bookingRef = adminDb.collection("bookings").doc(input.bookingId);
    
    await adminDb.runTransaction(async (tx) => {
      const snap = await tx.get(bookingRef);
      if (!snap.exists) {
        throw new AppError("INVALID_STATE", "일정을 찾을 수 없어요");
      }
      const b = snap.data()!;
      if (b.providerOwnerUid !== uid) {
        throw new AppError("FORBIDDEN", "본인의 일정에만 보고서를 작성할 수 있어요");
      }

      tx.update(bookingRef, {
        status: "completed",
        report: {
          completionStatus: input.completionStatus,
          checklist: input.checklist,
          note: input.note,
          photos: input.photos,
          submittedAt: FieldValue.serverTimestamp(),
        },
      });
    });

    revalidatePath("/provider/works");
    return { ok: true, data: { bookingId: input.bookingId } };
  } catch (e) {
    if (typeof e === "object" && e !== null && "issues" in e) {
      return actionError("INVALID_INPUT", "입력 정보가 올바르지 않습니다");
    }
    return toActionError(e);
  }
}
