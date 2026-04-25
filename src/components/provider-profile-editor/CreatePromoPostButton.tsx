"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Sparkles } from "lucide-react";
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
    <section className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950">
      <h3 className="mb-3 flex items-center gap-2 text-base font-bold">
        <Sparkles className="h-4 w-4 text-indigo-600 dark:text-indigo-400" aria-hidden />
        새 홍보 포스트 만들기
      </h3>
      {!settingsReady && (
        <p className="mb-3 rounded bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:bg-amber-950/30 dark:text-amber-300">
          먼저 위 사전 정보를 저장해 주세요.
        </p>
      )}
      <div className="space-y-3">
        <div>
          <span className="mb-1 block text-xs font-medium text-zinc-700 dark:text-zinc-300">
            카테고리
          </span>
          <div
            role="radiogroup"
            aria-label="스토리 카테고리 선택"
            className="flex flex-wrap gap-1.5"
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
                  className={[
                    "inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors",
                    active
                      ? "border-indigo-500 bg-indigo-50 text-indigo-700 dark:border-indigo-400 dark:bg-indigo-950/40 dark:text-indigo-200"
                      : "border-zinc-200 text-zinc-600 hover:border-indigo-300 dark:border-zinc-800 dark:text-zinc-400",
                  ].join(" ")}
                >
                  <span aria-hidden>{sub.emoji}</span>
                  {sub.label}
                </button>
              );
            })}
          </div>
          <p className="mt-1 text-[11px] text-zinc-500">
            {
              PROVIDERS_SUBCATEGORIES.find((s) => s.slug === storyCategory)
                ?.description
            }
          </p>
        </div>
        <div>
          <label
            htmlFor="topicHint"
            className="mb-1 block text-xs font-medium text-zinc-700 dark:text-zinc-300"
          >
            주제 힌트 <span className="text-zinc-500">(선택 · 60자)</span>
          </label>
          <input
            id="topicHint"
            type="text"
            value={topicHint}
            maxLength={60}
            onChange={(e) => setTopicHint(e.target.value)}
            placeholder="예: 어제 다녀온 현장 · 욕실 물때 팁"
            className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950"
          />
        </div>
        {inCooldown && nextAllowedLabel && (
          <p className="rounded bg-zinc-50 px-3 py-2 text-[11px] text-zinc-600 dark:bg-zinc-900 dark:text-zinc-400">
            💡 다음 생성 가능: {nextAllowedLabel}
          </p>
        )}
        {error && (
          <p className="rounded bg-red-50 px-3 py-2 text-xs text-red-700 dark:bg-red-950/50 dark:text-red-300">
            {error}
          </p>
        )}
        <button
          type="button"
          onClick={handleClick}
          disabled={disabled}
          className="w-full rounded-xl bg-indigo-600 px-4 py-3 text-sm font-bold text-white hover:bg-indigo-700 disabled:opacity-50"
        >
          {isPending
            ? "AI가 작성 중... (10-30초)"
            : inCooldown
              ? "쿨다운 중"
              : "📝 포스트 생성 (주 1회)"}
        </button>
      </div>
    </section>
  );
}
