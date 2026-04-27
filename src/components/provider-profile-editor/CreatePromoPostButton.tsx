"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, AlertCircle, Calendar } from "lucide-react";
import { createPromoPost } from "@/app/actions/promo-actions";
import { formatScheduledLabel } from "@/domain/booking-day-bucket";
import { PROVIDERS_SUBCATEGORIES } from "@/lib/feed/panel-config";
import type { ProviderStoryCategory } from "@/types/post";
import type { Provider } from "@/types/provider";

interface Props {
  provider: Provider;
}

const COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000;

export function CreatePromoPostButton({ provider }: Props) {
  const router = useRouter();
  const [topicHint, setTopicHint] = useState("");
  const [storyCategory, setStoryCategory] =
    useState<ProviderStoryCategory>("field");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const settingsReady = !!(provider.brandTone && provider.slogan);
  const cooldownMs = provider.lastPromoPostAt
    ? Math.max(
        0,
        provider.lastPromoPostAt.getTime() + COOLDOWN_MS - Date.now(),
      )
    : 0;
  const inCooldown = cooldownMs > 0;
  const nextAllowedLabel = inCooldown
    ? formatScheduledLabel(provider.lastPromoPostAt!.getTime() + COOLDOWN_MS)
    : null;

  const disabled = !settingsReady || inCooldown || isPending;

  function handleClick() {
    if (disabled) return;
    setError(null);
    const trimmed = topicHint.trim();
    startTransition(async () => {
      const result = await createPromoPost({
        topicHint: trimmed || null,
        storyCategory,
      });
      if (result.ok) {
        router.push(`/community/p/${result.data.slug}`);
      } else {
        setError(result.message);
      }
    });
  }

  return (
    <section className="rounded-2xl border border-[#F3F4F6] bg-white p-6 shadow-sm">
      <div className="mb-6 flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-[#6B7280]">
        <Sparkles className="h-4 w-4 text-[#2563EB]" />
        <span>새 홍보 포스트 만들기</span>
      </div>

      {!settingsReady && (
        <div className="mb-6 flex items-center gap-2 rounded-xl bg-[#FFFBEB] px-4 py-3 text-[13px] font-medium text-[#92400E]">
          <AlertCircle className="h-4 w-4" />
          <span>먼저 위 사전 정보를 저장해 주세요.</span>
        </div>
      )}

      <div className="space-y-6">
        <div className="space-y-3">
          <label className="text-[12px] font-semibold text-[#4B5563]">카테고리 선택</label>
          <div
            role="radiogroup"
            aria-label="스토리 카테고리 선택"
            className="flex flex-wrap gap-2"
          >
            {PROVIDERS_SUBCATEGORIES.map((sub) => {
              const active = storyCategory === sub.slug;
              return (
                <button
                  key={sub.slug}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => setStoryCategory(sub.slug)}
                  title={sub.description}
                  className={`inline-flex items-center gap-1.5 rounded-full border-2 px-4 py-1.5 text-[13px] font-bold transition-all ${
                    active
                      ? "border-[#2563EB] bg-[#EFF6FF] text-[#2563EB]"
                      : "border-[#F3F4F6] bg-[#F9FAFB] text-[#6B7280] hover:border-[#D1D5DB]"
                  }`}
                >
                  <span aria-hidden>{sub.emoji}</span>
                  {sub.label}
                </button>
              );
            })}
          </div>
          <p className="text-[11px] font-medium text-[#9CA3AF]">
            {PROVIDERS_SUBCATEGORIES.find((s) => s.slug === storyCategory)?.description}
          </p>
        </div>

        <div className="space-y-1.5">
          <label htmlFor="topicHint" className="text-[12px] font-semibold text-[#4B5563]">
            오늘의 주제 힌트 <span className="font-normal text-[#9CA3AF]">(선택 · 최대 60자)</span>
          </label>
          <div className="relative">
            <input
              id="topicHint"
              type="text"
              value={topicHint}
              maxLength={60}
              onChange={(e) => setTopicHint(e.target.value)}
              placeholder="예: 어제 다녀온 현장 · 욕실 물때 관리 팁"
              className="w-full rounded-xl border border-[#D1D5DB] bg-white px-4 py-2.5 text-[14px] focus:border-[#2563EB] focus:outline-none focus:ring-4 focus:ring-[#DBEAFE] transition-all"
            />
          </div>
        </div>

        {inCooldown && nextAllowedLabel && (
          <div className="flex items-center gap-2 rounded-xl bg-[#F9FAFB] px-4 py-3 text-[12px] font-bold text-[#6B7280]">
            <Calendar className="h-4 w-4 text-[#2563EB]" />
            <span>다음 포스트 생성 가능 일시: {nextAllowedLabel}</span>
          </div>
        )}

        {error && (
          <div className="flex items-center gap-2 rounded-xl bg-[#FEF2F2] px-4 py-3 text-[13px] font-medium text-[#991B1B]">
            <AlertCircle className="h-4 w-4" />
            <span>{error}</span>
          </div>
        )}

        <button
          type="button"
          onClick={handleClick}
          disabled={disabled}
          className={`flex w-full items-center justify-center gap-2 rounded-xl bg-[#2563EB] py-4 text-[16px] font-bold text-white shadow-lg shadow-blue-500/20 transition-all hover:bg-[#1D4ED8] hover:shadow-blue-500/30 active:scale-[0.98] disabled:opacity-50 ${
            isPending ? "cursor-wait" : ""
          }`}
        >
          {isPending ? (
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
          ) : (
            <Sparkles className="h-5 w-5" />
          )}
          <span>
            {isPending
              ? "AI가 작성 중... (약 20초)"
              : inCooldown
              ? "현재 쿨다운 중입니다"
              : "AI 홍보 포스트 생성하기"}
          </span>
        </button>
      </div>
    </section>
  );
}
