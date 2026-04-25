"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  publishPage,
  unpublishPage,
  deletePage,
} from "@/app/actions/page-actions";

interface Props {
  pageId: string;
  published: boolean;
}

export function PageCardActions({ pageId, published }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function handlePublish(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    startTransition(async () => {
      const result = await publishPage(pageId);
      if (!result.ok) {
        alert(result.message);
        return;
      }
      router.refresh();
    });
  }

  function handleUnpublish(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    startTransition(async () => {
      const result = await unpublishPage(pageId);
      if (!result.ok) {
        alert(result.message);
        return;
      }
      router.refresh();
    });
  }

  function handleDelete(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm("정말 삭제할까요? 되돌릴 수 없습니다.")) return;
    startTransition(async () => {
      const result = await deletePage(pageId);
      if (!result.ok) {
        alert(result.message);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="mt-3 flex gap-2">
      {published ? (
        <button
          type="button"
          onClick={handleUnpublish}
          disabled={pending}
          className="rounded border border-zinc-300 px-2 py-1 text-xs hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-700 dark:hover:bg-zinc-900"
        >
          발행 취소
        </button>
      ) : (
        <button
          type="button"
          onClick={handlePublish}
          disabled={pending}
          className="rounded bg-emerald-600 px-2 py-1 text-xs text-white hover:bg-emerald-700 disabled:opacity-50"
        >
          발행
        </button>
      )}
      <button
        type="button"
        onClick={handleDelete}
        disabled={pending}
        className="rounded border border-red-300 px-2 py-1 text-xs text-red-600 hover:bg-red-50 disabled:opacity-50 dark:border-red-900 dark:hover:bg-red-950"
      >
        삭제
      </button>
    </div>
  );
}
