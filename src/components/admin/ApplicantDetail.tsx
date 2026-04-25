"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { PartnerApplicant, PartnerApplicantStatus } from "@/types/partner-applicant";
import { QUOTE_CATEGORY_LABELS } from "@/domain/quote-category";

const STATUS_LABEL: Record<PartnerApplicantStatus, string> = {
  pending: "검토 중",
  approved: "승인",
  rejected: "거절",
};

/**
 * v1.9 partner-application · §6.4 — 신청자 상세 + 승인/거절 액션.
 */

interface Props {
  applicant: PartnerApplicant;
}

export default function ApplicantDetail({ applicant }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState<"approve" | "reject" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState("");

  const isPending = applicant.status === "pending";

  async function approve() {
    if (busy) return;
    if (!confirm(`${applicant.businessName} 신청을 승인하시겠습니까?`)) return;
    setBusy("approve");
    setError(null);
    try {
      const res = await fetch(
        `/api/admin/partners/applicants/${applicant.id}/approve`,
        { method: "POST" },
      );
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(json.message ?? "승인 실패");
        return;
      }
      router.push(json.redirectTo ?? "/admin/partners");
    } finally {
      setBusy(null);
    }
  }

  async function reject() {
    if (busy) return;
    if (!rejectReason.trim()) {
      setError("거절 사유를 입력해 주세요");
      return;
    }
    setBusy("reject");
    setError(null);
    try {
      const res = await fetch(
        `/api/admin/partners/applicants/${applicant.id}/reject`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ reason: rejectReason.trim() }),
        },
      );
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(json.message ?? "거절 실패");
        return;
      }
      setShowRejectModal(false);
      router.push("/admin/partners");
      router.refresh();
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-6">
      <section className="rounded-lg border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
        <h2 className="mb-3 text-sm font-semibold">신청 정보</h2>
        <dl className="grid grid-cols-[100px_1fr] gap-y-2 text-sm">
          <dt className="text-zinc-500">매장명</dt>
          <dd>{applicant.businessName}</dd>
          <dt className="text-zinc-500">이메일</dt>
          <dd>{applicant.email}</dd>
          <dt className="text-zinc-500">연락처</dt>
          <dd>{applicant.phone ?? "-"}</dd>
          <dt className="text-zinc-500">카테고리</dt>
          <dd>{applicant.category ? QUOTE_CATEGORY_LABELS[applicant.category] : "-"}</dd>
          <dt className="text-zinc-500">지역</dt>
          <dd>{applicant.regionLabel ?? "-"}</dd>
          <dt className="text-zinc-500">상태</dt>
          <dd>
            <span
              className={
                applicant.status === "pending"
                  ? "text-amber-600"
                  : applicant.status === "approved"
                    ? "text-emerald-600"
                    : "text-red-600"
              }
            >
              {STATUS_LABEL[applicant.status]}
            </span>
          </dd>
          <dt className="text-zinc-500">신청</dt>
          <dd>
            {applicant.appliedAt.toLocaleString("ko-KR", {
              timeZone: "Asia/Seoul",
            })}
          </dd>
          {applicant.reviewedAt ? (
            <>
              <dt className="text-zinc-500">검토</dt>
              <dd>
                {applicant.reviewedAt.toLocaleString("ko-KR", {
                  timeZone: "Asia/Seoul",
                })}{" "}
                · by {applicant.reviewedBy}
              </dd>
            </>
          ) : null}
          {applicant.rejectReason ? (
            <>
              <dt className="text-zinc-500">거절 사유</dt>
              <dd className="text-red-700 dark:text-red-300">
                {applicant.rejectReason}
              </dd>
            </>
          ) : null}
          <dt className="text-zinc-500">ownerUid</dt>
          <dd className="break-all font-mono text-xs">{applicant.ownerUid}</dd>
        </dl>
        {applicant.intro ? (
          <div className="mt-4">
            <p className="mb-1 text-xs text-zinc-500">매장 소개</p>
            <p className="whitespace-pre-line rounded-md bg-zinc-50 p-3 text-sm dark:bg-zinc-800">
              {applicant.intro}
            </p>
          </div>
        ) : null}
      </section>

      {error ? (
        <div className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-200">
          {error}
        </div>
      ) : null}

      {isPending ? (
        <div className="flex justify-between">
          <button
            onClick={() => setShowRejectModal(true)}
            disabled={!!busy}
            className="rounded-md border border-red-300 px-4 py-2 text-sm text-red-700 hover:bg-red-50 disabled:opacity-50 dark:border-red-800 dark:text-red-300 dark:hover:bg-red-950"
          >
            ✗ 거절
          </button>
          <button
            onClick={approve}
            disabled={!!busy}
            className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
          >
            {busy === "approve" ? "승인 중…" : "✓ 승인"}
          </button>
        </div>
      ) : (
        <p className="rounded-md border border-zinc-200 bg-zinc-50 p-3 text-sm text-zinc-600 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-400">
          이미 처리된 신청입니다 ({STATUS_LABEL[applicant.status]}).
        </p>
      )}

      {showRejectModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-lg bg-white p-5 shadow-xl dark:bg-zinc-900">
            <h3 className="text-base font-semibold">신청 거절</h3>
            <p className="mt-1 text-xs text-zinc-500">
              신청자에게 표시되는 사유 (≤200자)
            </p>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value.slice(0, 200))}
              rows={4}
              className="mt-3 w-full rounded-md border border-zinc-300 p-2 text-sm dark:border-zinc-700 dark:bg-zinc-800"
              placeholder="예: 사업자 정보가 확인되지 않습니다."
            />
            <p className="mt-1 text-right text-xs text-zinc-500">
              {rejectReason.length}/200
            </p>
            <div className="mt-3 flex justify-end gap-2">
              <button
                onClick={() => {
                  setShowRejectModal(false);
                  setRejectReason("");
                }}
                disabled={!!busy}
                className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
              >
                취소
              </button>
              <button
                onClick={reject}
                disabled={!!busy || !rejectReason.trim()}
                className="rounded-md bg-red-600 px-3 py-1.5 text-sm text-white hover:bg-red-700 disabled:opacity-50"
              >
                {busy === "reject" ? "거절 중…" : "거절 확정"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
