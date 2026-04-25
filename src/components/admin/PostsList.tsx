"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import Link from "next/link";
import type { Post, PostType, PublishStatus } from "@/types/post";

const TYPE_LABEL: Record<PostType, string> = {
  tip: "꿀팁",
  provider: "청명",
  "partner-promo": "의뢰업체",
};

const STATUS_BADGE: Record<PublishStatus, string> = {
  draft: "📝 작성 중",
  published: "✅ 발행됨",
  withdrawn: "🚫 철회됨",
};

function fmt(d: Date | null): string {
  if (!d) return "-";
  return d.toLocaleString("ko-KR", {
    timeZone: "Asia/Seoul",
    month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit",
  });
}

export default function PostsList({ posts: initial }: { posts: Post[] }) {
  const router = useRouter();
  const [posts, setPosts] = useState(initial);
  const [busy, setBusy] = useState<string | null>(null);
  const [filter, setFilter] = useState<{
    type: PostType | "all";
    status: PublishStatus | "all";
  }>({ type: "all", status: "published" });

  const filtered = posts.filter((p) => {
    if (filter.type !== "all" && p.postType !== filter.type) return false;
    if (filter.status !== "all" && p.publishStatus !== filter.status) return false;
    return true;
  });

  async function withdraw(id: string, slug: string) {
    if (busy) return;
    if (!confirm("이 글을 강제 철회합니다. 비공개 처리되며 SEO에서도 제외됩니다.")) return;
    setBusy(id);
    try {
      const res = await fetch(`/api/admin/posts/${id}/withdraw`, { method: "POST" });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        alert(json.message ?? "철회 실패");
        return;
      }
      setPosts((curr) =>
        curr.map((p) => (p.id === id ? { ...p, publishStatus: "withdrawn" } : p)),
      );
      router.refresh();
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3 rounded-md border border-zinc-200 bg-white px-3 py-2 dark:border-zinc-800 dark:bg-zinc-900">
        <label className="text-sm">
          유형:{" "}
          <select
            value={filter.type}
            onChange={(e) =>
              setFilter((f) => ({ ...f, type: e.target.value as PostType | "all" }))
            }
            className="ml-1 rounded border border-zinc-300 px-2 py-1 text-sm dark:border-zinc-700 dark:bg-zinc-800"
          >
            <option value="all">전체</option>
            <option value="tip">꿀팁</option>
            <option value="provider">청명</option>
            <option value="partner-promo">의뢰업체</option>
          </select>
        </label>
        <label className="text-sm">
          상태:{" "}
          <select
            value={filter.status}
            onChange={(e) =>
              setFilter((f) => ({ ...f, status: e.target.value as PublishStatus | "all" }))
            }
            className="ml-1 rounded border border-zinc-300 px-2 py-1 text-sm dark:border-zinc-700 dark:bg-zinc-800"
          >
            <option value="all">전체</option>
            <option value="draft">작성 중</option>
            <option value="published">발행됨</option>
            <option value="withdrawn">철회됨</option>
          </select>
        </label>
        <span className="ml-auto text-xs text-zinc-500">{filtered.length}건</span>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-lg border border-dashed border-zinc-300 p-8 text-center text-zinc-500 dark:border-zinc-700">
          조건에 맞는 글이 없습니다.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
          <table className="w-full text-sm">
            <thead className="bg-zinc-50 text-left text-xs text-zinc-500 dark:bg-zinc-800">
              <tr>
                <th className="px-3 py-2">제목</th>
                <th className="px-3 py-2">유형</th>
                <th className="px-3 py-2">상태</th>
                <th className="px-3 py-2">작성</th>
                <th className="px-3 py-2 text-right">액션</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {filtered.map((p) => (
                <tr key={p.id}>
                  <td className="max-w-md truncate px-3 py-2">
                    <Link
                      href={`/community/p/${p.slug}`}
                      target="_blank"
                      className="text-blue-600 hover:underline"
                    >
                      {p.title || "(제목 없음)"}
                    </Link>
                  </td>
                  <td className="px-3 py-2 text-xs text-zinc-500">{TYPE_LABEL[p.postType]}</td>
                  <td className="px-3 py-2 text-xs">{STATUS_BADGE[p.publishStatus]}</td>
                  <td className="px-3 py-2 text-xs text-zinc-500">{fmt(p.publishedAt)}</td>
                  <td className="px-3 py-2 text-right">
                    {p.publishStatus === "published" ? (
                      <button
                        onClick={() => withdraw(p.id, p.slug)}
                        disabled={busy === p.id}
                        className="rounded-md border border-red-300 px-2 py-1 text-xs text-red-700 hover:bg-red-50 disabled:opacity-50 dark:border-red-800 dark:text-red-300 dark:hover:bg-red-950"
                      >
                        {busy === p.id ? "철회 중…" : "🚫 강제 철회"}
                      </button>
                    ) : (
                      <span className="text-xs text-zinc-400">-</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
