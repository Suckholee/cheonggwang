import { Star, Shield } from "lucide-react";
import type { Provider } from "@/types/provider";

interface Props {
  provider: Provider;
}

function formatInsuranceAmount(amount: number | null | undefined): string | null {
  if (!amount || amount <= 0) return null;
  const eok = Math.floor(amount / 100_000_000);
  if (eok >= 1) return `${eok}억`;
  const man = Math.floor(amount / 10_000);
  return `${man}만`;
}

export function ProviderMeta({ provider }: Props) {
  const insuranceLabel = formatInsuranceAmount(provider.insuranceAmount);
  const regionLabel =
    provider.regions.length > 0
      ? provider.regions
          .slice(0, 2)
          .map((r) => r.district)
          .join("·")
      : "전국";
  const yearsLabel = provider.yearsOfExperience
    ? `경력 ${provider.yearsOfExperience}년`
    : null;

  return (
    <section className="mt-6 flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
          {provider.companyName}
        </h1>
        {provider.insured && insuranceLabel && (
          <span className="flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400">
            <Shield className="h-3 w-3" aria-hidden />
            배상보험 {insuranceLabel}
          </span>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-1.5 text-sm text-zinc-600 dark:text-zinc-400">
        {provider.rating !== null && provider.rating !== undefined && (
          <>
            <Star
              className="h-4 w-4 fill-amber-400 text-amber-400"
              aria-hidden
            />
            <span className="font-semibold text-zinc-900 dark:text-zinc-50">
              {provider.rating}
            </span>
            {provider.reviewCount ? (
              <span className="text-zinc-500">({provider.reviewCount})</span>
            ) : null}
            <span className="text-zinc-400">·</span>
          </>
        )}
        <span>{regionLabel}</span>
        {yearsLabel && (
          <>
            <span className="text-zinc-400">·</span>
            <span>{yearsLabel}</span>
          </>
        )}
      </div>
    </section>
  );
}
