"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { AutoPublishConfig } from "@/types/partner";
import { Save, CheckCircle2, AlertCircle, Info, Calendar, Clock } from "lucide-react";

/**
 * v1.7 partner-promo · §7.4 — autoPublish 설정 UI.
 *  - 디폴트: PATCH /api/partner/settings (본인 partner 설정)
 *  - v1.8 admin-console (C1 결의): endpoint·onSaved props 옵셔널 — admin이 다른 partner를 편집할 때 주입.
 *    - endpoint 누락 시 `/api/partner/settings` (기존 호출자 호환)
 *    - onSaved 호출 후 `router.refresh()`도 항상 실행 (admin 부모 페이지 갱신용)
 *  - 시간 picker는 15분 단위 (UI 강제, 서버는 분 단위 정수만 검증)
 */

interface Props {
  initial: AutoPublishConfig;
  /** v1.8: admin이 다른 partner 편집 시 PATCH 대상 endpoint. 미지정 시 본인 settings. */
  endpoint?: string;
  /** v1.8: 저장 성공 후 부모 컴포넌트가 행할 추가 액션 (예: 부모 페이지 데이터 refresh). */
  onSaved?: () => void;
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

export default function AutoPublishSettings({
  initial,
  endpoint = "/api/partner/settings",
  onSaved,
}: Props) {
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
      const res = await fetch(endpoint, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          ...(endpoint === "/api/partner/settings"
            ? {
                enabled,
                weekdays: Array.from(weekdays).sort((a, b) => a - b),
                startMinute,
                endMinute,
                timezone: "Asia/Seoul",
              }
            : {
                autoPublish: {
                  enabled,
                  weekdays: Array.from(weekdays).sort((a, b) => a - b),
                  startMinute,
                  endMinute,
                  timezone: "Asia/Seoul",
                },
              }),
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(json.message || "저장 실패");
        return;
      }
      setInfo("설정이 성공적으로 저장되었습니다.");
      router.refresh();
      onSaved?.();
      setTimeout(() => setInfo(null), 3000);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-10">
      <section className="space-y-4">
        <h2 className="text-sm font-bold uppercase tracking-wider text-[#6B7280]">상태 설정</h2>
        <div className="grid grid-cols-2 gap-3">
          {[
            { value: true, label: "사용함", desc: "AI가 자동 발행함" },
            { value: false, label: "사용 안 함", desc: "수동으로만 발행" },
          ].map((opt) => (
            <button
              key={String(opt.value)}
              onClick={() => setEnabled(opt.value)}
              className={`flex flex-col items-start gap-1 rounded-xl border-2 p-4 text-left transition-all ${
                enabled === opt.value
                  ? "border-[#2563EB] bg-[#EFF6FF] ring-2 ring-[#DBEAFE]"
                  : "border-[#F3F4F6] bg-white hover:border-[#D1D5DB]"
              }`}
            >
              <span className={`text-[15px] font-bold ${enabled === opt.value ? "text-[#2563EB]" : "text-[#111827]"}`}>
                {opt.label}
              </span>
              <span className="text-[12px] text-[#6B7280]">{opt.desc}</span>
            </button>
          ))}
        </div>
      </section>

      {enabled && (
        <div className="space-y-10 animate-in fade-in slide-in-from-top-2 duration-300">
          <section className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-[#6B7280]">
              <Calendar className="h-4 w-4" />
              <span>발행 요일</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {WEEKDAY_KO.map((label, d) => {
                const isSelected = weekdays.has(d);
                return (
                  <button
                    type="button"
                    key={d}
                    onClick={() => toggleWeekday(d)}
                    className={`h-11 w-11 rounded-full border-2 text-[14px] font-bold transition-all ${
                      isSelected
                        ? "border-[#2563EB] bg-[#2563EB] text-white shadow-md"
                        : "border-[#F3F4F6] bg-white text-[#6B7280] hover:border-[#D1D5DB]"
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </section>

          <section className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-[#6B7280]">
              <Clock className="h-4 w-4" />
              <span>발행 시간대 (KST)</span>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[13px] font-medium text-[#374151]">시작</label>
                <div className="relative">
                  <select
                    value={startMinute}
                    onChange={(e) => setStartMinute(Number(e.target.value))}
                    className="w-full appearance-none rounded-xl border border-[#D1D5DB] bg-white px-4 py-3 text-[15px] font-medium text-[#111827] focus:border-[#2563EB] focus:outline-none focus:ring-4 focus:ring-[#DBEAFE] transition-all"
                  >
                    {TIME_OPTIONS.filter((m) => m < 1440).map((m) => (
                      <option key={m} value={m}>
                        {fmtTime(m)}
                      </option>
                    ))}
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3 text-[#6B7280]">
                    <Clock className="h-4 w-4" />
                  </div>
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-[13px] font-medium text-[#374151]">종료</label>
                <div className="relative">
                  <select
                    value={endMinute}
                    onChange={(e) => setEndMinute(Number(e.target.value))}
                    className="w-full appearance-none rounded-xl border border-[#D1D5DB] bg-white px-4 py-3 text-[15px] font-medium text-[#111827] focus:border-[#2563EB] focus:outline-none focus:ring-4 focus:ring-[#DBEAFE] transition-all"
                  >
                    {TIME_OPTIONS.filter((m) => m >= 15).map((m) => (
                      <option key={m} value={m}>
                        {fmtTime(m)}
                      </option>
                    ))}
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3 text-[#6B7280]">
                    <Clock className="h-4 w-4" />
                  </div>
                </div>
              </div>
            </div>
            <div className="flex gap-2 rounded-lg bg-[#F9FAFB] p-3 text-[12px] text-[#6B7280]">
              <Info className="h-4 w-4 shrink-0 text-[#2563EB]" />
              <p>
                설정된 시간 내에 생성된 초고는 즉시 발행됩니다. 
                (자정 넘김 설정은 추후 지원 예정)
              </p>
            </div>
          </section>
        </div>
      )}

      <div className="pt-6 border-t border-[#F3F4F6] space-y-4">
        {info && (
          <div className="flex items-center gap-2 rounded-xl bg-[#ECFDF5] px-4 py-3 text-[14px] font-medium text-[#065F46] animate-in fade-in slide-in-from-bottom-2">
            <CheckCircle2 className="h-4 w-4" />
            <span>{info}</span>
          </div>
        )}
        {error && (
          <div className="flex items-center gap-2 rounded-xl bg-[#FEF2F2] px-4 py-3 text-[14px] font-medium text-[#991B1B] animate-in shake duration-300">
            <AlertCircle className="h-4 w-4" />
            <span>{error}</span>
          </div>
        )}

        <button
          onClick={save}
          disabled={busy}
          className={`flex w-full items-center justify-center gap-2 rounded-xl bg-[#2563EB] py-4 text-[16px] font-bold text-white shadow-lg shadow-blue-500/20 transition-all hover:bg-[#1D4ED8] hover:shadow-blue-500/30 active:scale-[0.98] disabled:opacity-50 ${
            busy ? "cursor-wait" : ""
          }`}
        >
          {busy ? (
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
          ) : (
            <Save className="h-5 w-5" />
          )}
          <span>{busy ? "저장 중..." : "설정 저장하기"}</span>
        </button>
      </div>
    </div>
  );
}
