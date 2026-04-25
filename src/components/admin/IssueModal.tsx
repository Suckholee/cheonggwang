"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import {
  QUOTE_CATEGORIES,
  QUOTE_CATEGORY_LABELS,
} from "@/domain/quote-category";
import type { UserProfile } from "@/types/page";
import type { PartnerApplicant } from "@/types/partner-applicant";

/**
 * v1.10 partner-issue-from-users · §6.4·6.5 — 발급 모달.
 *  - kind='fresh':  POST /api/admin/partners (cycle #20)
 *  - kind='approve': POST /api/admin/partners/applicants/[id]/approve (cycle #21)
 *
 * R2: kind='approve'는 read-only preview (신청서 내용 수정 불가, cycle #21 route는 신청서 그대로 변환)
 * H5: ALREADY_REGISTERED 메시지에 partnerId 포함 — admin context이므로 그대로 표시 OK
 * R6: 성공 시 onSuccess() 호출 → IssuanceConsole이 router.refresh + setReloadTick
 */

export type IssueModalProps =
  | {
      kind: "fresh";
      user: UserProfile;
      onClose: () => void;
      onSuccess: () => void;
    }
  | {
      kind: "approve";
      applicant: PartnerApplicant;
      onClose: () => void;
      onSuccess: () => void;
    };

export default function IssueModal(props: IssueModalProps) {
  // ESC 닫기
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") props.onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [props]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) props.onClose();
      }}
    >
      {props.kind === "fresh" ? (
        <FreshIssue
          user={props.user}
          onClose={props.onClose}
          onSuccess={props.onSuccess}
        />
      ) : (
        <ApproveApplicant
          applicant={props.applicant}
          onClose={props.onClose}
          onSuccess={props.onSuccess}
        />
      )}
    </div>
  );
}

function FreshIssue({
  user,
  onClose,
  onSuccess,
}: {
  user: UserProfile;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [businessName, setBusinessName] = useState("");
  const [category, setCategory] = useState<string>("");
  const [regionLabel, setRegionLabel] = useState("");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = businessName.trim().length > 0 && !busy;

  async function submit() {
    if (!canSubmit) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/partners", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          uid: user.uid,
          businessName: businessName.trim(),
          ...(category ? { category } : {}),
          ...(regionLabel ? { regionLabel: regionLabel.trim() } : {}),
          ...(notes ? { notes: notes.trim() } : {}),
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(json.message ?? "발급 실패");
        return;
      }
      onSuccess();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className="w-full max-w-md rounded-lg bg-white p-5 shadow-xl dark:bg-zinc-900"
      role="dialog"
      aria-modal="true"
    >
      <header className="mb-3 flex items-center justify-between">
        <h2 className="text-base font-semibold">새 의뢰업체 발급</h2>
        <button
          onClick={onClose}
          disabled={busy}
          className="rounded p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 disabled:opacity-50 dark:hover:bg-zinc-800"
          aria-label="닫기"
        >
          <X className="h-4 w-4" aria-hidden />
        </button>
      </header>

      <section className="rounded-md bg-zinc-50 p-3 text-sm dark:bg-zinc-800">
        <p className="text-xs text-zinc-500">대상 회원</p>
        <p className="mt-0.5 font-medium">
          {user.displayName || "(이름 없음)"}
        </p>
        <p className="text-xs text-zinc-500">{user.email}</p>
        {user.contactPhone ? (
          <p className="text-xs text-zinc-500">{user.contactPhone}</p>
        ) : null}
      </section>

      <div className="mt-4 space-y-3">
        <label className="block text-sm">
          매장명 *
          <input
            type="text"
            value={businessName}
            onChange={(e) => setBusinessName(e.target.value.slice(0, 40))}
            placeholder="예: 청담클리닝"
            className="mt-1 w-full rounded-md border border-zinc-300 px-2 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-800"
          />
        </label>

        <label className="block text-sm">
          카테고리
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="mt-1 w-full rounded-md border border-zinc-300 px-2 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-800"
          >
            <option value="">선택하지 않음</option>
            {QUOTE_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {QUOTE_CATEGORY_LABELS[c]}
              </option>
            ))}
          </select>
        </label>

        <label className="block text-sm">
          지역
          <input
            type="text"
            value={regionLabel}
            onChange={(e) => setRegionLabel(e.target.value.slice(0, 60))}
            placeholder="예: 서울 강남구"
            className="mt-1 w-full rounded-md border border-zinc-300 px-2 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-800"
          />
        </label>

        <label className="block text-sm">
          메모 <span className="text-xs text-zinc-500">(운영자용, 선택)</span>
          <textarea
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value.slice(0, 500))}
            className="mt-1 w-full rounded-md border border-zinc-300 px-2 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-800"
          />
        </label>
      </div>

      {error ? (
        <p className="mt-3 rounded-md border border-red-300 bg-red-50 px-3 py-2 text-xs text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-200">
          {error}
        </p>
      ) : null}

      <footer className="mt-5 flex justify-end gap-2">
        <button
          onClick={onClose}
          disabled={busy}
          className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
        >
          취소
        </button>
        <button
          onClick={submit}
          disabled={!canSubmit}
          className="rounded-md bg-blue-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {busy ? "발급 중…" : "✨ 발급"}
        </button>
      </footer>
    </div>
  );
}

