"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  togglePartnerRagSuspended,
  reviewPartnerRag,
  adminDeletePartnerProfile,
} from "@/app/actions/partner-profile-actions";
import { PARTNER_INDUSTRY_LABELS } from "@/domain/partner-industry";
import type { PartnerProfile } from "@/types/partner-profile";

/**
 * v1.11 partner-rag-system · §6.5 — admin 측 partner profile 편집·강제 토글 섹션.
 * /admin/partners/[partnerId] 상세 페이지 안에 임베드.
 */

interface Props {
  partnerId: string;
  profile: PartnerProfile | null;
}

export default function PartnerProfileEditor({ partnerId, profile }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState<"suspend" | "approve" | "reject" | "delete" | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);
  const [reason, setReason] = useState("");

  if (!profile) {
    return (
      <section className="rounded-lg border border-dashed border-zinc-300 p-6 text-sm text-zinc-500 dark:border-zinc-700">
        매장 RAG 자료가 등록되지 않았습니다. (사장님이{" "}
        <code>/partner/profile</code>에서 등록하면 표시됩니다.)
      </section>
    );
  }

  async function suspendToggle() {
    setBusy("suspend");
    setError(null);
    try {
      const res = await togglePartnerRagSuspended({
        partnerId,
        suspended: !profile!.suspended,
      });
      if (!res.ok) setError(res.message ?? "처리 실패");
      else router.refresh();
    } finally {
      setBusy(null);
    }
  }

  async function decide(decision: "approved" | "rejected") {
    if (decision === "rejected" && !reason.trim()) {
      setError("거절 사유 필요");
      return;
    }
    setBusy(decision === "approved" ? "approve" : "reject");
    setError(null);
    try {
      const res = await reviewPartnerRag({
        partnerId,
        decision,
        reason: reason.trim() || undefined,
      });
      if (!res.ok) setError(res.message ?? "처리 실패");
      else {
        setReason("");
        router.refresh();
      }
    } finally {
      setBusy(null);
    }
  }

  async function deleteProfile() {
    if (!confirm("이 매장의 RAG profile을 완전 삭제할까요?")) return;
    setBusy("delete");
    setError(null);
    try {
      const res = await adminDeletePartnerProfile(partnerId);
      if (!res.ok) setError(res.message ?? "처리 실패");
      else router.refresh();
    } finally {
      setBusy(null);
    }
  }

  return (
    <section className="rounded-lg border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
      <header className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold">매장 RAG 자료</h2>
        <span
          className={`rounded-full border px-2 py-0.5 text-[11px] font-medium ${toneOf(profile.status)}`}
        >
          {labelStatus(profile.status)}
        </span>
      </header>

      <dl className="grid grid-cols-[100px_1fr] gap-y-1.5 text-sm">
        <dt className="text-zinc-500">업종</dt>
        <dd>{PARTNER_INDUSTRY_LABELS[profile.industry]}</dd>
        <dt className="text-zinc-500">version</dt>
        <dd>v{profile.version}</dd>
        <dt className="text-zinc-500">hygiene</dt>
        <dd>{profile.hygieneScore.toFixed(2)}</dd>
        <dt className="text-zinc-500">suspended</dt>
        <dd>{profile.suspended ? "🚫 정지" : "—"}</dd>
        <dt className="text-zinc-500">photos</dt>
        <dd>{profile.photoUrls.length}장</dd>
      </dl>

      <details className="mt-3">
        <summary className="cursor-pointer text-xs text-zinc-500">
          상세 보기
        </summary>
        <div className="mt-2 space-y-2 rounded-md bg-zinc-50 p-3 text-xs dark:bg-zinc-800">
          <p className="whitespace-pre-line">{profile.description}</p>
          {profile.usps.length > 0 ? (
            <p>강점: {profile.usps.join(" · ")}</p>
          ) : null}
          {profile.priceItems.length > 0 ? (
            <p>
              메뉴:{" "}
              {profile.priceItems
                .slice(0, 8)
                .map((p) => `${p.name} ${p.price.toLocaleString()}원`)
                .join(" · ")}
              {profile.priceItems.length > 8 ? " …" : ""}
            </p>
          ) : null}
        </div>
      </details>

      <div className="mt-3">
        <input
          type="text"
          value={reason}
          onChange={(e) => setReason(e.target.value.slice(0, 500))}
          placeholder="거절 사유 (필요 시)"
          className="w-full rounded-md border border-zinc-300 px-2 py-1 text-xs dark:border-zinc-700 dark:bg-zinc-800"
        />
      </div>

      {error ? (
        <p className="mt-2 text-xs text-red-600">{error}</p>
      ) : null}

      <footer className="mt-3 flex flex-wrap gap-2">
        <button
          onClick={() => decide("approved")}
          disabled={!!busy}
          className="rounded-md border border-emerald-300 px-2 py-1 text-xs text-emerald-700 hover:bg-emerald-50 disabled:opacity-50 dark:border-emerald-800 dark:text-emerald-300"
        >
          ✓ 강제 승인
        </button>
        <button
          onClick={() => decide("rejected")}
          disabled={!!busy || !reason.trim()}
          className="rounded-md border border-red-300 px-2 py-1 text-xs text-red-700 hover:bg-red-50 disabled:opacity-50 dark:border-red-800 dark:text-red-300"
        >
          ✗ 강제 거절
        </button>
        <button
          onClick={suspendToggle}
          disabled={!!busy}
          className="rounded-md border border-amber-300 px-2 py-1 text-xs text-amber-700 hover:bg-amber-50 disabled:opacity-50 dark:border-amber-800 dark:text-amber-300"
        >
          {profile.suspended ? "정지 해제" : "🚫 일시 정지"}
        </button>
        <button
          onClick={deleteProfile}
          disabled={!!busy}
          className="ml-auto rounded-md border border-zinc-300 px-2 py-1 text-xs text-zinc-700 hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-300"
        >
          삭제
        </button>
      </footer>
    </section>
  );
}

function toneOf(status: PartnerProfile["status"]): string {
  switch (status) {
    case "auto-approved":
    case "approved":
      return "border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-300";
    case "pending-review":
      return "border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-300";
    case "rejected":
      return "border-red-300 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-300";
  }
}

function labelStatus(status: PartnerProfile["status"]): string {
  return {
    "auto-approved": "✅ 자동 승인",
    approved: "✅ 운영팀 승인",
    "pending-review": "⏳ 검토 대기",
    rejected: "❌ 거절",
  }[status];
}
