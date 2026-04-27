"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, X, Store, ShieldCheck, HelpCircle, Tags, Camera, Sparkles, AlertCircle, Info } from "lucide-react";
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
      setTimeout(() => setResultBanner(null), 5000);
    });
  }

  const charCount = description.length;

  return (
    <form onSubmit={onSubmit} className="space-y-10">
      {initial?.status ? (
        <StatusBanner profile={initial} />
      ) : null}

      {resultBanner ? (
        <div className="flex items-center gap-3 rounded-xl border border-[#DBEAFE] bg-[#EFF6FF] px-4 py-3 text-[14px] text-[#1E40AF] animate-in fade-in slide-in-from-top-2">
          <ShieldCheck className="h-5 w-5 text-[#2563EB]" />
          <div>
            저장 완료 — 상태: <strong>{labelStatus(resultBanner.status)}</strong>{" "}
            (점수: {resultBanner.score.toFixed(1)})
          </div>
        </div>
      ) : null}

      <div className="space-y-8">
        <section className="space-y-4">
          <div className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-[#6B7280]">
            <Store className="h-4 w-4" />
            <span>기본 정보</span>
          </div>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-[13px] font-semibold text-[#374151]">업종 *</label>
              <select
                value={industry}
                onChange={(e) => setIndustry(e.target.value as PartnerIndustry)}
                className="w-full appearance-none rounded-xl border border-[#D1D5DB] bg-white px-4 py-3 text-[15px] focus:border-[#2563EB] focus:outline-none focus:ring-4 focus:ring-[#DBEAFE] transition-all"
              >
                {PARTNER_INDUSTRIES.map((i) => (
                  <option key={i} value={i}>
                    {PARTNER_INDUSTRY_LABELS[i]}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-[13px] font-semibold text-[#374151]">
                매장 소개 * <span className="font-normal text-[#6B7280]">(20-2000자)</span>
              </label>
              <div className="relative">
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value.slice(0, 2000))}
                  rows={8}
                  placeholder="매장의 분위기, 운영 시간, 시그니처 메뉴 등 자세한 소개를 적어주세요."
                  className="w-full rounded-xl border border-[#D1D5DB] bg-white px-4 py-3 text-[15px] leading-relaxed focus:border-[#2563EB] focus:outline-none focus:ring-4 focus:ring-[#DBEAFE] transition-all placeholder:text-[#9CA3AF]"
                />
                <div className={`absolute bottom-3 right-3 text-[11px] font-bold ${charCount < 20 ? "text-[#EF4444]" : "text-[#6B7280]"}`}>
                  {charCount.toLocaleString()} / 2,000
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="space-y-4">
          <div className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-[#6B7280]">
            <Sparkles className="h-4 w-4" />
            <span>강점 및 차별점 (최대 10개)</span>
          </div>
          <div className="space-y-3">
            <div className="flex gap-2">
              <input
                type="text"
                value={uspDraft}
                onChange={(e) => setUspDraft(e.target.value.slice(0, 50))}
                placeholder="예: 수제 메뉴, 유기농 원두"
                className="flex-1 rounded-xl border border-[#D1D5DB] bg-white px-4 py-3 text-[15px] focus:border-[#2563EB] focus:outline-none focus:ring-4 focus:ring-[#DBEAFE] transition-all"
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
                disabled={usps.length >= 10 || !uspDraft.trim()}
                className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#F3F4F6] text-[#374151] hover:bg-[#E5E7EB] disabled:opacity-50 transition-colors"
              >
                <Plus className="h-5 w-5" />
              </button>
            </div>
            {usps.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {usps.map((u, i) => (
                  <span
                    key={`${u}-${i}`}
                    className="inline-flex items-center gap-1.5 rounded-full bg-[#EFF6FF] px-3 py-1.5 text-[13px] font-medium text-[#2563EB]"
                  >
                    {u}
                    <button
                      type="button"
                      onClick={() => setUsps(usps.filter((_, j) => j !== i))}
                      className="rounded-full p-0.5 hover:bg-[#DBEAFE] transition-colors"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>
        </section>

        <section className="space-y-4">
          <div className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-[#6B7280]">
            <Tags className="h-4 w-4" />
            <span>메뉴 및 가격 (최대 30건)</span>
          </div>
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                value={priceDraftName}
                onChange={(e) => setPriceDraftName(e.target.value.slice(0, 50))}
                placeholder="메뉴명"
                className="flex-1 rounded-xl border border-[#D1D5DB] bg-white px-4 py-3 text-[15px] focus:border-[#2563EB] focus:outline-none focus:ring-4 focus:ring-[#DBEAFE] transition-all"
              />
              <div className="flex gap-2">
                <input
                  type="number"
                  value={priceDraftPrice}
                  onChange={(e) => setPriceDraftPrice(e.target.value)}
                  placeholder="가격(원)"
                  className="flex-1 sm:w-32 rounded-xl border border-[#D1D5DB] bg-white px-4 py-3 text-[15px] focus:border-[#2563EB] focus:outline-none focus:ring-4 focus:ring-[#DBEAFE] transition-all"
                />
                <button
                  type="button"
                  onClick={addPriceItem}
                  disabled={priceItems.length >= 30 || !priceDraftName.trim() || !priceDraftPrice}
                  className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#F3F4F6] text-[#374151] hover:bg-[#E5E7EB] disabled:opacity-50 transition-colors"
                >
                  <Plus className="h-5 w-5" />
                </button>
              </div>
            </div>
            {priceItems.length > 0 && (
              <div className="rounded-xl border border-[#F3F4F6] bg-white divide-y divide-[#F3F4F6] overflow-hidden">
                {priceItems.map((item, i) => (
                  <div
                    key={`${item.name}-${i}`}
                    className="flex items-center justify-between px-4 py-3 text-[14px]"
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-[#111827]">{item.name}</span>
                      <span className="text-[#6B7280]">{item.price.toLocaleString()}원</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setPriceItems(priceItems.filter((_, j) => j !== i))}
                      className="text-[#9CA3AF] hover:text-[#EF4444] transition-colors"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        <section className="space-y-4">
          <div className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-[#6B7280]">
            <Camera className="h-4 w-4" />
            <span>매장 사진 (최대 10장)</span>
          </div>
          <div className="rounded-xl border-2 border-dashed border-[#E5E7EB] p-4 bg-[#F9FAFB] hover:bg-white hover:border-[#2563EB] transition-all">
            <PartnerProfilePhotoUpload
              values={photoUrls}
              onChange={setPhotoUrls}
              max={10}
            />
          </div>
        </section>
      </div>

      <div className="pt-8 border-t border-[#F3F4F6] space-y-6">
        {submitError && (
          <div className="flex items-center gap-2 rounded-xl bg-[#FEF2F2] px-4 py-3 text-[14px] font-medium text-[#991B1B] animate-in shake">
            <AlertCircle className="h-4 w-4" />
            <span>{submitError}</span>
          </div>
        )}

        <button
          type="submit"
          disabled={isPending}
          className={`flex w-full items-center justify-center gap-2 rounded-xl bg-[#2563EB] py-4 text-[16px] font-bold text-white shadow-lg shadow-blue-500/20 transition-all hover:bg-[#1D4ED8] hover:shadow-blue-500/30 active:scale-[0.98] disabled:opacity-50 ${
            isPending ? "cursor-wait" : ""
          }`}
        >
          {isPending ? (
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
          ) : (
            <ShieldCheck className="h-5 w-5" />
          )}
          <span>{isPending ? "저장 중..." : "저장 후 검토 신청하기"}</span>
        </button>

        <div className="flex gap-2 rounded-lg bg-[#F9FAFB] p-3 text-[12px] text-[#6B7280]">
          <Info className="h-4 w-4 shrink-0 text-[#2563EB]" />
          <p>
            자동 검토 통과 시 즉시 서비스에 반영됩니다. 
            검토 점수가 낮을 경우 운영팀의 수동 승인이 필요할 수 있습니다.
          </p>
        </div>
      </div>
    </form>
  );
}

function StatusBanner({ profile }: { profile: PartnerProfile }) {
  const isApproved = profile.status === "auto-approved" || profile.status === "approved";
  const isRejected = profile.status === "rejected";
  
  return (
    <div className={`chg-card !p-4 !shadow-none border-l-4 ${
      isApproved ? "border-l-[#10B981] bg-[#F0FDF4]" : 
      isRejected ? "border-l-[#EF4444] bg-[#FEF2F2]" : 
      "border-l-[#F59E0B] bg-[#FFFBEB]"
    }`}>
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-[13px] font-bold text-[#111827]">
            현재 상태: {labelStatus(profile.status)}
          </p>
          {profile.suspended && (
            <p className="text-[12px] font-medium text-[#EF4444]">
              🚫 운영팀에 의해 사용이 일시 정지되었습니다.
            </p>
          )}
          {profile.rejectReason && (
            <p className="text-[12px] text-[#B91C1C]">거절 사유: {profile.rejectReason}</p>
          )}
        </div>
        <div className="text-right">
          <div className="text-[11px] font-bold text-[#6B7280]">v{profile.version}</div>
          <div className="text-[11px] font-bold text-[#6B7280]">SCORE {profile.hygieneScore.toFixed(1)}</div>
        </div>
      </div>
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
