"use client";

import { useState, useTransition } from "react";
import Image from "next/image";
import { Trash2 } from "lucide-react";
import { QUOTE_CATEGORY_LABELS } from "@/domain/quote-category";
import { deleteWorkCase } from "@/app/actions/provider-editor-actions";
import type { WorkCase } from "@/types/work-case";

interface Props {
  workCase: WorkCase;
}

export function WorkCaseCard({ workCase }: Props) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function onDelete() {
    if (!confirm("이 작업을 삭제하시겠습니까? 사진도 함께 삭제됩니다.")) return;
    setError(null);
    startTransition(async () => {
      const result = await deleteWorkCase({ workCaseId: workCase.id });
      if (!result.ok) {
        setError(result.message);
      }
    });
  }

  return (
    <article className="overflow-hidden rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
      <div className="grid grid-cols-2 gap-px bg-zinc-200 dark:bg-zinc-800">
        <figure className="relative aspect-square bg-zinc-50 dark:bg-zinc-900">
          <Image
            src={workCase.beforePhoto.url}
            alt="Before"
            fill
            sizes="(max-width: 640px) 50vw, 200px"
            className="object-cover"
          />
          <figcaption className="absolute left-1 top-1 rounded bg-black/60 px-1.5 py-0.5 text-[10px] text-white">
            Before
          </figcaption>
        </figure>
        <figure className="relative aspect-square bg-zinc-50 dark:bg-zinc-900">
          <Image
            src={workCase.afterPhoto.url}
            alt="After"
            fill
            sizes="(max-width: 640px) 50vw, 200px"
            className="object-cover"
          />
          <figcaption className="absolute left-1 top-1 rounded bg-emerald-600/80 px-1.5 py-0.5 text-[10px] text-white">
            After
          </figcaption>
        </figure>
      </div>

      <div className="p-3">
        <div className="mb-1 flex items-center justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{workCase.sizeLabel}</p>
            <p className="text-xs text-zinc-500">
              {QUOTE_CATEGORY_LABELS[workCase.category]}
            </p>
          </div>
          <button
            type="button"
            onClick={onDelete}
            disabled={isPending}
            aria-label="작업 삭제"
            className="shrink-0 rounded p-1.5 text-zinc-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-50 dark:hover:bg-red-950/30 dark:hover:text-red-400"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
        {workCase.memo && (
          <p className="mt-1 line-clamp-2 text-xs text-zinc-600 dark:text-zinc-400">
            {workCase.memo}
          </p>
        )}
        {error && (
          <p className="mt-2 rounded bg-red-50 px-2 py-1 text-[11px] text-red-700 dark:bg-red-950/50 dark:text-red-300">
            {error}
          </p>
        )}
      </div>
    </article>
  );
}
