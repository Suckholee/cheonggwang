import { Suspense } from "react";
import Link from "next/link";
import { connection } from "next/server";
import { requireAdminPage } from "@/lib/auth/require-admin";
import { tipsConfigRepository } from "@/lib/firebase/tips-config-repository";
import { tipsScheduleAuditRepository } from "@/lib/firebase/tips-schedule-audit-repository";
import { previewSchedule } from "@/lib/tips/schedule-preview";
import { formatScheduleSummary } from "@/lib/tips/next-tick-time";
import { getAdminDataErrorMessage } from "@/lib/errors";
import type {
  TipsScheduleAuditEvent,
  TipsScheduleConfig,
} from "@/lib/tips/tips-config";
import ScheduleForm from "./_components/schedule-form";

/**
 * v1.19 cycle #32 tips-schedule-editor · §3.9 (S18, NEW).
 *
 * 4 Suspense child:
 *   - FlashBanner (updated=1 / error=validation)
 *   - CurrentScheduleCard (formatScheduleSummary)
 *   - ScheduleForm (client) — initial config 주입
 *   - SchedulePreview30 (gate 시뮬레이션, server-render 캘린더)
 *   - ScheduleAuditList (최근 20건, M9 try/catch)
 *
 * 각 신규 Suspense child는 await connection() (M4 결의 재사용 — uncached now).
 */

export const metadata = {
  title: "Tips 발행 스케줄 · 청광 admin",
  robots: { index: false, follow: false },
};

interface SearchParams {
  updated?: string;
  error?: string;
}

export default async function AdminTipsSchedulePage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/admin/tips"
          className="text-sm text-blue-600 hover:underline"
        >
          ← 청소 노하우 관리
        </Link>
        <h1 className="mt-2 text-xl font-bold">Tips 발행 스케줄</h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          매시 :30에 cron이 발화하지만, 아래 schedule을 통과한 시점에만 1건 발행합니다.
          하루 1건 제한은 별도 게이트(KST 자정 기준).
        </p>
      </div>

      <Suspense fallback={null}>
        <FlashBanner searchParamsPromise={searchParams} />
      </Suspense>

      <Suspense fallback={<CardSkeleton h="h-20" />}>
        <CurrentScheduleCard />
      </Suspense>

      <Suspense fallback={<CardSkeleton h="h-72" />}>
        <ScheduleFormSection />
      </Suspense>

      <Suspense fallback={<CardSkeleton h="h-80" />}>
        <SchedulePreview30 />
      </Suspense>

      <Suspense fallback={<CardSkeleton h="h-64" />}>
        <ScheduleAuditList />
      </Suspense>
    </div>
  );
}

async function FlashBanner({
  searchParamsPromise,
}: {
  searchParamsPromise: Promise<SearchParams>;
}) {
  await connection();
  const sp = await searchParamsPromise;
  if (sp.updated === "1") {
    return (
      <div className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200">
        ✅ Schedule 저장 완료. 다음 cron tick부터 반영됩니다.
      </div>
    );
  }
  if (sp.error === "validation") {
    return (
      <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">
        ❌ 입력 검증 실패. hour 0-23 + 최소 1개 요일을 선택했는지 확인하세요.
      </div>
    );
  }
  return null;
}

async function CurrentScheduleCard() {
  await connection();
  await requireAdminPage("/admin/tips/schedule");
  const config = await tipsConfigRepository.getConfig();
  const isFallback = config.updatedAt.getTime() === 0;
  return (
    <div className="rounded-md border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="text-xs text-zinc-500 dark:text-zinc-400">
        현재 스케줄
      </div>
      <div className="mt-1 text-lg font-semibold">
        {formatScheduleSummary(config.schedule)}
      </div>
      {isFallback && (
        <div className="mt-1 text-xs text-amber-600 dark:text-amber-400">
          기본값 (Firestore 미설정 — 저장 시 즉시 적용)
        </div>
      )}
    </div>
  );
}

async function ScheduleFormSection() {
  await connection();
  await requireAdminPage("/admin/tips/schedule");
  const config = await tipsConfigRepository.getConfig();
  return <ScheduleForm initial={config.schedule} />;
}

async function SchedulePreview30() {
  await connection();
  await requireAdminPage("/admin/tips/schedule");
  const config = await tipsConfigRepository.getConfig();
  const preview = previewSchedule(config, new Date(), 30);
  const dowKo = ["일", "월", "화", "수", "목", "금", "토"];
  return (
    <div className="rounded-md border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="text-sm font-medium">향후 30일 발행 미리보기</div>
      <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
        ✓ = 발행 / ✗ = skip-out-of-schedule
      </p>
      <div className="mt-3 grid grid-cols-7 gap-1.5">
        {preview.map((p) => (
          <div
            key={p.utc.toISOString()}
            className={`rounded-md border p-2 text-center text-xs ${
              p.willPublish
                ? "border-emerald-300 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-950/40"
                : "border-zinc-200 bg-zinc-50 text-zinc-400 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-600"
            }`}
          >
            <div className="font-medium">
              {p.month}/{p.date}
            </div>
            <div className="text-[10px]">({dowKo[p.dayOfWeek]})</div>
            <div className="mt-0.5 font-mono text-[10px]">
              {p.willPublish ? `${p.hour.toString().padStart(2, "0")}:30` : "—"}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

async function ScheduleAuditList() {
  await connection();
  await requireAdminPage("/admin/tips/schedule");
  let audits: TipsScheduleAuditEvent[];
  try {
    audits = await tipsScheduleAuditRepository.list(20);
  } catch (e) {
    console.error("[admin/tips/schedule] audit list fetch failed", e);
    return (
      <div className="rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-100">
        {getAdminDataErrorMessage(e)}
      </div>
    );
  }
  if (audits.length === 0) {
    return (
      <div className="rounded-md border border-zinc-200 bg-white p-6 text-center text-sm text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400">
        Schedule 변경 이력이 아직 없습니다.
      </div>
    );
  }
  return (
    <div className="rounded-md border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
      <div className="border-b border-zinc-200 px-4 py-3 text-sm font-medium dark:border-zinc-800">
        Schedule 변경 이력 ({audits.length})
      </div>
      <ul className="divide-y divide-zinc-200 dark:divide-zinc-800">
        {audits.map((a) => (
          <li key={a.id} className="px-4 py-3 text-sm">
            <div className="text-[11px] text-zinc-500 dark:text-zinc-400">
              {a.at.toLocaleString("ko-KR", { timeZone: "Asia/Seoul" })}
            </div>
            <div className="mt-1">
              <span className="text-zinc-500">변경 전:</span>{" "}
              <span className="font-mono">{formatBeforeAfter(a.before)}</span>
            </div>
            <div>
              <span className="text-zinc-500">변경 후:</span>{" "}
              <span className="font-mono text-emerald-700 dark:text-emerald-400">
                {formatBeforeAfter(a.after)}
              </span>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function formatBeforeAfter(s: TipsScheduleConfig | null): string {
  if (!s) return "(기본값)";
  return formatScheduleSummary(s);
}

function CardSkeleton({ h }: { h: string }) {
  return (
    <div
      className={`${h} animate-pulse rounded-md bg-zinc-100 dark:bg-zinc-800`}
    />
  );
}
