import Link from "next/link";
import type { TipsTopicDoc } from "@/lib/tips/tips-config";

/**
 * v1.18 cycle #31 tips-admin-config · §3.7 (S4 form — plain server form).
 *
 * M3 결의 — RHF 미사용. cycle #30 `triggerTipGeneration` 패턴 일치.
 * M5 결의 — defaults: category='general', season/intent=null, photoless=unchecked.
 *
 * Server component (no `"use client"`) — server action을 form action에 직접 binding.
 * - 신규: action={addTopic}
 * - 편집: action={updateTopic.bind(null, topicId)} (C6 결의)
 */

const CATEGORIES: { value: string; label: string }[] = [
  { value: "general", label: "일반 (default)" },
  { value: "bathroom", label: "욕실" },
  { value: "kitchen", label: "주방" },
  { value: "aircon", label: "에어컨" },
  { value: "living", label: "거실" },
  { value: "move", label: "이사" },
];

const SEASONS: { value: string; label: string }[] = [
  { value: "", label: "(미지정 — 모든 시즌)" },
  { value: "spring", label: "봄" },
  { value: "summer", label: "여름" },
  { value: "fall", label: "가을" },
  { value: "winter", label: "겨울" },
];

const INTENTS: { value: string; label: string }[] = [
  { value: "", label: "(미지정)" },
  { value: "howto", label: "방법 (howto)" },
  { value: "guide", label: "가이드 (guide)" },
  { value: "checklist", label: "체크리스트 (checklist)" },
  { value: "comparison", label: "비교 (comparison)" },
  { value: "qa", label: "Q&A (qa)" },
];

interface Props {
  /** edit 모드 시 전달. 신규 작성 시 undefined. */
  initial?: TipsTopicDoc;
  action: (formData: FormData) => void | Promise<void>;
  cancelHref: string;
  submitLabel: string;
}

export default function AdminTipsTopicForm({
  initial,
  action,
  cancelHref,
  submitLabel,
}: Props) {
  return (
    <form
      action={action}
      className="space-y-4 rounded-md border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900"
    >
      <div>
        <label className="block text-sm font-medium" htmlFor="label">
          주제 (label)
        </label>
        <input
          id="label"
          name="label"
          type="text"
          required
          minLength={5}
          maxLength={120}
          defaultValue={initial?.label ?? ""}
          placeholder="예: 욕실 줄눈 청소 — 셀프 vs 전문가"
          className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950"
        />
        <p className="mt-1 text-xs text-zinc-500">
          5~120자. 질문형 자연어 권장. 매 cron tick에서 RAG anti-drift로 최근 20건과 비교.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="block text-sm font-medium" htmlFor="category">
            카테고리
          </label>
          <select
            id="category"
            name="category"
            required
            defaultValue={initial?.category ?? "general"}
            className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950"
          >
            {CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium" htmlFor="season">
            시즌
          </label>
          <select
            id="season"
            name="season"
            defaultValue={initial?.season ?? ""}
            className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950"
          >
            {SEASONS.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
          <p className="mt-1 text-xs text-zinc-500">
            지정하면 해당 시즌에만 candidate. 미지정 시 사시사철 candidate.
          </p>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium" htmlFor="intent">
          의도 (intent)
        </label>
        <select
          id="intent"
          name="intent"
          defaultValue={initial?.intent ?? ""}
          className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950"
        >
          {INTENTS.map((i) => (
            <option key={i.value} value={i.value}>
              {i.label}
            </option>
          ))}
        </select>
      </div>

      <div className="flex items-center gap-2">
        <input
          id="photoless"
          name="photoless"
          type="checkbox"
          defaultChecked={initial?.photoless === true}
          className="h-4 w-4 rounded border-zinc-300"
        />
        <label htmlFor="photoless" className="text-sm">
          커버 이미지 없이 (photoless)
        </label>
      </div>

      <div className="flex items-center gap-3 pt-2">
        <button
          type="submit"
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          {submitLabel}
        </button>
        <Link
          href={cancelHref}
          className="rounded-md border border-zinc-300 px-4 py-2 text-sm hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
        >
          취소
        </Link>
      </div>
    </form>
  );
}
