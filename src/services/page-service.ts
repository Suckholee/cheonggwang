import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import {
  pageRepository,
  type UpdatablePageFields,
} from "@/lib/firebase/page-repository";
import {
  slugRepository,
  SlugConflictError,
} from "@/lib/firebase/slug-repository";
import {
  userRepository,
  type PartnerFlag,
} from "@/lib/firebase/user-repository";
import { buildSlugCandidate } from "@/domain/slugify";
import { SLUG_MAX_ATTEMPTS } from "@/domain/constants";
import { AppError } from "@/lib/errors";
import type { Page } from "@/types/page";
import type { SavePageInput } from "@/domain/schemas";

export interface PublicPageView {
  page: Page;
  partner: PartnerFlag;
}

/**
 * 공개 페이지 `/p/[slug]` 전용 fetcher.
 * 'use cache' + cacheTag + cacheLife로 Next.js 16 ISR/PPR 체계에 등록된다.
 * publishPage/unpublishPage/deletePage에서 revalidateTag(`page:${slug}`, 'max')로
 * 무효화되므로 발행·수정·삭제 즉시 반영된다.
 */
export async function getPublicPageView(
  slug: string
): Promise<PublicPageView | null> {
  "use cache";
  cacheTag(`page:${slug}`);
  cacheLife("days");

  const entry = await slugRepository.get(slug);
  if (!entry) return null;
  const page = await pageRepository.get(entry.pageId);
  if (!page || !page.published) return null;
  const partner = await userRepository.getPartnerFlag(page.ownerUid);
  return { page, partner };
}

async function requireOwnedPage(pageId: string, uid: string): Promise<Page> {
  const page = await pageRepository.get(pageId);
  if (!page) throw new AppError("PAGE_NOT_FOUND", "페이지를 찾을 수 없어요");
  if (page.ownerUid !== uid) throw new AppError("FORBIDDEN", "접근 권한이 없습니다");
  return page;
}

export const pageService = {
  async listForOwner(uid: string): Promise<Page[]> {
    return pageRepository.listByOwner(uid);
  },

  async getForOwner(pageId: string, uid: string): Promise<Page> {
    return requireOwnedPage(pageId, uid);
  },

  async create(uid: string, input: SavePageInput): Promise<string> {
    return pageRepository.create(uid, input);
  },

  async update(
    pageId: string,
    uid: string,
    input: SavePageInput
  ): Promise<void> {
    await requireOwnedPage(pageId, uid);
    const patch: UpdatablePageFields = {
      category: input.category,
      businessName: input.businessName,
      address: input.address,
      phone: input.phone,
      keyPoints: input.keyPoints,
      photos: input.photos,
    };
    await pageRepository.update(pageId, patch);
  },

  async updateSections(
    pageId: string,
    uid: string,
    sections: Page["sections"]
  ): Promise<void> {
    await requireOwnedPage(pageId, uid);
    await pageRepository.update(pageId, { sections });
  },

  /** promo-feed v1 — generate 결과 일괄 반영 (sections + tags + region). */
  async updateGenerated(
    pageId: string,
    uid: string,
    payload: {
      sections: Page["sections"];
      tags: Page["tags"];
      region: Page["region"];
    }
  ): Promise<void> {
    await requireOwnedPage(pageId, uid);
    await pageRepository.update(pageId, payload);
  },

  async publish(pageId: string, uid: string): Promise<string> {
    const page = await requireOwnedPage(pageId, uid);

    if (page.slug) {
      if (!page.published) {
        await pageRepository.update(pageId, { published: true });
      }
      return page.slug;
    }

    let resolvedSlug: string | null = null;
    for (let attempt = 0; attempt < SLUG_MAX_ATTEMPTS; attempt++) {
      const candidate = buildSlugCandidate(page.businessName);
      try {
        await slugRepository.create(candidate, pageId);
        resolvedSlug = candidate;
        break;
      } catch (e) {
        if (e instanceof SlugConflictError) continue;
        throw e;
      }
    }
    if (!resolvedSlug) {
      throw new AppError(
        "SLUG_CONFLICT",
        "슬러그 발급에 실패했어요. 잠시 후 다시 시도해주세요"
      );
    }

    await pageRepository.update(pageId, {
      slug: resolvedSlug,
      published: true,
    });
    return resolvedSlug;
  },

  async unpublish(pageId: string, uid: string): Promise<void> {
    await requireOwnedPage(pageId, uid);
    await pageRepository.update(pageId, { published: false });
  },

  async delete(pageId: string, uid: string): Promise<void> {
    const page = await requireOwnedPage(pageId, uid);
    if (page.slug) {
      try {
        await slugRepository.delete(page.slug);
      } catch {
        // slug doc not found — tolerable
      }
    }
    await pageRepository.delete(pageId);
  },
};
