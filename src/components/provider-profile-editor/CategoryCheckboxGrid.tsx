"use client";

import {
  QUOTE_CATEGORIES,
  QUOTE_CATEGORY_EMOJIS,
  QUOTE_CATEGORY_LABELS,
  type QuoteCategory,
} from "@/domain/quote-category";

interface Props {
  value: QuoteCategory[];
  onChange: (categories: QuoteCategory[]) => void;
  error?: string;
}

export function CategoryCheckboxGrid({ value, onChange, error }: Props) {
  function toggle(category: QuoteCategory) {
    const exists = value.includes(category);
    if (exists) {
      onChange(value.filter((v) => v !== category));
    } else {
      if (value.length >= 6) return;
      onChange([...value, category]);
    }
  }

  return (
    <div>
      <p className="mb-2 text-xs text-zinc-500">
        1~6개 선택 ({value.length}/6)
      </p>
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
        {QUOTE_CATEGORIES.map((category) => {
          const checked = value.includes(category);
          return (
            <label
              key={category}
              className={`flex cursor-pointer items-center gap-2.5 rounded-[12px] border px-4 py-3.5 text-[15px] font-medium transition-all ${
                checked
                  ? "border-[#2563EB] bg-[#F0F4FF] text-[#2563EB] dark:border-[#5B8DF6] dark:bg-[#2563EB]/20 dark:text-[#5B8DF6]"
                  : "border-zinc-200 bg-white text-zinc-700 hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-300"
              }`}
            >
              <input
                type="checkbox"
                checked={checked}
                onChange={() => toggle(category)}
                className="hidden"
              />
              <div
                className={`flex h-[18px] w-[18px] items-center justify-center rounded-[4px] border ${
                  checked
                    ? "border-[#2563EB] bg-[#2563EB] dark:border-[#5B8DF6] dark:bg-[#5B8DF6]"
                    : "border-zinc-300 bg-white dark:border-zinc-700 dark:bg-zinc-900"
                }`}
              >
                {checked && (
                  <svg className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </div>
              <span className="truncate">
                {QUOTE_CATEGORY_EMOJIS[category]}{" "}
                {QUOTE_CATEGORY_LABELS[category]}
              </span>
            </label>
          );
        })}
      </div>
      {error && (
        <p className="mt-2 text-xs text-red-600 dark:text-red-400">{error}</p>
      )}
    </div>
  );
}
