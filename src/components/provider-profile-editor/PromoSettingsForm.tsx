"use client";

import { useState, useTransition } from "react";
import {
  BRAND_TONES,
  type UpdatePromoSettingsInput,
} from "@/domain/promo-schemas";
import { updatePromoSettings } from "@/app/actions/promo-actions";
import type { Provider } from "@/types/provider";
import { Settings2, Info, AlertCircle, CheckCircle2, Save } from "lucide-react";

interface Props {
  provider: Provider;
}

const TONE_LABELS: Record<(typeof BRAND_TONES)[number], string> = {
  friendly: "친근한 말투",
  professional: "전문가 톤",
  playful: "유쾌한 톤",
};

export function PromoSettingsForm({ provider }: Props) {
  const [brandTone, setBrandTone] = useState<UpdatePromoSettingsInput["brandTone"]>(
    (provider.brandTone as UpdatePromoSettingsInput["brandTone"]) ?? "friendly",
  );
  const [slogan, setSlogan] = useState(provider.slogan ?? "");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState(false);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setOk(false);
    startTransition(async () => {
      const result = await updatePromoSettings({ brandTone, slogan });
      if (result.ok) {
        setOk(true);
        setTimeout(() => setOk(false), 3000);
      } else {
        setError(result.message);
      }
    });
  }

  return (
    <section className="rounded-2xl border border-[#F3F4F6] bg-white p-6 shadow-sm">
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-[#6B7280]">
          <Settings2 className="h-4 w-4" />
          <span>홍보 엔진 설정</span>
        </div>
      </div>

      <div className="mb-6 flex gap-2 rounded-lg bg-[#F9FAFB] p-3 text-[12px] text-[#6B7280]">
        <Info className="h-4 w-4 shrink-0 text-[#2563EB]" />
        <p>
          AI가 서비스 홍보 포스트를 작성할 때 가장 중요하게 참고하는 정보입니다.
          브랜드의 색깔이 드러나도록 설정해 주세요.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-1.5">
          <label htmlFor="brandTone" className="text-[12px] font-semibold text-[#4B5563]">
            브랜드 톤
          </label>
          <div className="relative">
            <select
              id="brandTone"
              value={brandTone}
              onChange={(e) => setBrandTone(e.target.value as typeof brandTone)}
              className="w-full appearance-none rounded-xl border border-[#D1D5DB] bg-white px-4 py-2.5 text-[14px] focus:border-[#2563EB] focus:outline-none focus:ring-4 focus:ring-[#DBEAFE] transition-all"
            >
              {BRAND_TONES.map((t) => (
                <option key={t} value={t}>
                  {TONE_LABELS[t]}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="space-y-1.5">
          <label htmlFor="slogan" className="text-[12px] font-semibold text-[#4B5563]">
            한 줄 슬로건 <span className="font-normal text-[#9CA3AF]">(최대 40자)</span>
          </label>
          <div className="relative">
            <input
              id="slogan"
              type="text"
              value={slogan}
              maxLength={40}
              onChange={(e) => setSlogan(e.target.value)}
              placeholder="예: 강남에서 4년간 믿고 맡기는 청소"
              className="w-full rounded-xl border border-[#D1D5DB] bg-white px-4 py-2.5 text-[14px] focus:border-[#2563EB] focus:outline-none focus:ring-4 focus:ring-[#DBEAFE] transition-all"
            />
            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] font-bold text-[#9CA3AF]">
              {slogan.length}/40
            </div>
          </div>
        </div>

        <div className="space-y-4">
          {error && (
            <div className="flex items-center gap-2 rounded-xl bg-[#FEF2F2] px-4 py-3 text-[13px] font-medium text-[#991B1B]">
              <AlertCircle className="h-4 w-4" />
              <span>{error}</span>
            </div>
          )}
          {ok && (
            <div className="flex items-center gap-2 rounded-xl bg-[#ECFDF5] px-4 py-3 text-[13px] font-medium text-[#065F46]">
              <CheckCircle2 className="h-4 w-4" />
              <span>설정이 저장되었습니다.</span>
            </div>
          )}

          <button
            type="submit"
            disabled={isPending || slogan.trim().length === 0}
            className={`flex w-full items-center justify-center gap-2 rounded-xl bg-[#111827] py-4 text-[15px] font-bold text-white transition-all hover:bg-black active:scale-[0.98] disabled:opacity-50 ${
              isPending ? "cursor-wait" : ""
            }`}
          >
            {isPending ? (
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
            ) : (
              <Save className="h-5 w-5" />
            )}
            <span>{isPending ? "저장 중..." : "설정 저장하기"}</span>
          </button>
        </div>
      </form>
    </section>
  );
}
