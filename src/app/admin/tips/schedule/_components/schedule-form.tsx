"use client";
import { useState } from "react";
import { updateTipsSchedule } from "@/app/actions/admin-tips-config-actions";
import type { TipsScheduleConfig } from "@/lib/tips/tips-config";

/**
 * v1.19 cycle #32 tips-schedule-editor · §3.9 (S17, NEW).
 *
 * hour selector (0-23) + daysOfWeek 7-checkbox.
 * OQ10 결의 — `action={updateTipsSchedule}` 직접 binding (bind/wrapper 불필요).
 * Native FormData 수집 — `formData.getAll("daysOfWeek")`로 checked checkbox values 자동 수집.
 *
 * dirty check — 동일 schedule 재저장 audit noise 방지 (no-op submit 차단).
 */

const DOW_LABELS = ["일", "월", "화", "수", "목", "금", "토"];

export default function ScheduleForm({
  initial,
}: {
  initial: TipsScheduleConfig;
}) {
  const initialSorted = [...initial.daysOfWeek].sort((a, b) => a - b);
  const [hour, setHour] = useState<number>(initial.hour);
  const [days, setDays] = useState<number[]>(initialSorted);

  const toggleDow = (d: number): void => {
    setDays((prev) =>
      prev.includes(d)
        ? prev.filter((x) => x !== d)
        : [...prev, d].sort((a, b) => a - b),
    );
  };

  const dirty =
    hour !== initial.hour ||
    days.length !== initialSorted.length ||
    days.some((d, i) => d !== initialSorted[i]);
  const canSubmit = days.length > 0 && dirty;

  return (
    <form
      action={updateTipsSchedule}
      className="space-y-4 rounded-md border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900"
    >
      <div>
        <label
          htmlFor="schedule-hour"
          className="block text-sm font-medium text-zinc-700 dark:text-zinc-300"
        >
          발행 시각 (KST :30 고정)
        </label>
        <select
          id="schedule-hour"
          name="hour"
          value={hour}
          onChange={(e) => setHour(Number(e.target.value))}
          className="mt-1 block w-32 rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
        >
          {Array.from({ length: 24 }, (_, i) => i).map((h) => (
            <option key={h} value={h}>
              {h.toString().padStart(2, "0")}:30
            </option>
          ))}
        </select>
      </div>

      <fieldset>
        <legend className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          발행 요일
        </legend>
        <div className="mt-2 flex flex-wrap gap-2">
          {DOW_LABELS.map((label, idx) => {
            const checked = days.includes(idx);
            return (
              <label
                key={idx}
                className={`cursor-pointer rounded-md border px-3 py-2 text-sm ${
                  checked
                    ? "border-blue-500 bg-blue-50 text-blue-700 dark:border-blue-400 dark:bg-blue-950/40 dark:text-blue-200"
                    : "border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
                }`}
              >
                <input
                  type="checkbox"
                  name="daysOfWeek"
                  value={idx}
                  checked={checked}
                  onChange={() => toggleDow(idx)}
                  className="sr-only"
                />
                {label}
              </label>
            );
          })}
        </div>
        {days.length === 0 && (
          <p className="mt-1 text-xs text-red-600 dark:text-red-400">
            최소 1개 요일을 선택하세요.
          </p>
        )}
      </fieldset>

      <button
        type="submit"
        disabled={!canSubmit}
        className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        저장
      </button>
    </form>
  );
}
