"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, X } from "lucide-react";
import {
  PARTNER_INDUSTRIES,
  PARTNER_INDUSTRY_LABELS,
  type PartnerIndustry,
} from "@/domain/partner-industry";
import { savePartnerProfile } from "@/app/actions/partner-profile-actions";
import { PartnerProfilePhotoUpload } from "./PartnerProfilePhotoUpload";
import type { PartnerProfile } from "@/types/partner-profile";

/**
 * v1.11 partner-rag-system · §6.1 — 매장 RAG 자료 입력 폼.
 *
 * 입력: description·usps·priceItems·photoUrls·industry
 * 저장: server action savePartnerProfile → 자동 hygiene-guard 1차 → status 결정
 */

interface Props {
  initial: PartnerProfile | null;
}

export function PartnerProfileForm({ initial }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [resultBanner, setResultBanner] = useState<{
    status: string;
    score: number;
  } | null>(null);

  const [description, setDescription] = useState(initial?.description ?? "");
  const [usps, setUsps] = useState<string[]>(initial?.usps ?? []);
  const [uspDraft, setUspDraft] = useState("");
  const [priceItems, setPriceItems] = useState(initial?.priceItems ?? []);
  const [priceDraftName, setPriceDraftName] = useState("");
  const [priceDraftPrice, setPriceDraftPrice] = useState("");
  const [photoUrls, setPhotoUrls] = useState<string[]>(initial?.photoUrls ?? []);
  const [industry, setIndustry] = useState<PartnerIndustry>(
    initial?.industry ?? "other",
  );

  function addUsp() {
    const v = uspDraft.trim();
    if (!v) return;
    if (usps.length >= 10) return;
    setUsps([...usps, v.slice(0, 50)]);
    setUspDraft("");
  }

  function addPriceItem() {
    const name = priceDraftName.trim();
    const price = Number(priceDraftPrice);
    if (!name || !Number.isFinite(price) || price < 0) return;
    if (priceItems.length >= 30) return;
    setPriceItems([...priceItems, { name: name.slice(0, 50), price }]);
    setPriceDraftName("");
    setPriceDraftPrice("");
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitError(null);
    setResultBanner(null);
    startTransition(async () => {
      const res = await savePartnerProfile({
        description,
        usps,
        priceItems,
        photoUrls,
        industry,
      });
      if (!res.ok) {
        setSubmitError(res.message ?? "저장 실패");
        return;
      }
      setResultBanner({
        status: res.data!.status,
        score: res.data!.hygieneScore,
      });
      router.refresh();
    });
  }

  const charCount = description.length;

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      {initial?.status ? (
        <StatusBanner profile={initial} />
      ) : null}

      {resultBanner ? (
        <div className="rounded-md border border-blue-300 bg-blue-50 px-3 py-2 text-sm text-blue-900 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-200">
          저장 완료 — 상태 <strong>{labelStatus(resultBanner.status)}</strong>{" "}
          (hygiene {resultBanner.score.toFixed(2)})
        </div>
      ) : null}

      <div>
        <label className="mb-1 block text-sm font-medium">업종 *</label>
        <select
          value={industry}
          onChange={(e) => setIndustry(e.target.value as PartnerIndustry)}
          className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
        >
          {PARTNER_INDUSTRIES.map((i) => (
            <option key={i} value={i}>
              {PARTNER_INDUSTRY_LABELS[i]}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium">
          매장 소개 * (20-2000자)
        </label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value.slice(0, 2000))}
          rows={6}
          placeholder="매장의 분위기, 운영 시간, 시그니처 메뉴 등 자세한 소개를 적어주세요."
          className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
        />
        <p className="mt-1 text-right text-[11px] text-zinc-500">
          {charCount} / 2000
        </p>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium">
          강점·차별점 (USPs, 최대 10개)
        </label>
        <div className="flex gap-2">
          <input
            type="text"
            value={uspDraft}
            onChange={(e) => setUspDraft(e.target.value.slice(0, 50))}
            placeholder="예: 수제 메뉴, 유기농 원두"
            className="flex-1 rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addUsp();
              }
            }}
          />
          <button
            type="button"
            onClick={addUsp}
            disabled={usps.length >= 10}
            className="rounded-md border border-zinc-300 px-3 py-2 text-sm hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-700"
          >
            <Plus className="h-3 w-3" />
          </button>
        </div>
        {usps.length > 0 ? (
          <ul className="mt-2 flex flex-wrap gap-1">
            {usps.map((u, i) => (
              <li
                key={`${u}-${i}`}
                className="inline-flex items-center gap-1 rounded-full bg-zinc-100 px-2 py-0.5 text-xs dark:bg-zinc-800"
              >
                {u}
                <button
                  type="button"
                  onClick={() => setUsps(usps.filter((_, j) => j !== i))}
                  aria-label="삭제"
                >
                  <X className="h-3 w-3 text-zinc-400 hover:text-zinc-700" />
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium">
          메뉴·가격 (최대 30건)
        </label>
        <div className="flex gap-2">
          <input
            type="text"
            value={priceDraftName}
            onChange={(e) => setPriceDraftName(e.target.value.slice(0, 50))}
            placeholder="메뉴명"
            className="flex-1 rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
          />
          <input
            type="number"
            value={priceDraftPrice}
            onChange={(e) => setPriceDraftPrice(e.target.value)}
            placeholder="가격(원)"
            className="w-28 rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
          />
          <button
            type="button"
            onClick={addPriceItem}
            disabled={priceItems.length >= 30}
            className="rounded-md border border-zinc-300 px-3 py-2 text-sm hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-700"
          >
            <Plus className="h-3 w-3" />
          </button>
        </div>
        {priceItems.length > 0 ? (
          <ul className="mt-2 divide-y divide-zinc-100 rounded-md border border-zinc-200 dark:divide-zinc-800 dark:border-zinc-800">
            {priceItems.map((item, i) => (
              <li
                key={`${item.name}-${i}`}
                className="flex items-center justify-between px-3 py-1.5 text-sm"
              >
                <span>
                  {item.name}{" "}
                  <span className="text-zinc-500">
                    {item.price.toLocaleString()}원
                  </span>
                </span>
                <button
                  type="button"
                  onClick={() =>
                    setPriceItems(priceItems.filter((_, j) => j !== i))
                  }
                  aria-label="삭제"
                >
                  <X className="h-3 w-3 text-zinc-400 hover:text-zinc-700" />
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium">
          영구 매장 사진 (최대 10장)
        </label>
        <PartnerProfilePhotoUpload
          values={photoUrls}
          onChange={setPhotoUrls}
          max={10}
        />
      </div>

      {submitError ? (
        <div
          role="alert"
          className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-200"
        >
          {submitError}
        </div>
      ) : null}

      <button
        type="submit"
        disabled={isPending}
        className="w-full rounded-md bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
      >
        {isPending ? "저장 중…" : "✓ 저장 + 검토 신청"}
      </button>

      <p className="text-center text-xs text-zinc-500">
        ⓘ 자동 검토 통과 시 즉시 RAG에 반영, 실패 시 운영팀 검토 후 적용됩니다.
      </p>
    </form>
  );
}

function StatusBanner({ profile }: { profile: PartnerProfile }) {
  const tone =
    profile.status === "auto-approved" || profile.status === "approved"
      ? "border-emerald-300 bg-emerald-50 text-emerald-900"
      : profile.status === "rejected"
        ? "border-red-300 bg-red-50 text-red-900"
        : "border-amber-300 bg-amber-50 text-amber-900";
  return (
    <div className={`rounded-md border px-3 py-2 text-xs ${tone}`}>
      <p className="font-medium">현재 상태: {labelStatus(profile.status)}</p>
      {profile.suspended ? (
        <p className="mt-0.5">🚫 운영팀이 RAG 사용을 일시 정지했습니다.</p>
      ) : null}
      {profile.rejectReason ? (
        <p className="mt-0.5">거절 사유: {profile.rejectReason}</p>
      ) : null}
      <p className="mt-0.5 text-[11px] opacity-70">
        hygiene {profile.hygieneScore.toFixed(2)} · v{profile.version}
      </p>
    </div>
  );
}

function labelStatus(status: string): string {
  switch (status) {
    case "auto-approved":
      return "✅ 자동 승인 (즉시 적용됨)";
    case "approved":
      return "✅ 운영팀 승인";
    case "pending-review":
      return "⏳ 검토 대기 중";
    case "rejected":
      return "❌ 거절";
    default:
      return status;
  }
}
