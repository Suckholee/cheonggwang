"use client";

import { useState } from "react";
import { PARTNER_INDUSTRY_LABELS } from "@/domain/partner-industry";
import { RagReviewItem } from "./RagReviewItem";
import type { PartnerProfile } from "@/types/partner-profile";

interface ReviewItem {
  id: string;
  ownerUid: string;
  businessName: string;
  profile: PartnerProfile;
}

/**
 * v1.11 partner-rag-system · §6.2 — pending-review 큐 목록.
 */
export default function RagReviewList({ items }: { items: ReviewItem[] }) {
  const [openItem, setOpenItem] = useState<ReviewItem | null>(null);

  if (items.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-zinc-300 p-8 text-center text-sm text-zinc-500 dark:border-zinc-700">
        검토 대기 중인 RAG 자료가 없습니다.
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((it) => (
          <button
            key={it.id}
            type="button"
            onClick={() => setOpenItem(it)}
            className="rounded-lg border border-zinc-200 bg-white p-4 text-left transition hover:border-blue-400 hover:bg-blue-50 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-blue-700 dark:hover:bg-blue-950"
          >
            <p className="truncate text-sm font-semibold">{it.businessName}</p>
            <p className="mt-1 text-xs text-zinc-500">
              {PARTNER_INDUSTRY_LABELS[it.profile.industry]} · score{" "}
              {it.profile.hygieneScore.toFixed(2)}
            </p>
            <p className="mt-1 text-[11px] text-zinc-400">
              사진 {it.profile.photoUrls.length}장 · v{it.profile.version}
            </p>
            <p className="mt-2 line-clamp-2 text-xs text-zinc-600 dark:text-zinc-400">
              {it.profile.description}
            </p>
          </button>
        ))}
      </div>

      {openItem ? (
        <RagReviewItem
          partnerId={openItem.id}
          ownerUid={openItem.ownerUid}
          businessName={openItem.businessName}
          profile={openItem.profile}
          onClose={() => setOpenItem(null)}
          onResolved={() => setOpenItem(null)}
        />
      ) : null}
    </>
  );
}
