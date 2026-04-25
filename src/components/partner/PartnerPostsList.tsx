import Link from "next/link";
import type { Post, PublishStatus } from "@/types/post";

/**
 * v1.7 partner-promo — 본인 글 status별 그룹 리스트.
 * Server Component (no client interactivity here — 액션은 각 행의 Link로).
 */

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

function formatDateKST(d: Date): string {
  return d.toLocaleString("ko-KR", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function PartnerPostsList({ posts }: { posts: Post[] }) {
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
    <div className="space-y-6">
      {(["draft", "published", "withdrawn"] as PublishStatus[]).map(
        (status) => {
          const list = groups[status];
          if (list.length === 0) return null;
          return (
            <section key={status}>
              <h2 className="mb-2 text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                {STATUS_EMOJI[status]} {STATUS_LABEL[status]} ({list.length})
              </h2>
              <ul className="divide-y divide-zinc-200 rounded-lg border border-zinc-200 bg-white dark:divide-zinc-800 dark:border-zinc-800 dark:bg-zinc-900">
                {list.map((p) => (
                  <li
                    key={p.id}
                    className="flex items-center justify-between gap-3 px-4 py-3"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">
                        {p.title || "(제목 없음)"}
                      </p>
                      <p className="mt-0.5 text-xs text-zinc-500">
                        {formatDateKST(p.createdAt)}
                        {p.publishedAt &&
                          ` · 발행 ${formatDateKST(p.publishedAt)}`}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2 text-sm">
                      {status === "published" ? (
                        <Link
                          href={`/community/p/${p.slug}`}
                          className="text-blue-600 hover:underline"
                        >
                          공개 페이지
                        </Link>
                      ) : null}
                      <Link
                        href={`/partner/posts/${p.id}/edit`}
                        className="rounded-md border border-zinc-300 px-2 py-1 hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
                      >
                        편집
                      </Link>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          );
        },
      )}
    </div>
  );
}
