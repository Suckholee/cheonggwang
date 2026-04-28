import { Suspense } from "react";
import Link from "next/link";
import { connection } from "next/server";
import { requireAdminPage } from "@/lib/auth/require-admin";
import { triggerTipGeneration } from "@/app/actions/admin-tips-actions";

/**
 * v1.17 cycle #30 cleaning-tips-content · §3.11 — manual trigger form (A2).
 *
 * Next.js 16 cacheComponents — auth는 Suspense child 안에서 await connection() 후 호출.
 * (cycle #29 N10 패턴)
 */

export const metadata = {
  title: "노하우 즉시 생성 · 청광 admin",
  robots: { index: false, follow: false },
};

const CATEGORIES: { value: string; label: string }[] = [
  { value: "bathroom", label: "욕실" },
  { value: "kitchen", label: "주방" },
  { value: "aircon", label: "에어컨" },
  { value: "living", label: "거실" },
  { value: "move", label: "이사" },
  { value: "general", label: "일반" },
];

const INTENTS: { value: string; label: string }[] = [
  { value: "", label: "(미지정)" },
  { value: "howto", label: "방법 (howto)" },
  { value: "guide", label: "가이드 (guide)" },
  { value: "checklist", label: "체크리스트 (checklist)" },
  { value: "comparison", label: "비교 (comparison)" },
  { value: "qa", label: "Q&A (qa)" },
];

export default function AdminTipsGeneratePage() {
  return (
    <div className="space-y-6">
      <Suspense fallback={null}>
        <AuthGate />
      </Suspense>

      <div>
        <Link
          href="/admin/tips"
          className="text-sm text-blue-600 hover:underline"
        >
          ← 청소 노하우 관리
        </Link>
        <h1 className="mt-2 text-xl font-bold">노하우 즉시 생성</h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          토픽을 입력해 1건 draft를 즉시 생성합니다. 자동 cron과는 별도로 일일 1건 제한 없이 동작합니다.
        </p>
      </div>

      <form
        action={triggerTipGeneration}
        className="space-y-4 rounded-md border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900"
      >
        <div>
          <label className="block text-sm font-medium" htmlFor="topicLabel">
            주제 (label)
          </label>
          <input
            id="topicLabel"
            name="topicLabel"
            type="text"
            required
            minLength={5}
            maxLength={120}
            placeholder="예: 욕실 줄눈 청소 — 셀프 vs 전문가"
            className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950"
          />
          <p className="mt-1 text-xs text-zinc-500">5~120자. 질문형 자연어 권장.</p>
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
              defaultValue="general"
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
            <label className="block text-sm font-medium" htmlFor="intent">
              의도 (intent)
            </label>
            <select
              id="intent"
              name="intent"
              defaultValue=""
              className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950"
            >
              {INTENTS.map((i) => (
                <option key={i.value} value={i.value}>
                  {i.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <input
            id="photoless"
            name="photoless"
            type="checkbox"
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
            생성 시작
          </button>
          <Link
            href="/admin/tips"
            className="rounded-md border border-zinc-300 px-4 py-2 text-sm hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
          >
            취소
          </Link>
        </div>
      </form>

      <div className="rounded-md border border-zinc-200 bg-zinc-50 p-4 text-xs text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400">
        <strong>생성 후</strong>: draft 상태로 저장됩니다. 검토 후 발행 토글로 community/tips 패널에 노출됩니다.
      </div>
    </div>
  );
}

async function AuthGate() {
  await connection();
  await requireAdminPage("/admin/tips/generate");
  return null;
}
