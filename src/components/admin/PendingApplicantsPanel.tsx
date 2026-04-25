"use client";

import { useEffect, useState } from "react";
import { listPendingApplicantsForIssuance } from "@/app/actions/partner-issuance-actions";
import { QUOTE_CATEGORY_LABELS } from "@/domain/quote-category";
import type { PartnerApplicant } from "@/types/partner-applicant";

/**
 * v1.10 partner-issue-from-users · §6.3 — 신청자 패널.
 * cycle #21 partnerApplicantRepository.listPending 재활용.
 */

interface Props {
  reloadTick: number;
  onSelect: (applicant: PartnerApplicant) => void;
}

function fmtDateTime(d: Date): string {
  return d.toLocaleString("ko-KR", {
    timeZone: "Asia/Seoul",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function PendingApplicantsPanel({
  reloadTick,
  onSelect,
}: Props) {
  const [items, setItems] = useState<PartnerApplicant[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    listPendingApplicantsForIssuance()
      .then((r) => {
        if (!cancelled) setItems(r);
      })
      .catch((e: Error) => {
        if (!cancelled)
          setError(e.message ?? "신청자 명단을 불러오지 못했습니다");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [reloadTick]);

  if (loading) {
    return (
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="h-32 animate-pulse rounded-lg bg-zinc-100 dark:bg-zinc-800"
          />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-md border border-red-300 bg-red-50 px-3 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-200">
        {error}
      </div>
    );
  }

  if (!items || items.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-zinc-300 p-8 text-center text-sm text-zinc-500 dark:border-zinc-700">
        대기 중인 신청이 없습니다. 사장님이{" "}
        <code className="rounded bg-zinc-100 px-1 dark:bg-zinc-800">
          /signup-partner
        </code>
        에서 가입하면 여기에 표시됩니다.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-zinc-500">대기 중 신청자 {items.length}건</p>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((a) => (
          <button
            key={a.id}
            type="button"
            onClick={() => onSelect(a)}
            className="rounded-lg border border-zinc-200 bg-white p-4 text-left transition hover:border-blue-400 hover:bg-blue-50 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-blue-700 dark:hover:bg-blue-950"
          >
            <p className="truncate text-sm font-semibold">{a.businessName}</p>
            <p className="mt-1 text-xs text-zinc-500">
              {a.category ? QUOTE_CATEGORY_LABELS[a.category] : "(카테고리 미지정)"}
              {" · "}
              {a.regionLabel ?? "(지역 미지정)"}
            </p>
            <p className="mt-1 truncate text-xs text-zinc-500">{a.email}</p>
            {a.phone ? (
              <p className="truncate text-xs text-zinc-500">{a.phone}</p>
            ) : null}
            <p className="mt-2 text-[11px] text-zinc-400">
              {fmtDateTime(a.appliedAt)} 신청
            </p>
          </button>
        ))}
      </div>
    </div>
  );
}
