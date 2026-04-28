"use client";

import { useState, useTransition } from "react";
import { togglePublishMode } from "@/app/actions/partner-auto-series-actions";
import type { PublishMode } from "@/types/auto-series";

/**
 * v1.16 cycle #29 partner-editorial-oversight · §3.5 (A1).
 *
 * 사장님이 자동시리즈 발행 모드 토글:
 *  - 자동 발행 (auto)         : AI 생성 즉시 공개
 *  - 검토 후 발행 (draft-only): AI 생성 → draft 저장 → 사장님이 검토 후 publish 토글
 *
 * Google scaled content abuse 정책 회피의 운영자 측 통제권. 신규 매장 default 'draft-only'.
 */
interface Props {
  initial: PublishMode;
}

export default function PartnerPublishModeToggle({ initial }: Props) {
  const [mode, setMode] = useState<PublishMode>(initial);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleToggle(next: PublishMode) {
    if (next === mode) return;
    setError(null);
    const prev = mode;
    setMode(next); // optimistic
    startTransition(async () => {
      const r = await togglePublishMode({ mode: next });
      if (!r.ok) {
        setMode(prev);
        setError(r.message ?? "변경 실패");
      }
    });
  }

  return (
    <section className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
      <h2 className="mb-1 text-sm font-semibold">발행 모드</h2>
      <p className="mb-3 text-xs text-zinc-500">
        AI가 생성한 글을 즉시 공개할지, 사장님이 검토한 후 공개할지 선택해요.
      </p>
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => handleToggle("auto")}
          disabled={isPending}
          className={`rounded-md border px-3 py-3 text-left transition ${
            mode === "auto"
              ? "border-cyan-500 bg-cyan-50 dark:border-cyan-400 dark:bg-cyan-950/40"
              : "border-zinc-200 bg-white hover:border-zinc-300 dark:border-zinc-700 dark:bg-zinc-900"
          } ${isPending ? "opacity-60" : ""}`}
        >
          <div className="text-sm font-semibold">자동 발행</div>
          <div className="mt-0.5 text-xs text-zinc-500">
            AI 생성 즉시 공개
          </div>
        </button>
        <button
          type="button"
          onClick={() => handleToggle("draft-only")}
          disabled={isPending}
          className={`rounded-md border px-3 py-3 text-left transition ${
            mode === "draft-only"
              ? "border-cyan-500 bg-cyan-50 dark:border-cyan-400 dark:bg-cyan-950/40"
              : "border-zinc-200 bg-white hover:border-zinc-300 dark:border-zinc-700 dark:bg-zinc-900"
          } ${isPending ? "opacity-60" : ""}`}
        >
          <div className="text-sm font-semibold">검토 후 발행</div>
          <div className="mt-0.5 text-xs text-zinc-500">
            검토 → publish
          </div>
        </button>
      </div>
      {error && (
        <p className="mt-2 rounded-md bg-rose-50 px-3 py-2 text-xs text-rose-600 dark:bg-rose-950/40 dark:text-rose-400">
          {error}
        </p>
      )}
    </section>
  );
}
