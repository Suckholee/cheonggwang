"use client";

import { useState, useTransition } from "react";
import {
  BRAND_TONES,
  type UpdatePromoSettingsInput,
} from "@/domain/promo-schemas";
import { updatePromoSettings } from "@/app/actions/promo-actions";
import type { Provider } from "@/types/provider";

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
      } else {
        setError(result.message);
      }
    });
  }

  return (
    <section className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950">
      <h3 className="mb-3 text-base font-bold">사전 정보</h3>
      <p className="mb-4 text-xs text-zinc-500">
        AI가 블로그 포스트를 작성할 때 참고하는 정보입니다 (1회 설정).
      </p>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label
            htmlFor="brandTone"
            className="mb-1 block text-xs font-medium text-zinc-700 dark:text-zinc-300"
          >
            브랜드 톤
          </label>
          <select
            id="brandTone"
            value={brandTone}
            onChange={(e) =>
              setBrandTone(e.target.value as typeof brandTone)
            }
            className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950"
          >
            {BRAND_TONES.map((t) => (
              <option key={t} value={t}>
                {TONE_LABELS[t]}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label
            htmlFor="slogan"
            className="mb-1 block text-xs font-medium text-zinc-700 dark:text-zinc-300"
          >
            슬로건 <span className="text-zinc-500">(40자)</span>
          </label>
          <input
            id="slogan"
            type="text"
            value={slogan}
            maxLength={40}
            onChange={(e) => setSlogan(e.target.value)}
            placeholder="예: 강남에서 4년간 믿고 맡기는 청소"
            className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950"
          />
          <p className="mt-1 text-right text-[11px] text-zinc-400">
            {slogan.length} / 40
          </p>
        </div>
        {error && (
          <p className="rounded bg-red-50 px-3 py-2 text-xs text-red-700 dark:bg-red-950/50 dark:text-red-300">
            {error}
          </p>
        )}
        {ok && (
          <p className="rounded bg-emerald-50 px-3 py-2 text-xs text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300">
            저장되었습니다
          </p>
        )}
        <button
          type="submit"
          disabled={isPending || slogan.trim().length === 0}
          className="w-full rounded-xl bg-indigo-600 px-4 py-3 text-sm font-bold text-white hover:bg-indigo-700 disabled:opacity-50"
        >
          {isPending ? "저장 중..." : "사전 정보 저장"}
        </button>
      </form>
    </section>
  );
}
