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
    <div className="rounded-2xl border border-[#F3F4F6] bg-white p-5 shadow-sm transition-all hover:shadow-md">
      <div className="mb-4 flex items-center justify-between">
        <span className="text-[13px] font-bold text-[#6B7280]">항목 {index + 1}</span>
        <button
          type="button"
          onClick={onRemove}
          aria-label="항목 삭제"
          className="rounded-lg p-2 text-[#9CA3AF] hover:bg-[#FEF2F2] hover:text-[#EF4444] transition-colors"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      <div className="space-y-5">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-[12px] font-semibold text-[#4B5563]">카테고리</label>
            <div className="relative">
              <select
                {...register(`entries.${index}.category`)}
                className="w-full appearance-none rounded-xl border border-[#D1D5DB] bg-white px-4 py-2.5 text-[14px] focus:border-[#2563EB] focus:outline-none focus:ring-4 focus:ring-[#DBEAFE] transition-all"
              >
                {QUOTE_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {QUOTE_CATEGORY_LABELS[c]}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-[12px] font-semibold text-[#4B5563]">단위</label>
            <div className="relative">
              <select
                {...register(`entries.${index}.unit`)}
                className="w-full appearance-none rounded-xl border border-[#D1D5DB] bg-white px-4 py-2.5 text-[14px] focus:border-[#2563EB] focus:outline-none focus:ring-4 focus:ring-[#DBEAFE] transition-all"
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
        </div>

        <div className="space-y-1.5">
          <label className="text-[12px] font-semibold text-[#4B5563]">
            세부 라벨 <span className="font-normal text-[#9CA3AF]">(예: 25평 회당 · 벽걸이 1대)</span>
          </label>
          <input
            type="text"
            {...register(`entries.${index}.unitLabel`)}
            className="w-full rounded-xl border border-[#D1D5DB] bg-white px-4 py-2.5 text-[14px] focus:border-[#2563EB] focus:outline-none focus:ring-4 focus:ring-[#DBEAFE] transition-all"
            placeholder="25평 회당"
          />
          {entryErrors?.unitLabel && (
            <p className="text-[12px] font-medium text-[#EF4444]">{entryErrors.unitLabel.message}</p>
          )}
        </div>

        <div className="space-y-1.5">
          <label className="text-[12px] font-semibold text-[#4B5563]">기준 금액 (원)</label>
          <div className="relative">
            <input
              type="number"
              inputMode="numeric"
              min={0}
              {...register(`entries.${index}.basePrice`, { valueAsNumber: true })}
              className="w-full rounded-xl border border-[#D1D5DB] bg-white px-4 py-2.5 text-[14px] font-bold text-[#111827] focus:border-[#2563EB] focus:outline-none focus:ring-4 focus:ring-[#DBEAFE] transition-all"
              placeholder="200000"
            />
          </div>
          {entryErrors?.basePrice && (
            <p className="text-[12px] font-medium text-[#EF4444]">{entryErrors.basePrice.message}</p>
          )}
        </div>
      </div>
    </div>
  );
}
