import { QUOTE_CATEGORY_LABELS } from "@/domain/quote-category";
import type { ProviderPriceBookEntry } from "@/types/provider";
import { EmptySection } from "./EmptySection";

interface Props {
  entries: ProviderPriceBookEntry[] | undefined;
}

function formatWon(value: number): string {
  const man = Math.round(value / 10000);
  return `${man}만~`;
}

export function PriceBookList({ entries }: Props) {
  if (!entries || entries.length === 0) {
    return (
      <section className="mt-8">
        <h2 className="mb-3 text-base font-bold">서비스 & 단가</h2>
        <EmptySection icon="💰" title="등록된 단가" />
      </section>
    );
  }

  return (
    <section className="mt-8">
      <h2 className="mb-3 text-base font-bold">서비스 & 단가</h2>
      <ul className="divide-y divide-zinc-100 rounded-2xl border border-zinc-200 bg-white dark:divide-zinc-800 dark:border-zinc-800 dark:bg-zinc-950">
        {entries.map((e, i) => (
          <li
            key={`${e.category}_${i}`}
            className="flex items-start justify-between gap-4 px-4 py-3"
          >
            <div className="min-w-0">
              <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                {QUOTE_CATEGORY_LABELS[e.category]}
              </p>
              <p className="mt-0.5 text-xs text-zinc-500">{e.unitLabel}</p>
            </div>
            <span className="whitespace-nowrap text-base font-bold text-zinc-900 dark:text-zinc-50">
              {formatWon(e.basePrice)}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
