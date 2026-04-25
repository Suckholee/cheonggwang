"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Post, PublishStatus } from "@/types/post";

/**
 * v1.7 partner-promo · §7.3 — 초고/발행글 편집 + 발행/철회.
 *  - PATCH /api/partner/posts/[postId]
 *  - POST /api/partner/posts/[postId]/publish
 *  - DELETE /api/partner/posts/[postId] (draft만)
 */

interface Props {
  post: Post;
}

const STATUS_LABEL: Record<PublishStatus, string> = {
  draft: "초고",
  published: "발행됨",
  withdrawn: "철회됨",
};

export default function PartnerPromoEditor({ post }: Props) {
  const router = useRouter();
  const [title, setTitle] = useState(post.title);
  const [summary80, setSummary80] = useState(post.summary80);
  const [bodyMarkdown, setBodyMarkdown] = useState(post.bodyMarkdown);
  const [coverImageUrl, setCoverImageUrl] = useState(
    post.coverImageUrl ?? "",
  );
  const [coverImageAlt, setCoverImageAlt] = useState(
    post.coverImageAlt ?? "",
  );
  const [status, setStatus] = useState<PublishStatus>(post.publishStatus);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  async function saveDraft() {
    if (busy) return;
    setBusy("save");
    setError(null);
    setInfo(null);
    try {
      const res = await fetch(`/api/partner/posts/${post.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          title,
          summary80,
          bodyMarkdown,
          coverImageUrl,
          coverImageAlt,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(json.message || "저장 실패");
        return;
      }
      setInfo("저장되었습니다");
      router.refresh();
    } finally {
      setBusy(null);
    }
  }

  async function publish() {
    if (busy) return;
    if (
      !confirm(
        "이 글을 공개 발행하시겠습니까? 변경사항이 즉시 반영됩니다.",
      )
    )
      return;
    // 변경사항이 있을 수 있으니 PATCH 먼저
    await saveDraft();
    setBusy("publish");
    setError(null);
    try {
      const res = await fetch(
        `/api/partner/posts/${post.id}/publish`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ action: "publish" }),
        },
      );
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(json.message || "발행 실패");
        return;
      }
      setStatus("published");
      setInfo("발행되었습니다.");
      router.refresh();
    } finally {
      setBusy(null);
    }
  }

  async function withdraw() {
    if (busy) return;
    if (!confirm("이 글을 비공개로 전환하시겠습니까?")) return;
    setBusy("withdraw");
    setError(null);
    try {
      const res = await fetch(
        `/api/partner/posts/${post.id}/publish`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ action: "withdraw" }),
        },
      );
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(json.message || "철회 실패");
        return;
      }
      setStatus("withdrawn");
      setInfo("철회되었습니다.");
      router.refresh();
    } finally {
      setBusy(null);
    }
  }

  async function deleteDraft() {
    if (busy) return;
    if (!confirm("이 초고를 삭제합니다. 되돌릴 수 없습니다.")) return;
    setBusy("delete");
    setError(null);
    try {
      const res = await fetch(`/api/partner/posts/${post.id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        setError(json.message || "삭제 실패");
        setBusy(null);
        return;
      }
      router.push("/partner/posts");
    } catch (e) {
      setError(e instanceof Error ? e.message : "삭제 실패");
      setBusy(null);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-zinc-500">
          상태:{" "}
          <span
            className={
              status === "published"
                ? "text-emerald-600"
                : status === "withdrawn"
                  ? "text-amber-600"
                  : "text-zinc-700"
            }
          >
            {STATUS_LABEL[status]}
          </span>
        </p>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium">제목</label>
        <input
          type="text"
          value={title}
          maxLength={80}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full rounded-md border border-zinc-300 px-3 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-900"
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium">요약</label>
        <input
          type="text"
          value={summary80}
          maxLength={120}
          onChange={(e) => setSummary80(e.target.value)}
          className="w-full rounded-md border border-zinc-300 px-3 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-900"
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium">
          본문 (Markdown)
        </label>
        <textarea
          value={bodyMarkdown}
          rows={20}
          maxLength={6000}
          onChange={(e) => setBodyMarkdown(e.target.value)}
          className="w-full rounded-md border border-zinc-300 px-3 py-2 font-mono text-sm dark:border-zinc-700 dark:bg-zinc-900"
        />
        <p className="mt-1 text-xs text-zinc-500">
          {bodyMarkdown.length} / 6000자
        </p>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium">
          커버 이미지 URL
        </label>
        <input
          type="url"
          value={coverImageUrl}
          onChange={(e) => setCoverImageUrl(e.target.value)}
          className="w-full rounded-md border border-zinc-300 px-3 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-900"
        />
        {post.sourcePhotos && post.sourcePhotos.length > 1 ? (
          <div className="mt-2 flex flex-wrap gap-2">
            {post.sourcePhotos.map((u, i) => (
              <button
                type="button"
                key={i}
                onClick={() => setCoverImageUrl(u)}
                className={`rounded-md border px-2 py-1 text-xs ${
                  u === coverImageUrl
                    ? "border-blue-500 bg-blue-50 dark:bg-blue-950"
                    : "border-zinc-300 dark:border-zinc-700"
                }`}
              >
                사진 {i + 1}
              </button>
            ))}
          </div>
        ) : null}
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium">
          커버 이미지 alt (80자 이내)
        </label>
        <input
          type="text"
          value={coverImageAlt}
          maxLength={80}
          onChange={(e) => setCoverImageAlt(e.target.value)}
          className="w-full rounded-md border border-zinc-300 px-3 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-900"
        />
      </div>

      {info ? (
        <div className="rounded-md border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm text-emerald-800 dark:border-emerald-700 dark:bg-emerald-950 dark:text-emerald-200">
          {info}
        </div>
      ) : null}
      {error ? (
        <div className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-200">
          {error}
        </div>
      ) : null}

      <div className="flex flex-wrap gap-2 border-t border-zinc-200 pt-4 dark:border-zinc-800">
        <button
          onClick={saveDraft}
          disabled={!!busy}
          className="rounded-md border border-zinc-300 px-4 py-2 text-sm hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
        >
          {busy === "save" ? "저장 중…" : "💾 변경 저장"}
        </button>

        {status !== "published" ? (
          <button
            onClick={publish}
            disabled={!!busy}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {busy === "publish" ? "발행 중…" : "📣 발행"}
          </button>
        ) : (
          <button
            onClick={withdraw}
            disabled={!!busy}
            className="rounded-md border border-amber-400 bg-amber-50 px-4 py-2 text-sm text-amber-800 hover:bg-amber-100 disabled:opacity-50 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-200"
          >
            {busy === "withdraw" ? "철회 중…" : "🚫 철회"}
          </button>
        )}

        {status === "draft" ? (
          <button
            onClick={deleteDraft}
            disabled={!!busy}
            className="ml-auto rounded-md border border-red-300 px-4 py-2 text-sm text-red-700 hover:bg-red-50 disabled:opacity-50 dark:border-red-800 dark:text-red-300 dark:hover:bg-red-950"
          >
            {busy === "delete" ? "삭제 중…" : "🗑 초고 삭제"}
          </button>
        ) : null}
      </div>
    </div>
  );
}
