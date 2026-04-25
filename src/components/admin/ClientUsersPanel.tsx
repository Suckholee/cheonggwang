"use client";

import { useEffect, useState } from "react";
import { BadgeCheck, Clock } from "lucide-react";
import { listClientsPage } from "@/app/actions/partner-issuance-actions";
import type {
  ClientDateRange,
  ClientSortMode,
  ClientWithIssuanceStatus,
  ListClientsPageResult,
} from "@/types/admin-issuance";
import type { UserProfile } from "@/types/page";

/**
 * v1.10 partner-issue-from-users · §6.2 — 전체 명단 패널.
 *  - 페이징 (cursor stack, prev/next)
 *  - 정렬 토글 (latest / name)
 *  - createdAt 범위 필터 (M4: from > to client guard)
 *  - 발급 상태 배지 + disabled (M3: tabindex -1)
 */

interface Props {
  reloadTick: number;
  onSelect: (user: UserProfile) => void;
}

function fmtDate(d: Date): string {
  return d.toLocaleDateString("ko-KR", {
    timeZone: "Asia/Seoul",
    month: "2-digit",
    day: "2-digit",
  });
}

export default function ClientUsersPanel({ reloadTick, onSelect }: Props) {
  const [cursor, setCursor] = useState<string | null>(null);
  const [cursorStack, setCursorStack] = useState<(string | null)[]>([]);
  const [sort, setSort] = useState<ClientSortMode>("latest");
  const [draftFrom, setDraftFrom] = useState("");
  const [draftTo, setDraftTo] = useState("");
  const [dateRange, setDateRange] = useState<ClientDateRange | null>(null);

  const [data, setData] = useState<ListClientsPageResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // M4: from > to 검증 (client-side guard)
  const dateError =
    draftFrom && draftTo && draftFrom > draftTo
      ? "시작일이 종료일보다 늦습니다"
      : null;

  // H7: reloadTick deps에 포함
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    listClientsPage({ cursor, sort, dateRange })
      .then((r) => {
        if (!cancelled) setData(r);
      })
      .catch((e: Error) => {
        if (!cancelled)
          setError(e.message ?? "명단을 불러오지 못했습니다");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [cursor, sort, dateRange, reloadTick]);

  function changeSort(next: ClientSortMode) {
    if (next === sort) return;
    setSort(next);
    setCursor(null);
    setCursorStack([]);
  }

  function applyDateRange() {
    if (dateError) return;
    if (!draftFrom || !draftTo) {
      setDateRange(null);
    } else {
      setDateRange({ fromYmd: draftFrom, toYmd: draftTo });
    }
    setSort("latest"); // R5
    setCursor(null);
    setCursorStack([]);
  }

  function clearDateRange() {
    setDraftFrom("");
    setDraftTo("");
    setDateRange(null);
    setCursor(null);
    setCursorStack([]);
  }

  function next() {
    if (!data?.nextCursor) return;
    setCursorStack((s) => [...s, cursor]);
    setCursor(data.nextCursor);
  }

  function prev() {
    if (cursorStack.length === 0) return;
    const stack = [...cursorStack];
    const last = stack.pop() ?? null;
    setCursorStack(stack);
    setCursor(last);
  }

  const pageNumber = cursorStack.length + 1;
  const dateRangeActive = dateRange !== null;

  return (
    <div className="space-y-4">
      {/* 컨트롤 바 */}
      <div className="flex flex-wrap items-end gap-3 rounded-md border border-zinc-200 bg-white px-3 py-2 dark:border-zinc-800 dark:bg-zinc-900">
        <label className="text-sm">
          정렬:{" "}
          <select
            value={sort}
            onChange={(e) => changeSort(e.target.value as ClientSortMode)}
            disabled={dateRangeActive}
            className="ml-1 rounded border border-zinc-300 px-2 py-1 text-sm disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-800"
          >
            <option value="latest">최신 가입순</option>
            <option value="name">이름순</option>
          </select>
        </label>

        <div className="flex items-end gap-2">
          <label className="text-sm">
            <span className="block text-xs text-zinc-500">시작</span>
            <input
              type="date"
              value={draftFrom}
              onChange={(e) => setDraftFrom(e.target.value)}
              className="rounded border border-zinc-300 px-2 py-1 text-sm dark:border-zinc-700 dark:bg-zinc-800"
            />
          </label>
          <label className="text-sm">
            <span className="block text-xs text-zinc-500">종료</span>
            <input
              type="date"
              value={draftTo}
              onChange={(e) => setDraftTo(e.target.value)}
              className="rounded border border-zinc-300 px-2 py-1 text-sm dark:border-zinc-700 dark:bg-zinc-800"
            />
          </label>
          <button
            onClick={applyDateRange}
            disabled={!!dateError || (!draftFrom && !draftTo)}
            className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
          >
            적용
          </button>
          {dateRangeActive ? (
            <button
              onClick={clearDateRange}
              className="rounded-md border border-zinc-300 px-3 py-1.5 text-xs text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700"
            >
              해제
            </button>
          ) : null}
        </div>

        <span className="ml-auto text-xs text-zinc-500">
          페이지 {pageNumber}
        </span>
      </div>
      {dateError ? (
        <p className="text-xs text-red-600">{dateError}</p>
      ) : null}

      {/* 카드 그리드 */}
      {loading ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="h-28 animate-pulse rounded-lg bg-zinc-100 dark:bg-zinc-800"
            />
          ))}
        </div>
      ) : error ? (
        <div className="rounded-md border border-red-300 bg-red-50 px-3 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-200">
          {error}
        </div>
      ) : !data || data.items.length === 0 ? (
        <div className="rounded-lg border border-dashed border-zinc-300 p-8 text-center text-sm text-zinc-500 dark:border-zinc-700">
          아직 가입한 회원이 없습니다. 명단에 없는 사용자는 [이메일 검색] 탭을
          사용하세요.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {data.items.map((it) => (
            <ClientCard key={it.user.uid} item={it} onSelect={onSelect} />
          ))}
        </div>
      )}

      {/* 페이징 */}
      {data && (data.hasMore || cursorStack.length > 0) ? (
        <div className="flex items-center justify-between pt-2">
          <button
            onClick={prev}
            disabled={cursorStack.length === 0 || loading}
            className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm disabled:opacity-40 dark:border-zinc-700"
          >
            ← 이전
          </button>
          <span className="text-xs text-zinc-500">페이지 {pageNumber}</span>
          <button
            onClick={next}
            disabled={!data.hasMore || loading}
            className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm disabled:opacity-40 dark:border-zinc-700"
          >
            다음 →
          </button>
        </div>
      ) : null}
    </div>
  );
}

