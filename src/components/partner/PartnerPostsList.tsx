import Link from "next/link";
import { PartnerPostCard } from "./PartnerPostCard";
import type { Post, PublishStatus } from "@/types/post";

/**
 * v1.12 cycle #25 partner-content-formats · §5.2.
 *
 * 파트너 본인 글 카드 그리드. status별 그룹핑 유지 (Phase 3 결정).
 * 클릭 라우팅: 모든 status가 `/community/p/{slug}` 단일 경로 (R5/C5 결의).
 *  - published       → 정상 공개페이지
 *  - draft·withdrawn → owner-only 미리보기 + noindex 배너 (cycle #19 기존 구현)
 */

interface Props {
  posts: Post[];
  /** partner.profile?.photoUrls?.[0] — post.coverImageUrl 누락 시 fallback */
  partnerCover: string | null;
}

const STATUS_LABEL: Record<PublishStatus, string> = {
  draft: "초고",
  published: "발행됨",
  withdrawn: "철회됨",
};

const STATUS_EMOJI: Record<PublishStatus, string> = {
  draft: "📝",
  published: "✅",
  withdrawn: "🚫",
};

function resolveCardHref(p: Post): string {
  return `/community/p/${p.slug}`;
}

export default function PartnerPostsList({ posts, partnerCover }: Props) {
  const groups: Record<PublishStatus, Post[]> = {
    draft: [],
    published: [],
    withdrawn: [],
  };
  for (const p of posts) {
    if (p.postType !== "partner-promo") continue;
    groups[p.publishStatus].push(p);
  }

  if (
    groups.draft.length === 0 &&
    groups.published.length === 0 &&
    groups.withdrawn.length === 0
  ) {
    return (
      <div className="rounded-lg border border-dashed border-zinc-300 bg-white p-8 text-center text-zinc-500 dark:border-zinc-700 dark:bg-zinc-900">
        <p className="mb-2 text-2xl">📭</p>
        <p>아직 작성한 글이 없어요.</p>
        <Link
          href="/partner/posts/new"
          className="mt-3 inline-block rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
        >
          첫 초고 만들기
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {(["draft", "published", "withdrawn"] as PublishStatus[]).map(
        (status) => {
          const list = groups[status];
          if (list.length === 0) return null;
          return (
            <section key={status}>
              <h2 className="mb-3 text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                {STATUS_EMOJI[status]} {STATUS_LABEL[status]} ({list.length})
              </h2>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {list.map((p) => (
                  <PartnerPostCard
                    key={p.id}
                    post={p}
                    fallbackCover={partnerCover}
                    href={resolveCardHref(p)}
                  />
                ))}
              </div>
            </section>
          );
        },
      )}
    </div>
  );
}
