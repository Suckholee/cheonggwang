"use client";

import { useState, useTransition } from "react";
import { togglePartnerAutoSeries } from "@/app/actions/partner-auto-series-actions";
import type { BrandTone } from "@/types/post";

/**
 * v1.13 cycle #26 partner-auto-series · §6.2 — GO/STOP 토글 + brandTone 선택.
 */

interface Props {
  partnerId: string;
  enabled: boolean;
  brandTone: BrandTone;
  canEnable: boolean;
  /** photo-missing/autoPublish-off 등 enable 차단 사유 */
  warnings: string[];
}

const TONE_LABEL: Record<BrandTone, string> = {
  friendly: "친근",
  professional: "전문",
  playful: "발랄",
};

export default function PartnerAutoSeriesPanel({
  enabled,
  brandTone: initTone,
  canEnable,
  warnings,
}: Props) {
  const [enabledLocal, setEnabledLocal] = useState(enabled);
  const [tone, setTone] = useState<BrandTone>(initTone);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function onToggle(nextEnabled: boolean) {
    if (nextEnabled && !canEnable) return;
    setError(null);
    startTransition(async () => {
      const res = await togglePartnerAutoSeries({
        enabled: nextEnabled,
        brandTone: tone,
      });
      if (res.ok) {
        setEnabledLocal(nextEnabled);
      } else {
        setError(res.message ?? "오류");
      }
    });
  }

  function onToneChange(next: BrandTone) {
    setTone(next);
    if (!enabledLocal) return;
    startTransition(async () => {
      const res = await togglePartnerAutoSeries({
        enabled: true,
        brandTone: next,
      });
      if (!res.ok) setError(res.message ?? "톤 변경 실패");
    });
  }

  return (
    <section className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold">
            {enabledLocal ? "🟢 자동 시리즈: ON" : "⚪️ 자동 시리즈: OFF"}
          </p>
          <p className="mt-1 text-xs text-zinc-500">
            {enabledLocal
              ? "다음 윈도우에 자동으로 글이 발행됩니다."
              : "GO 버튼을 누르면 매주 자동 운영이 시작됩니다."}
          </p>
        </div>
        <button
          type="button"
          disabled={isPending || (!enabledLocal && !canEnable)}
          onClick={() => onToggle(!enabledLocal)}
          className={`rounded-md px-4 py-2 text-sm font-bold transition-colors ${
            enabledLocal
              ? "bg-rose-600 text-white hover:bg-rose-700"
              : "bg-blue-600 text-white hover:bg-blue-700"
          } disabled:opacity-50`}
        >
          {isPending ? "처리 중…" : enabledLocal ? "STOP" : "GO"}
        </button>
      </div>

      {warnings.length > 0 ? (
        <ul className="mt-3 space-y-1 text-xs text-amber-600 dark:text-amber-400">
          {warnings.map((w) => (
            <li key={w}>⚠️ {w}</li>
          ))}
        </ul>
      ) : null}

      <div className="mt-4 flex items-center gap-2 text-sm">
        <span className="text-zinc-500">brandTone:</span>
        {(Object.keys(TONE_LABEL) as BrandTone[]).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => onToneChange(t)}
            disabled={isPending}
            className={`rounded-full px-3 py-1 text-xs ${
              tone === t
                ? "bg-blue-600 text-white"
                : "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
            } disabled:opacity-50`}
          >
            {TONE_LABEL[t]}
          </button>
        ))}
      </div>

      {error ? (
        <p className="mt-3 rounded-md bg-rose-50 px-3 py-2 text-xs text-rose-700 dark:bg-rose-950 dark:text-rose-300">
          {error}
        </p>
      ) : null}
    </section>
  );
}