function ClientCard({
  item,
  onSelect,
}: {
  item: ClientWithIssuanceStatus;
  onSelect: (user: UserProfile) => void;
}) {
  const disabled =
    item.partnerId !== null || item.applicantStatus === "pending";
  const badge =
    item.partnerId !== null
      ? { label: "이미 발급", icon: BadgeCheck, tone: "emerald" as const }
      : item.applicantStatus === "pending"
        ? { label: "신청 검토 중", icon: Clock, tone: "amber" as const }
        : null;

  const toneClass =
    badge?.tone === "emerald"
      ? "border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
      : badge?.tone === "amber"
        ? "border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-300"
        : "";

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => onSelect(item.user)}
      aria-disabled={disabled}
      tabIndex={disabled ? -1 : 0}
      className={`relative w-full rounded-lg border p-4 text-left transition ${
        disabled
          ? "border-zinc-200 bg-zinc-50 opacity-60 cursor-not-allowed dark:border-zinc-800 dark:bg-zinc-900"
          : "border-zinc-200 bg-white hover:border-blue-400 hover:bg-blue-50 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-blue-700 dark:hover:bg-blue-950"
      }`}
    >
      <p className="truncate text-sm font-semibold text-zinc-900 dark:text-zinc-100">
        {item.user.displayName || "(이름 없음)"}
      </p>
      <p className="mt-0.5 truncate text-xs text-zinc-500">
        {item.user.email}
      </p>
      {item.user.contactPhone ? (
        <p className="mt-0.5 truncate text-xs text-zinc-500">
          {item.user.contactPhone}
        </p>
      ) : null}
      <p className="mt-1 text-[11px] text-zinc-400">
        {fmtDate(item.user.createdAt)} 가입
      </p>
      {badge ? (
        <span
          className={`mt-2 inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium ${toneClass}`}
        >
          <badge.icon className="h-3 w-3" aria-hidden />
          {badge.label}
        </span>
      ) : null}
    </button>
  );
}
