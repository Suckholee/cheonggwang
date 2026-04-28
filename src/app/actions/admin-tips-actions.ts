"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { FieldValue } from "firebase-admin/firestore";
import { requireAdminApi } from "@/lib/auth/require-admin";
import { adminDb } from "@/lib/firebase/admin";
import { composeTipDraft, type TipTopic } from "@/lib/llm/tips-generator";
import { tipRepository } from "@/lib/firebase/tip-repository";
import { inferCategoriesFromTopic } from "@/lib/tips/infer-categories";
import { pickStockImage } from "@/lib/tips/stock-images";
import { uniqueSlug } from "@/lib/slug";

/**
 * v1.17 cycle #30 cleaning-tips-content · §3.11 (A2 manual trigger)
 *
 * 관리자가 임의 토픽으로 즉시 1건 draft 생성. 일일 1건 제한 X (admin override).
 * NEW-L4: form action signature — searchParam-based feedback (useActionState 미사용).
 */

const triggerSchema = z.object({
  topicLabel: z.string().min(5).max(120),
  category: z.enum(["bathroom", "kitchen", "aircon", "living", "move", "general"]),
  intent: z
    .enum(["howto", "guide", "checklist", "comparison", "qa"])
    .optional(),
  photoless: z.boolean().default(false),
});

function nanoid16(): string {
  const alphabet =
    "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
  let id = "";
  for (let i = 0; i < 16; i++) {
    id += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return id;
}

export async function triggerTipGeneration(formData: FormData): Promise<void> {
  await requireAdminApi();
  const parsed = triggerSchema.parse({
    topicLabel: formData.get("topicLabel"),
    category: formData.get("category"),
    intent: formData.get("intent") || undefined,
    photoless: formData.get("photoless") === "on",
  });

  const topic: TipTopic = {
    id: `manual-${Date.now()}`,
    label: parsed.topicLabel,
    category: parsed.category,
    intent: parsed.intent,
    photoless: parsed.photoless,
  };

  const recentTitles = await tipRepository.listRecentTipTitles(20);

  let draft;
  try {
    draft = await composeTipDraft({ topic, recentTitles });
  } catch (e) {
    console.error("[admin-tips] compose failed", e);
    redirect("/admin/tips?error=compose-fail");
  }

  if (!draft.passed) {
    console.warn(`[admin-tips] hygiene failed: ${draft.reasons.join(", ")}`);
    redirect("/admin/tips?error=hygiene-fail");
  }

  const postId = nanoid16();
  const slug = await uniqueSlug(adminDb, draft.title);
  await adminDb
    .collection("posts")
    .doc(postId)
    .create({
      providerId: "cheonggwang-staff",
      providerOwnerUid: "admin",
      companyName: "청광",
      categories: inferCategoriesFromTopic(topic),
      regionLabel: null,
      title: draft.title,
      slug,
      coverImageUrl: topic.photoless ? null : pickStockImage(topic.category),
      coverImageAlt: draft.coverImageAlt ?? null,
      bodyMarkdown: draft.bodyMarkdown,
      summary80: draft.summary80,
      topicHint: topic.id,
      brandTone: "friendly",
      postType: "tip",
      publishStatus: "draft", // R16
      isAutoSeries: false, // R17
      format: "blog", // R18
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });

  revalidatePath("/admin/tips");
  revalidatePath("/community/tips");
  redirect("/admin/tips?recently-generated=1");
}
