"use client";

import type { UseFormRegister, FieldErrors } from "react-hook-form";
import { Trash2 } from "lucide-react";
import {
  QUOTE_CATEGORIES,
  QUOTE_CATEGORY_LABELS,
} from "@/domain/quote-category";
import type { UpsertPriceBookInput } from "@/domain/provider-editor-schema";

const UNIT_LABELS: Record<"per_visit" | "per_month" | "per_unit", string> = {
  per_visit: "회당",
  per_month: "월",
  per_unit: "대당·개당",
};

interface Props {
  index: number;
  register: UseFormRegister<UpsertPriceBookInput>;
  errors?: FieldErrors<UpsertPriceBookInput>;
  onRemove: () => void;
}

export function PriceBookEntryRow({
  index,
  register,
  errors,
  onRemove,
}: Props) {
  const entryErrors = errors?.entries?.[index];

  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
      <div className="mb-3 flex items-start justify-between">
        <span className="text-xs font-medium text-zinc-500">항목 {index + 1}</span>
        <button
          type="button"
          onClick={onRemove}
          aria-label="항목 삭제"
          className="text-zinc-400 hover:text-red-600 dark:hover:text-red-400"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-xs text-zinc-500">카테고리</label>
            <select
              {...register(`entries.${index}.category`)}
              className="w-full rounded-lg border border-zinc-300 bg-white px-2 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950"
            >
              {QUOTE_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {QUOTE_CATEGORY_LABELS[c]}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs text-zinc-500">단위</label>
            <select
              {...register(`entries.${index}.unit`)}
              className="w-full rounded-lg border border-zinc-300 bg-white px-2 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950"
            >
              {(Object.keys(UNIT_LABELS) as Array<keyof typeof UNIT_LABELS>).map(
                (u) => (
                  <option key={u} value={u}>
                    {UNIT_LABELS[u]}
                  </option>
                ),
              )}
            </select>
          </div>
        </div>

        <div>
          <label className="mb-1 block text-xs text-zinc-500">
            세부 라벨 (예: 25평 회당 · 벽걸이 1대)
          </label>
          <input
            type="text"
            {...register(`entries.${index}.unitLabel`)}
            className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950"
            placeholder="25평 회당"
          />
          {entryErrors?.unitLabel && (
            <p className="mt-1 text-xs text-red-600 dark:text-red-400">
              {entryErrors.unitLabel.message}
            </p>
          )}
        </div>

        <div>
          <label className="mb-1 block text-xs text-zinc-500">
            기준 금액 (원)
          </label>
          <input
            type="number"
            inputMode="numeric"
            min={0}
            {...register(`entries.${index}.basePrice`, { valueAsNumber: true })}
            className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950"
            placeholder="200000"
          />
          {entryErrors?.basePrice && (
            <p className="mt-1 text-xs text-red-600 dark:text-red-400">
              {entryErrors.basePrice.message}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
