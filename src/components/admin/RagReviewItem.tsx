"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import {
  reviewPartnerRag,
} from "@/app/actions/partner-profile-actions";
import { PARTNER_INDUSTRY_LABELS } from "@/domain/partner-industry";
import type { PartnerProfile } from "@/types/partner-profile";

/**
 * v1.11 partner-rag-system · §6.2 — 검토 모달 (RagReviewItem).
 */

interface Props {
  partnerId: string;
  ownerUid: string;
  businessName: string;
  profile: PartnerProfile;
  onClose: () => void;
  onResolved: () => void;
}

export function RagReviewItem({
  partnerId,
  businessName,
  profile,
  onClose,
  onResolved,
}: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function decide(decision: "approved" | "rejected") {
    if (decision === "rejected" && !reason.trim()) {
      setError("거절 시 사유 필수");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await reviewPartnerRag({
        partnerId,
        decision,
        reason: reason.trim() || undefined,
      });
      if (!res.ok) {
        setError(res.message ?? "처리 실패");
        return;
      }
      onResolved();
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-lg bg-white p-5 shadow-xl dark:bg-zinc-900"
      >
        <header className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-semibold">매장 RAG 검토</h2>
          <button
            onClick={onClose}
            disabled={busy}
            className="rounded p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800"
            aria-label="닫기"
          >
            <X className="h-4 w-4" aria-hidden />
          </button>
        </header>

        <section className="space-y-3 rounded-md border border-zinc-200 bg-zinc-50 p-3 text-sm dark:border-zinc-800 dark:bg-zinc-800">
          <dl className="grid grid-cols-[88px_1fr] gap-y-1.5">
            <dt className="text-zinc-500">매장명</dt>
            <dd className="font-medium">{businessName}</dd>
            <dt className="text-zinc-500">업종</dt>
            <dd>{PARTNER_INDUSTRY_LABELS[profile.industry]}</dd>
            <dt className="text-zinc-500">hygiene</dt>
            <dd>{profile.hygieneScore.toFixed(2)} (threshold 0.70)</dd>
            <dt className="text-zinc-500">version</dt>
            <dd>v{profile.version}</dd>
            <dt className="text-zinc-500">변경</dt>
            <dd className="text-xs text-zinc-500">
              {profile.updatedAt.toLocaleString("ko-KR", {
                timeZone: "Asia/Seoul",
              })}
            </dd>
          </dl>
          <hr className="border-zinc-200 dark:border-zinc-700" />
          <div>
            <p className="text-xs font-medium text-zinc-500">매장 소개</p>
            <p className="mt-1 whitespace-pre-line">{profile.description}</p>
          </div>
          {profile.usps.length > 0 ? (
            <div>
              <p className="text-xs font-medium text-zinc-500">강점</p>
              <p className="mt-1">{profile.usps.join(" · ")}</p>
            </div>
          ) : null}
          {profile.priceItems.length > 0 ? (
            <div>
              <p className="text-xs font-medium text-zinc-500">메뉴 ({profile.priceItems.length}건)</p>
              <ul className="mt-1 space-y-0.5 text-xs">
                {profile.priceItems.slice(0, 10).map((item, i) => (
                  <li key={i}>
                    {item.name}{" "}
                    <span className="text-zinc-400">
                      {item.price.toLocaleString()}원
                    </span>
                  </li>
                ))}
                {profile.priceItems.length > 10 ? (
                  <li className="text-zinc-400">
                    + {profile.priceItems.length - 10}건…
                  </li>
                ) : null}
              </ul>
            </div>
          ) : null}
          {profile.photoUrls.length > 0 ? (
            <div>
              <p className="text-xs font-medium text-zinc-500">사진 ({profile.photoUrls.length}장)</p>
              <div className="mt-1 grid grid-cols-4 gap-1">
                {profile.photoUrls.slice(0, 8).map((url, i) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    key={`${url}-${i}`}
                    src={url}
                    alt={`매장 사진 ${i + 1}`}
                    className="aspect-square w-full rounded object-cover"
                  />
                ))}
              </div>
            </div>
          ) : null}
          {profile.photoAnalysisSummary ? (
            <div>
              <p className="text-xs font-medium text-zinc-500">사진 텍스트 요약 (RAG cache)</p>
              <p className="mt-1 whitespace-pre-line text-xs text-zinc-600 dark:text-zinc-400">
                {profile.photoAnalysisSummary}
              </p>
            </div>
          ) : null}
        </section>

        <div className="mt-4">
          <label className="block text-xs text-zinc-500">
            거절 사유 (거절 시 필수, ≤500자)
          </label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value.slice(0, 500))}
            rows={2}
            className="mt-1 w-full rounded-md border border-zinc-300 p-2 text-sm dark:border-zinc-700 dark:bg-zinc-800"
          />
        </div>

        {error ? (
          <p className="mt-2 rounded-md border border-red-300 bg-red-50 px-3 py-2 text-xs text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-200">
            {error}
          </p>
        ) : null}

        <footer className="mt-4 flex justify-end gap-2">
          <button
            onClick={onClose}
            disabled={busy}
            className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-700"
          >
            취소
          </button>
          <button
            onClick={() => decide("rejected")}
            disabled={busy || !reason.trim()}
            className="rounded-md border border-red-300 px-3 py-1.5 text-sm text-red-700 hover:bg-red-50 disabled:opacity-50 dark:border-red-800 dark:text-red-300"
          >
            ✗ 거절
          </button>
          <button
            onClick={() => decide("approved")}
            disabled={busy}
            className="rounded-md bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
          >
            {busy ? "처리 중…" : "✓ 승인"}
          </button>
        </footer>
      </div>
    </div>
  );
}
