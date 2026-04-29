"use client";

import { useState, useTransition } from "react";
import { toggleAutoEnabled } from "@/app/actions/admin-tips-config-actions";

/**
 * v1.18 cycle #31 tips-admin-config · §3.7 (S2 client toggle).
 *
 * /admin/tips 헤더에서 cron 자동 발행 ON/OFF 즉시 토글.
 * 서버 action 호출 → revalidatePath("/admin/tips") 로 다음 fetch 시 반영.
 */

interface Props {
  initialEnabled: boolean;
  /** R12 fallback (Firestore doc 미존재) — UI 안내 표시용 */
  isFallback: boolean;
}

export default function AdminTipsAutoConfigToggle({
  initialEnabled,
  isFallback,
}: Props) {
  const [enabled, setEnabled] = useState(initialEnabled);
  const [pending, startTransition] = useTransition();

  function handleToggle(): void {
    if (pending) return;
    const next = !enabled;
    setEnabled(next); // optimistic
    startTransition(async () => {
      try {
        await toggleAutoEnabled(next);
      } catch (e) {
        // rollback on error
        setEnabled(!next);
        console.error("[AdminTipsAutoConfigToggle] toggle failed", e);
      }
    });
  }

  return (
    <div className="flex items-center justify-between rounded-md border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="min-w-0 flex-1">
        <div className="text-sm font-medium">자동 발행 cron</div>
        <div className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
          {enabled
            ? "매일 09:30~17:30 KST 매시간 1건씩 draft 생성 (일일 1건 제한)"
            : "일시 정지 — cron 발화 시 즉시 skip-disabled로 종료"}
          {isFallback ? " · 기본값 (Firestore 미설정)" : ""}
        </div>
      </div>
      <button
        type="button"
        onClick={handleToggle}
        disabled={pending}
        aria-pressed={enabled}
        className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer items-center rounded-full transition-colors disabled:opacity-50 ${
          enabled
            ? "bg-emerald-500"
            : "bg-zinc-300 dark:bg-zinc-700"
        }`}
      >
        <span
          className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
            enabled ? "translate-x-6" : "translate-x-1"
          }`}
        />
        <span className="sr-only">{enabled ? "활성화됨" : "비활성화됨"}</span>
      </button>
    </div>
  );
}
