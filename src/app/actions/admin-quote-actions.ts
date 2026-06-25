"use server";

import { revalidatePath } from "next/cache";
import { requireAdminApi } from "@/lib/auth/require-admin";
import { quoteRequestRepository } from "@/lib/firebase/quote-request-repository";
import { adminStorage, getStorageBucketName } from "@/lib/firebase/admin";
import { nanoid } from "nanoid";
import type { QuoteRequest, QuoteStatus } from "@/types/quote-request";
import type { Photo } from "@/types/page";
import { type ActionResult, actionError, toActionError } from "@/lib/errors";

/**
 * v1.17 - admin quote/booking management server actions
 */

export async function updateAdminQuoteRequestStatus(
  requestId: string,
  status: QuoteStatus
): Promise<ActionResult<null>> {
  try {
    await requireAdminApi();
    const req = await quoteRequestRepository.get(requestId);
    if (!req) return actionError("NOT_FOUND", "요청을 찾을 수 없습니다.");

    await quoteRequestRepository.update(requestId, { status });

    revalidatePath(`/admin/requests/${requestId}`);
    revalidatePath(`/received/${requestId}`);
    return { ok: true, data: null };
  } catch (err) {
    return toActionError(err);
  }
}

export async function updateAdminQuoteRequestWorker(
  requestId: string,
  workerAssignment: {
    assignedTeam: string;
    teamLeaderName: string;
    teamLeaderPhone: string;
    workerCount: number;
    estimatedHours: number;
  }
): Promise<ActionResult<null>> {
  try {
    await requireAdminApi();
    const req = await quoteRequestRepository.get(requestId);
    if (!req) return actionError("NOT_FOUND", "요청을 찾을 수 없습니다.");

    await quoteRequestRepository.update(requestId, { workerAssignment });

    revalidatePath(`/admin/requests/${requestId}`);
    revalidatePath(`/received/${requestId}`);
    return { ok: true, data: null };
  } catch (err) {
    return toActionError(err);
  }
}

export async function updateAdminQuoteRequestPayment(
  requestId: string,
  paymentData: {
    bookingNumber: string;
    hasDeposit: boolean;
    depositAmount: number;
    balanceAmount: number;
    paymentMethod: string;
  },
  totalAmount?: number
): Promise<ActionResult<null>> {
  try {
    await requireAdminApi();
    const req = await quoteRequestRepository.get(requestId);
    if (!req) return actionError("NOT_FOUND", "요청을 찾을 수 없습니다.");

    const updateData: Partial<QuoteRequest> = {
      bookingPayment: {
        bookingNumber: paymentData.bookingNumber,
        receivedAt: req.bookingPayment?.receivedAt ?? new Date(),
        hasDeposit: paymentData.hasDeposit,
        depositAmount: paymentData.depositAmount,
        balanceAmount: paymentData.balanceAmount,
        paymentMethod: paymentData.paymentMethod,
      }
    };

    if (totalAmount !== undefined) {
      updateData.totalAmount = totalAmount;
    }

    await quoteRequestRepository.update(requestId, updateData);

    revalidatePath(`/admin/requests/${requestId}`);
    revalidatePath(`/received/${requestId}`);
    return { ok: true, data: null };
  } catch (err) {
    return toActionError(err);
  }
}

export async function updateAdminQuoteRequestPhotos(
  requestId: string,
  type: "before" | "after",
  photos: Photo[]
): Promise<ActionResult<null>> {
  try {
    await requireAdminApi();
    const req = await quoteRequestRepository.get(requestId);
    if (!req) return actionError("NOT_FOUND", "요청을 찾을 수 없습니다.");

    if (type === "before") {
      await quoteRequestRepository.update(requestId, { photosBefore: photos });
    } else {
      await quoteRequestRepository.update(requestId, { photosAfter: photos });
    }

    revalidatePath(`/admin/requests/${requestId}`);
    revalidatePath(`/received/${requestId}`);
    return { ok: true, data: null };
  } catch (err) {
    return toActionError(err);
  }
}

export async function updateAdminQuoteRequestProviderPayment(
  requestId: string,
  providerPayment: number
): Promise<ActionResult<null>> {
  try {
    await requireAdminApi();
    const req = await quoteRequestRepository.get(requestId);
    if (!req) return actionError("NOT_FOUND", "요청을 찾을 수 없습니다.");

    await quoteRequestRepository.update(requestId, { providerPayment });

    revalidatePath(`/admin/requests/${requestId}`);
    revalidatePath(`/received/${requestId}`);
    return { ok: true, data: null };
  } catch (err) {
    return toActionError(err);
  }
}

/**
 * Admin photo upload action to bypass client auth rules.
 */
export async function uploadAdminPhoto(
  requestId: string,
  formData: FormData
): Promise<ActionResult<{ photo: Photo }>> {
  try {
    await requireAdminApi();
    const file = formData.get("file");
    if (!(file instanceof File)) {
      return actionError("INVALID_INPUT", "올바른 파일 형식이 아닙니다.");
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
    const filename = `${Date.now()}-${nanoid(10)}.${ext}`;
    const filePath = `photos/admin/${requestId}/${filename}`;

    const bucket = adminStorage.bucket(getStorageBucketName());
    const storageFile = bucket.file(filePath);

    await storageFile.save(buffer, {
      contentType: file.type,
      resumable: false,
      metadata: { cacheControl: "public, max-age=31536000, immutable" },
    });

    const bucketName = getStorageBucketName();
    const url = `https://firebasestorage.googleapis.com/v0/b/${bucketName}/o/${encodeURIComponent(filePath)}?alt=media`;

    return {
      ok: true,
      data: {
        photo: {
          url,
          path: filePath,
          order: 0,
        },
      },
    };
  } catch (err) {
    return toActionError(err);
  }
}

export async function deleteAdminPhoto(
  path: string
): Promise<ActionResult<null>> {
  try {
    await requireAdminApi();
    const bucket = adminStorage.bucket(getStorageBucketName());
    await bucket.file(path).delete();
    return { ok: true, data: null };
  } catch (err) {
    // best-effort
    console.warn("[deleteAdminPhoto] failed to delete from storage:", err);
    return { ok: true, data: null };
  }
}
