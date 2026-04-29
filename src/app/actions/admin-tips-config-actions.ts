"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { tipsConfigRepository } from "@/lib/firebase/tips-config-repository";
import { requireAdminApi } from "@/lib/auth/require-admin";
import { tipsTopicSchema } from "@/lib/tips/tips-config";

/**
 * v1.18 cycle #31 tips-admin-config · §3.6
 *
 * Admin server actions:
 *   - toggleAutoEnabled (S2)
 *   - addTopic (S4) — plain server form (M3 결의), C6 bind 패턴 미사용 (parameter 없음)
 *   - updateTopic (S4) — bind 패턴 (action={updateTopic.bind(null, topicId)})
 *   - setTopicActive (S5) — direct call (parameter)
 *
 * C1·M2 결의 — adminUid 인자 X (단일 admin literal "admin").
 * M10 결의 — zod parse fail → redirect ?error=validation (cycle #30 manual trigger 패턴).
 * L8 결의 — setTopicActive·addTopic·updateTopic이 /admin/tips + /admin/tips/topics 둘 다 revalidate
 *   (active count card stale 방지).
 */

const enabledSchema = z.boolean();

export async function toggleAutoEnabled(enabled: boolean): Promise<void> {
  await requireAdminApi();
  const value = enabledSchema.parse(enabled);
  await tipsConfigRepository.setEnabled(value);
  revalidatePath("/admin/tips");
}

export async function addTopic(formData: FormData): Promise<void> {
  await requireAdminApi();

  let parsed;
  try {
    parsed = tipsTopicSchema.parse({
      label: formData.get("label"),
      category: formData.get("category"),
      season: formData.get("season") || null,
      intent: formData.get("intent") || null,
      photoless: formData.get("photoless") === "on",
    });
  } catch (e) {
    console.warn("[admin-tips-config] addTopic validation failed", e);
    redirect("/admin/tips/topics/new?error=validation");
  }

  const id = await tipsConfigRepository.addTopic(parsed);
  revalidatePath("/admin/tips/topics");
  revalidatePath("/admin/tips");
  redirect(`/admin/tips/topics?added=${encodeURIComponent(id)}`);
}

export async function updateTopic(
  topicId: string,
  formData: FormData,
): Promise<void> {
  await requireAdminApi();

  let parsed;
  try {
    parsed = tipsTopicSchema.parse({
      label: formData.get("label"),
      category: formData.get("category"),
      season: formData.get("season") || null,
      intent: formData.get("intent") || null,
      photoless: formData.get("photoless") === "on",
    });
  } catch (e) {
    console.warn("[admin-tips-config] updateTopic validation failed", e);
    redirect(
      `/admin/tips/topics/${encodeURIComponent(topicId)}?error=validation`,
    );
  }

  await tipsConfigRepository.updateTopic(topicId, parsed);
  revalidatePath("/admin/tips/topics");
  revalidatePath("/admin/tips");
  redirect(`/admin/tips/topics?updated=${encodeURIComponent(topicId)}`);
}

export async function setTopicActive(
  topicId: string,
  isActive: boolean,
): Promise<void> {
  await requireAdminApi();
  await tipsConfigRepository.setTopicActive(topicId, isActive);
  revalidatePath("/admin/tips/topics");
  revalidatePath("/admin/tips");
}
