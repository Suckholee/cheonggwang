"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import {
  SESSION_COOKIE_NAME,
  verifySessionCookie,
} from "@/lib/firebase/auth-admin";
import { userRepository } from "@/lib/firebase/user-repository";
import { providerRepository } from "@/lib/firebase/provider-repository";
import { workCaseRepository } from "@/lib/firebase/work-case-repository";
import { adminStorage } from "@/lib/firebase/admin";
import {
  basicInfoInputSchema,
  upsertPriceBookInputSchema,
  createWorkCaseInputSchema,
  deleteWorkCaseInputSchema,
  type BasicInfoInput,
  type UpsertPriceBookInput,
  type CreateWorkCaseInput,
  type DeleteWorkCaseInput,
} from "@/domain/provider-editor-schema";
import {
  AppError,
  actionError,
  toActionError,
  type ActionResult,
} from "@/lib/errors";

function bucket() {
  const name = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;
  return adminStorage.bucket(name || undefined);
}

async function deleteStorageSafely(path: string | undefined | null) {
  if (!path) return;
  try {
    await bucket().file(path).delete();
  } catch (e) {
    console.warn(`[provider-editor] Storage delete failed (${path}):`, e);
  }
}

async function resolveProviderId(): Promise<string> {
  const jar = await cookies();
  const uid = await verifySessionCookie(
    jar.get(SESSION_COOKIE_NAME)?.value,
  );
  const user = await userRepository.get(uid);
  if (!user?.providerId) {
    throw new AppError("FORBIDDEN", "청명 권한이 없습니다");
  }
  return user.providerId;
}

/** 기본 정보 저장 (profileImage · description · regions · categories · contactPhone) */
export async function updateProfileBasic(
  rawInput: BasicInfoInput,
): Promise<ActionResult<{ providerId: string }>> {
  try {
    const input = basicInfoInputSchema.parse(rawInput);
    const providerId = await resolveProviderId();

    const current = await providerRepository.get(providerId);
    if (!current) {
      throw new AppError("FORBIDDEN", "청명 레코드를 찾을 수 없습니다");
    }
    const oldPath = current.profileImagePath;
    const newPath = input.profileImage?.path ?? null;

    await providerRepository.update(providerId, {
      profileImage: input.profileImage?.url ?? null,
      profileImagePath: newPath,
      description: input.description,
      regions: input.regions,
      categories: input.categories,
      contactPhone: input.contactPhone,
    });

    if (oldPath && oldPath !== newPath) {
      await deleteStorageSafely(oldPath);
    }

    revalidatePath("/provider/profile");
    revalidatePath(`/providers/${providerId}`);
    return { ok: true, data: { providerId } };
  } catch (e) {
    if (typeof e === "object" && e !== null && "issues" in e) {
      return actionError("INVALID_INPUT", "입력 정보가 올바르지 않습니다");
    }
    return toActionError(e);
  }
}

/** 단가표 전체 저장 (replace) */
export async function upsertPriceBook(
  rawInput: UpsertPriceBookInput,
): Promise<ActionResult<{ providerId: string; count: number }>> {
  try {
    const input = upsertPriceBookInputSchema.parse(rawInput);
    const providerId = await resolveProviderId();

    await providerRepository.update(providerId, {
      priceBook: input.entries,
    });

    revalidatePath("/provider/profile");
    revalidatePath(`/providers/${providerId}`);
    return {
      ok: true,
      data: { providerId, count: input.entries.length },
    };
  } catch (e) {
    if (typeof e === "object" && e !== null && "issues" in e) {
      return actionError("INVALID_INPUT", "입력 정보가 올바르지 않습니다");
    }
    return toActionError(e);
  }
}

/** Before/After 작업 사례 생성 */
export async function createWorkCase(
  rawInput: CreateWorkCaseInput,
): Promise<ActionResult<{ workCaseId: string }>> {
  try {
    const input = createWorkCaseInputSchema.parse(rawInput);
    const providerId = await resolveProviderId();

    await workCaseRepository.create(input.workCaseId, {
      providerId,
      category: input.category,
      sizeLabel: input.sizeLabel,
      memo: input.memo,
      beforePhoto: input.beforePhoto,
      afterPhoto: input.afterPhoto,
    });

    revalidatePath("/provider/profile");
    revalidatePath(`/providers/${providerId}`);
    return { ok: true, data: { workCaseId: input.workCaseId } };
  } catch (e) {
    if (typeof e === "object" && e !== null && "issues" in e) {
      return actionError("INVALID_INPUT", "입력 정보가 올바르지 않습니다");
    }
    return toActionError(e);
  }
}

/** 작업 사례 삭제 (ownership 검증 + Storage 파일 best-effort 정리) */
export async function deleteWorkCase(
  rawInput: DeleteWorkCaseInput,
): Promise<ActionResult<{ workCaseId: string }>> {
  try {
    const input = deleteWorkCaseInputSchema.parse(rawInput);
    const providerId = await resolveProviderId();

    const workCase = await workCaseRepository.get(input.workCaseId);
    if (!workCase) {
      throw new AppError("FORBIDDEN", "존재하지 않는 작업입니다");
    }
    if (workCase.providerId !== providerId) {
      throw new AppError("FORBIDDEN", "다른 청명의 작업은 삭제할 수 없습니다");
    }

    await deleteStorageSafely(workCase.beforePhoto.path);
    await deleteStorageSafely(workCase.afterPhoto.path);
    await workCaseRepository.delete(input.workCaseId);

    revalidatePath("/provider/profile");
    revalidatePath(`/providers/${providerId}`);
    return { ok: true, data: { workCaseId: input.workCaseId } };
  } catch (e) {
    if (typeof e === "object" && e !== null && "issues" in e) {
      return actionError("INVALID_INPUT", "입력 정보가 올바르지 않습니다");
    }
    return toActionError(e);
  }
}
