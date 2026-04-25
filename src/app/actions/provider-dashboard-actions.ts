"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { z } from "zod";
import {
  SESSION_COOKIE_NAME,
  verifySessionCookie,
} from "@/lib/firebase/auth-admin";
import { userRepository } from "@/lib/firebase/user-repository";
import { providerRepository } from "@/lib/firebase/provider-repository";
import {
  AppError,
  actionError,
  toActionError,
  type ActionResult,
} from "@/lib/errors";

const setIsAvailableInputSchema = z.object({
  available: z.boolean(),
});

export type SetIsAvailableInput = z.infer<typeof setIsAvailableInputSchema>;

async function resolveProviderId(): Promise<string> {
  const jar = await cookies();
  const uid = await verifySessionCookie(jar.get(SESSION_COOKIE_NAME)?.value);
  const user = await userRepository.get(uid);
  if (!user?.providerId) {
    throw new AppError("FORBIDDEN", "청명 권한이 없습니다");
  }
  return user.providerId;
}

/** 활동중 토글 · providers.isAvailable 갱신 */
export async function setIsAvailable(
  rawInput: SetIsAvailableInput,
): Promise<ActionResult<{ isAvailable: boolean }>> {
  try {
    const input = setIsAvailableInputSchema.parse(rawInput);
    const providerId = await resolveProviderId();

    await providerRepository.update(providerId, {
      isAvailable: input.available,
    });

    revalidatePath("/provider/home");
    revalidatePath(`/providers/${providerId}`);
    return { ok: true, data: { isAvailable: input.available } };
  } catch (e) {
    if (typeof e === "object" && e !== null && "issues" in e) {
      return actionError("INVALID_INPUT", "입력 정보가 올바르지 않습니다");
    }
    return toActionError(e);
  }
}