function ApproveApplicant({
  applicant,
  onClose,
  onSuccess,
}: {
  applicant: PartnerApplicant;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function approve() {
    if (busy) return;
    setBusy(true);
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
      onSuccess();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className="w-full max-w-md rounded-lg bg-white p-5 shadow-xl dark:bg-zinc-900"
      role="dialog"
      aria-modal="true"
    >
      <header className="mb-3 flex items-center justify-between">
        <h2 className="text-base font-semibold">신청 승인</h2>
        <button
          onClick={onClose}
          disabled={busy}
          className="rounded p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 disabled:opacity-50 dark:hover:bg-zinc-800"
          aria-label="닫기"
        >
          <X className="h-4 w-4" aria-hidden />
        </button>
      </header>

      <section className="rounded-md border border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-700 dark:bg-zinc-800">
        <dl className="grid grid-cols-[80px_1fr] gap-y-1.5 text-sm">
          <dt className="text-zinc-500">매장명</dt>
          <dd className="font-medium">{applicant.businessName}</dd>
          <dt className="text-zinc-500">카테고리</dt>
          <dd>
            {applicant.category
              ? QUOTE_CATEGORY_LABELS[applicant.category]
              : "(미지정)"}
          </dd>
          <dt className="text-zinc-500">지역</dt>
          <dd>{applicant.regionLabel ?? "(미지정)"}</dd>
          <dt className="text-zinc-500">신청자</dt>
          <dd>
            {applicant.email}
            {applicant.phone ? ` · ${applicant.phone}` : ""}
          </dd>
          <dt className="text-zinc-500">신청 일시</dt>
          <dd className="text-xs text-zinc-500">
            {applicant.appliedAt.toLocaleString("ko-KR", {
              timeZone: "Asia/Seoul",
            })}
          </dd>
        </dl>
        {applicant.intro ? (
          <div className="mt-3 border-t border-zinc-200 pt-3 dark:border-zinc-700">
            <p className="text-xs text-zinc-500">매장 소개</p>
            <p className="mt-1 whitespace-pre-line text-sm">
              {applicant.intro}
            </p>
          </div>
        ) : null}
      </section>

      <p className="mt-3 rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:bg-amber-950 dark:text-amber-200">
        ⓘ 정보 수정이 필요하면 신청 상세 페이지(<code>/admin/partners/applicants/{applicant.id}</code>)에서 거절하고 사장님이 재신청하도록 안내해주세요.
      </p>

      {error ? (
        <p className="mt-3 rounded-md border border-red-300 bg-red-50 px-3 py-2 text-xs text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-200">
          {error}
        </p>
      ) : null}

      <footer className="mt-5 flex justify-end gap-2">
        <button
          onClick={onClose}
          disabled={busy}
          className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
        >
          취소
        </button>
        <button
          onClick={approve}
          disabled={busy}
          className="rounded-md bg-emerald-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
        >
          {busy ? "승인 중…" : "✓ 승인하고 발급"}
        </button>
      </footer>
    </div>
  );
}
