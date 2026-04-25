"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { AutoPublishConfig } from "@/types/partner";

/**
 * v1.7 partner-promo · §7.4 — autoPublish 설정 UI.
 *  - PATCH /api/partner/settings
 *  - 시간 picker는 15분 단위 (UI 강제, 서버는 분 단위 정수만 검증)
 */

interface Props {
  initial: AutoPublishConfig;
}

const WEEKDAY_KO = ["일", "월", "화", "수", "목", "금", "토"];

function fmtTime(min: number): string {
  return `${String(Math.floor(min / 60)).padStart(2, "0")}:${String(min % 60).padStart(2, "0")}`;
}

const TIME_OPTIONS: number[] = (() => {
  const arr: number[] = [];
  for (let m = 0; m <= 1440; m += 15) arr.push(m);
  return arr;
})();

export default function AutoPublishSettings({ initial }: Props) {
  const router = useRouter();
  const [enabled, setEnabled] = useState(initial.enabled);
  const [weekdays, setWeekdays] = useState<Set<number>>(
    new Set(initial.weekdays),
  );
  const [startMinute, setStartMinute] = useState(initial.startMinute);
  const [endMinute, setEndMinute] = useState(
    initial.endMinute > 0 ? initial.endMinute : 60,
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  function toggleWeekday(d: number) {
    const next = new Set(weekdays);
    if (next.has(d)) next.delete(d);
    else next.add(d);
    setWeekdays(next);
  }

  async function save() {
    if (busy) return;
    setError(null);
    setInfo(null);
    if (enabled && weekdays.size === 0) {
      setError("자동발행을 켜려면 최소 1일은 선택해 주세요");
      return;
    }
    if (startMinute >= endMinute) {
      setError("시작 시간은 종료 시간보다 빨라야 합니다");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/partner/settings", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          enabled,
          weekdays: Array.from(weekdays).sort((a, b) => a - b),
          startMinute,
          endMinute,
          timezone: "Asia/Seoul",
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
      setBusy(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="radio"
            name="autoPublish"
            checked={!enabled}
            onChange={() => setEnabled(false)}
          />
          <span>자동발행 사용 안 함</span>
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="radio"
            name="autoPublish"
            checked={enabled}
            onChange={() => setEnabled(true)}
          />
          <span>자동발행 사용</span>
        </label>
      </div>

      {enabled ? (
        <>
          <div>
            <label className="mb-2 block text-sm font-medium">
              요일 (KST)
            </label>
            <div className="flex flex-wrap gap-2">
              {WEEKDAY_KO.map((label, d) => {
                const checked = weekdays.has(d);
                return (
                  <button
                    type="button"
                    key={d}
                    onClick={() => toggleWeekday(d)}
                    className={`rounded-md border px-3 py-1.5 text-sm ${
                      checked
                        ? "border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-200"
                        : "border-zinc-300 hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
                    }`}
                    aria-pressed={checked}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-sm font-medium">
                시작 시간
              </label>
              <select
                value={startMinute}
                onChange={(e) => setStartMinute(Number(e.target.value))}
                className="w-full rounded-md border border-zinc-300 px-3 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-900"
              >
                {TIME_OPTIONS.filter((m) => m < 1440).map((m) => (
                  <option key={m} value={m}>
                    {fmtTime(m)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">
                종료 시간
              </label>
              <select
                value={endMinute}
                onChange={(e) => setEndMinute(Number(e.target.value))}
                className="w-full rounded-md border border-zinc-300 px-3 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-900"
              >
                {TIME_OPTIONS.filter((m) => m >= 15).map((m) => (
                  <option key={m} value={m}>
                    {fmtTime(m)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <p className="text-xs text-zinc-500">
            ⓘ 자동발행 윈도우 안에서 생성된 초고는 hygiene 통과 시 즉시
            공개됩니다. 자정 넘김 윈도우(예: 22:00–02:00)는 v1에서
            지원되지 않습니다.
          </p>
        </>
      ) : null}

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

      <div className="flex justify-end">
        <button
          onClick={save}
          disabled={busy}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {busy ? "저장 중…" : "💾 저장"}
        </button>
      </div>
    </div>
  );
}
