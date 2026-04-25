"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidateTag, updateTag } from "next/cache";
import { verifySessionCookie } from "@/lib/firebase/auth-admin";
import { SESSION_COOKIE_NAME } from "@/domain/constants";
import { pageService } from "@/services/page-service";
import {
  savePageInputSchema,
  sectionsSchema,
  type SavePageInput,
} from "@/domain/schemas";
import { categorySchema } from "@/domain/schemas";
import type { Sections } from "@/types/page";
import { findHygieneViolations } from "@/lib/llm/hygiene-guard";
import type { Category } from "@/types/page";
import {
  actionError,
  toActionError,
  type ActionResult,
} from "@/lib/errors";

async function requireUid(): Promise<string> {
  const jar = await cookies();
  const session = jar.get(SESSION_COOKIE_NAME)?.value;
  return verifySessionCookie(session);
}

/**
 * /editor/new에서 업종 선택만 받아 최소 placeholder 페이지 생성 → pageId 반환.
 * 상세 필드 검증을 완화하기 위해 savePageInputSchema 대신 최소 페이로드를 직접 작성.
 * 사용자는 /editor/{pageId}로 이동해 실제 정보를 채워 savePage로 완성.
 */
export async function createDraftPage(
  rawCategory: Category
): Promise<ActionResult<{ pageId: string }>> {
  try {
    const uid = await requireUid();
    const category = categorySchema.parse(rawCategory);

    const pageId = await pageService.create(uid, {
      category,
      businessName: "제목 없음",
      address: "주소 미입력",
      phone: "000-0000-0000",
      keyPoints: ["키포인트 1", "키포인트 2", "키포인트 3"],
      photos: [
        {
          url: "about:blank",
          path: "placeholder",
          order: 0,
        },
      ],
    });
    return { ok: true, data: { pageId } };
  } catch (e) {
    return toActionError(e);
  }
}

export async function savePage(
  input: SavePageInput
): Promise<ActionResult<{ pageId: string }>> {
  try {
    const uid = await requireUid();
    const parsed = savePageInputSchema.parse(input);

    let pageId: string;
    if (parsed.pageId) {
      await pageService.update(parsed.pageId, uid, parsed);
      pageId = parsed.pageId;
    } else {
      pageId = await pageService.create(uid, parsed);
    }

    // 편집자 읽기-내-쓰기 즉시 반영. 공개 페이지 캐시가 slug 기반으로 태그되어 있을 경우 슬러그별 태그도 만료.
    updateTag(`page:${pageId}`);
    const page = await pageService.getForOwner(pageId, uid);
    if (page.slug) updateTag(`page:${page.slug}`);
    // promo-feed v1 — 카드의 businessName/subtitle 변경 가능성 → 피드 무효화
    revalidateTag("feed", "max");

    return { ok: true, data: { pageId } };
  } catch (e) {
    return toActionError(e);
  }
}

export async function saveSections(
  pageId: string,
  sections: Sections
): Promise<ActionResult<null>> {
  try {
    if (!pageId) return actionError("INVALID_INPUT", "pageId가 없습니다");
    const uid = await requireUid();
    const parsed = sectionsSchema.parse(sections);

    // §1.2 hygiene 격리 — 수동 편집에도 적용
    const violations = findHygieneViolations(parsed);
    if (violations.length > 0) {
      const summary = violations
        .map((v) => `${v.section}.${v.field}(${v.matched})`)
        .join(", ");
      return actionError(
        "INVALID_INPUT",
        `청결·위생 어휘는 '위생 안심' 섹션에만 사용할 수 있어요: ${summary}`
      );
    }

    await pageService.updateSections(pageId, uid, parsed);
    updateTag(`page:${pageId}`);
    const page = await pageService.getForOwner(pageId, uid);
    if (page.slug) updateTag(`page:${page.slug}`);
    // promo-feed v1 — 카드의 hero.subtitle이 변경될 수 있음
    revalidateTag("feed", "max");
    return { ok: true, data: null };
  } catch (e) {
    return toActionError(e);
  }
}

export async function publishPage(
  pageId: string
): Promise<ActionResult<{ slug: string }>> {
  try {
    if (!pageId || typeof pageId !== "string") {
      return actionError("INVALID_INPUT", "pageId가 없습니다");
    }
    const uid = await requireUid();
    const slug = await pageService.publish(pageId, uid);
    // stale-while-revalidate로 공개 방문자에게 반영
    revalidateTag(`page:${slug}`, "max");
    // promo-feed v1 — 새로 발행된 게시글이 피드에 등장해야 함
    revalidateTag("feed", "max");
    return { ok: true, data: { slug } };
  } catch (e) {
    return toActionError(e);
  }
}

export async function unpublishPage(
  pageId: string
): Promise<ActionResult<null>> {
  try {
    const uid = await requireUid();
    const page = await pageService.getForOwner(pageId, uid);
    await pageService.unpublish(pageId, uid);
    if (page.slug) revalidateTag(`page:${page.slug}`, "max");
    // promo-feed v1 — 발행 취소된 게시글은 피드에서 즉시 사라져야 함
    revalidateTag("feed", "max");
    return { ok: true, data: null };
  } catch (e) {
    return toActionError(e);
  }
}

export async function deletePage(
  pageId: string
): Promise<ActionResult<null>> {
  try {
    const uid = await requireUid();
    const page = await pageService.getForOwner(pageId, uid);
    await pageService.delete(pageId, uid);
    if (page.slug) revalidateTag(`page:${page.slug}`, "max");
    // promo-feed v1 — 삭제된 게시글은 피드에서 사라져야 함
    revalidateTag("feed", "max");
    return { ok: true, data: null };
  } catch (e) {
    return toActionError(e);
  }
}

/**
 * /editor/new의 form action — 업종 선택 후 바로 /editor/{pageId}로 이동.
 * redirect()는 throw를 일으키므로 반드시 try 블록 밖 또는 성공 경로 끝에서 호출.
 */
export async function createDraftAndRedirect(formData: FormData): Promise<void> {
  const rawCategory = String(formData.get("category") ?? "") as Category;
  const result = await createDraftPage(rawCategory);
  if (!result.ok) {
    // 실패 시엔 다시 /editor/new로 (에러 메시지를 쿼리로 전달해도 됨)
    redirect(`/editor/new?err=${encodeURIComponent(result.message)}`);
  }
  redirect(`/editor/${result.data.pageId}`);
}
