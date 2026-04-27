"use client";

import { FORM_REGION_OPTIONS } from "@/domain/region-presets";
import type { ProviderRegion } from "@/types/provider";

interface Props {
  value: ProviderRegion[];
  onChange: (regions: ProviderRegion[]) => void;
  error?: string;
}

function isSame(a: ProviderRegion, b: ProviderRegion) {
  return a.city === b.city && a.district === b.district;
}

export function RegionCheckboxGrid({ value, onChange, error }: Props) {
  function addRegion(regionValue: string) {
    if (!regionValue) return;
    const option = FORM_REGION_OPTIONS.find((o) => o.value === regionValue);
    if (!option) return;

    const exists = value.some((v) => isSame(v, option.region));
    if (!exists && value.length < 5) {
      onChange([...value, option.region]);
    }
  }

  function removeRegion(region: ProviderRegion) {
    onChange(value.filter((v) => !isSame(v, region)));
  }

  const availableOptions = FORM_REGION_OPTIONS.filter(
    (o) => !value.some((v) => isSame(v, o.region))
  );

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <p className="text-[13px] font-bold text-zinc-500">
          활동 가능 지역 ({value.length}/5)
        </p>
      </div>

      {value.length < 5 && (
        <div className="relative mb-3">
          <select
            value=""
            onChange={(e) => addRegion(e.target.value)}
            className="w-full appearance-none rounded-[16px] border border-zinc-200 bg-white px-4 py-3.5 pr-10 text-[15px] font-medium text-zinc-700 outline-none transition-colors focus:border-[#2563EB] dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:focus:border-[#5B8DF6]"
          >
            <option value="" disabled>
              + 활동할 지역 추가하기
            </option>
            {availableOptions.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          <div className="pointer-events-none absolute inset-y-0 right-4 flex items-center">
            <svg
              className="h-4 w-4 text-zinc-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2.5}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </div>
        </div>
      )}

      {value.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {value.map((v) => {
            const label =
              FORM_REGION_OPTIONS.find((o) => isSame(o.region, v))?.label ??
              `${v.city} ${v.district}`;
            return (
              <div
                key={`${v.city}|${v.district}`}
                className="flex items-center gap-1.5 rounded-[12px] bg-[#F0F4FF] px-3.5 py-2 text-[14px] font-bold text-[#2563EB] transition-colors dark:bg-[#2563EB]/20 dark:text-[#5B8DF6]"
              >
                <span>{label}</span>
                <button
                  type="button"
                  onClick={() => removeRegion(v)}
                  className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#2563EB]/10 text-[#2563EB] transition-colors hover:bg-[#2563EB]/20 dark:bg-black/20 dark:hover:bg-black/40"
                  aria-label={`${label} 삭제`}
                >
                  <svg
                    className="h-3 w-3"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={3}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>
            );
          })}
        </div>
      )}

      {error && (
        <p className="mt-2 text-xs text-red-600 dark:text-red-400">{error}</p>
      )}
    </div>
  );
}
