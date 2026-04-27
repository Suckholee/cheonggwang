"use client";

import { useState, useTransition } from "react";
import Image from "next/image";
import { Trash2, AlertCircle } from "lucide-react";
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
    <article className="group overflow-hidden rounded-2xl border border-[#F3F4F6] bg-white shadow-sm transition-all hover:shadow-lg hover:-translate-y-0.5">
      <div className="grid grid-cols-2 gap-0.5 bg-[#F3F4F6]">
        <figure className="relative aspect-[4/5] bg-[#F9FAFB]">
          <Image
            src={workCase.beforePhoto.url}
            alt="Before"
            fill
            sizes="(max-width: 640px) 50vw, 300px"
            className="object-cover transition-transform group-hover:scale-105"
          />
          <div className="absolute left-2 top-2 rounded-full bg-black/60 px-2 py-0.5 text-[10px] font-bold text-white backdrop-blur-md">
            BEFORE
          </div>
        </figure>
        <figure className="relative aspect-[4/5] bg-[#F9FAFB]">
          <Image
            src={workCase.afterPhoto.url}
            alt="After"
            fill
            sizes="(max-width: 640px) 50vw, 300px"
            className="object-cover transition-transform group-hover:scale-105"
          />
          <div className="absolute left-2 top-2 rounded-full bg-[#2563EB]/90 px-2 py-0.5 text-[10px] font-bold text-white backdrop-blur-md">
            AFTER
          </div>
        </figure>
      </div>

      <div className="p-4">
        <div className="mb-2 flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 mb-1">
              <span className="rounded bg-[#EFF6FF] px-1.5 py-0.5 text-[10px] font-bold text-[#2563EB]">
                {QUOTE_CATEGORY_LABELS[workCase.category]}
              </span>
            </div>
            <p className="truncate text-[15px] font-bold text-[#111827]">{workCase.sizeLabel}</p>
          </div>
          <button
            type="button"
            onClick={onDelete}
            disabled={isPending}
            aria-label="작업 삭제"
            className="shrink-0 rounded-lg p-2 text-[#9CA3AF] hover:bg-[#FEF2F2] hover:text-[#EF4444] transition-colors"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>

        {workCase.memo && (
          <p className="line-clamp-2 text-[13px] leading-relaxed text-[#4B5563]">
            {workCase.memo}
          </p>
        )}

        {error && (
          <div className="mt-3 flex items-center gap-2 rounded-lg bg-[#FEF2F2] px-3 py-2 text-[12px] font-medium text-[#991B1B]">
            <AlertCircle className="h-3.5 w-3.5" />
            <span>{error}</span>
          </div>
        )}
      </div>
    </article>
  );
}
