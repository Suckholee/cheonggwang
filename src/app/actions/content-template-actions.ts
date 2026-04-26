"use server";

import { nanoid } from "nanoid";
import { requireAdminApi } from "@/lib/auth/require-admin";
import {
  contentTemplateFormSchema,
  type ContentTemplateFormInput,
} from "@/domain/content-template-schema";
import { contentTemplateRepository } from "@/lib/firebase/content-template-repository";
import { AppError } from "@/lib/errors";
import type {
  ContentTemplate,
  ContentTemplateType,
} from "@/types/content-template";
import type { PartnerIndustry } from "@/domain/partner-industry";

/**
 * v1.11 partner-rag-system · §5.6 — admin curated 컨텐츠 템플릿 CRUD.
 * R7·C5: Admin SDK only.
 */

interface ActionResult<T = void> {
  ok: boolean;
  message?: string;
  data?: T;
}

export async function saveContentTemplate(
  input: ContentTemplateFormInput,
): Promise<ActionResult<{ id: string }>> {
  try {
    await requireAdminApi();
    const parsed = contentTemplateFormSchema.parse(input);
    const id = parsed.id ?? nanoid(12);
    const { id: _ignore, ...rest } = parsed;
    await contentTemplateRepository.upsert(id, rest, "admin");
    return { ok: true, data: { id } };
  } catch (e) {
    return toActionError(e);
  }
}

export async function deleteContentTemplate(
  id: string,
): Promise<ActionResult> {
  try {
    await requireAdminApi();
    if (!id) throw new AppError("INVALID_INPUT", "id 필요");
    await contentTemplateRepository.delete(id);
    return { ok: true };
  } catch (e) {
    return toActionError(e);
  }
}

export async function listContentTemplatesForAdmin(filter?: {
  industry?: PartnerIndustry;
  type?: ContentTemplateType;
}): Promise<ContentTemplate[]> {
  await requireAdminApi();
  return contentTemplateRepository.listAll(filter);
}

function toActionError<T = void>(e: unknown): ActionResult<T> {
  if (e instanceof AppError) {
    return { ok: false, message: e.message };
  }
  console.error("[content-template-actions]", e);
  return { ok: false, message: "일시적 오류" };
}
