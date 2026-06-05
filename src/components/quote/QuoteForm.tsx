"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  quoteRequestInputSchema,
  type QuoteRequestInput,
} from "@/domain/quote-schemas";
import {
  QUOTE_CATEGORIES,
  QUOTE_CATEGORY_LABELS,
  QUOTE_CATEGORY_SUBTITLES,
  type QuoteCategory,
} from "@/domain/quote-category";
import { FORM_REGION_OPTIONS } from "@/domain/region-presets";
import { PhotoUpload } from "@/components/editor/PhotoUpload";
import { submitQuoteRequest } from "@/app/actions/quote-actions";
import type { Photo } from "@/types/page";
import {
  Home,
  Building2,
  Wind,
  Truck,
  Sparkles,
  CalendarDays,
  type LucideIcon,
  ChevronDown,
} from "lucide-react";

interface Props {
  requestId: string;
  initialCategory?: QuoteCategory;
  /** v1.1b #2 provider-profile · "견적 요청하기" 경로에서 우선 청명 지정 */
  preferredProviderId?: string;
}

const CATEGORY_STYLE: Record<
  QuoteCategory,
  { Icon: LucideIcon; bg: string; text: string }
> = {
  "move-in": {
    Icon: Home,
    bg: "bg-blue-50/70 dark:bg-blue-950/40",
    text: "text-blue-600 dark:text-blue-400",
  },
  office: {
    Icon: Building2,
    bg: "bg-emerald-50/70 dark:bg-emerald-950/40",
    text: "text-emerald-600 dark:text-emerald-400",
  },
  aircon: {
    Icon: Wind,
    bg: "bg-sky-50/70 dark:bg-sky-950/40",
    text: "text-sky-600 dark:text-sky-400",
  },
  "move-out": {
    Icon: Truck,
    bg: "bg-violet-50/70 dark:bg-violet-950/40",
    text: "text-violet-600 dark:text-violet-400",
  },
  special: {
    Icon: Sparkles,
    bg: "bg-rose-50/70 dark:bg-rose-950/40",
    text: "text-rose-600 dark:text-rose-400",
  },
  regular: {
    Icon: CalendarDays,
    bg: "bg-amber-50/70 dark:bg-amber-950/40",
    text: "text-amber-600 dark:text-amber-400",
  },
};

export function QuoteForm({
  requestId,
  initialCategory,
  preferredProviderId,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [submitError, setSubmitError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    formState: { errors },
  } = useForm<QuoteRequestInput>({
    resolver: zodResolver(quoteRequestInputSchema),
    defaultValues: {
      requestId,
      category: initialCategory ?? "move-in",
      region: FORM_REGION_OPTIONS[0].region,
      size: null,
      preferredDate: null,
      contactPhone: "",
      photos: [],
      note: null,
      preferredProviderId,
    },
  });

  const category = watch("category");
  const photos = watch("photos");
  const noteValue = watch("note") ?? "";

  function onRegionChange(value: string) {
    const option = FORM_REGION_OPTIONS.find((o) => o.value === value);
    if (option) setValue("region", option.region, { shouldValidate: true });
  }

  function onSubmit(data: QuoteRequestInput) {
    setSubmitError(null);
    startTransition(async () => {
      const result = await submitQuoteRequest(data);
      if (result.ok) {
        router.push(`/quote/thanks?id=${result.data.requestId}`);
      } else {
        setSubmitError(result.message);
      }
    });
  }

  const selectedRegionValue =
    FORM_REGION_OPTIONS.find(
      (o) =>
        o.region.city === watch("region").city &&
        o.region.district === watch("region").district,
    )?.value ?? FORM_REGION_OPTIONS[0].value;

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
      {/* 카테고리 */}
      <Field label="카테고리" hint="6종 중 1개 선택" error={errors.category?.message}>
        <div className="grid grid-cols-3 gap-2">
          {QUOTE_CATEGORIES.map((c) => {
            const selected = c === category;
            const style = CATEGORY_STYLE[c];
            const Icon = style.Icon;
            return (
              <button
                key={c}
                type="button"
                onClick={() =>
                  setValue("category", c, { shouldValidate: true })
                }
                className={`flex flex-col items-center justify-center gap-1 rounded-2xl px-2 py-4.5 text-xs transition-all duration-200 focus:outline-none ${
                  selected
                    ? "bg-[#f4f9ff] text-zinc-950 border-[#2563EB] border-b-4 border-b-[#2563EB] shadow-[0_6px_16px_rgba(37,99,235,0.12)] scale-[1.02] dark:bg-blue-950/20 dark:border-[#3B82F6] dark:text-zinc-50"
                    : "bg-white text-zinc-700 border border-zinc-200 border-b-4 border-b-zinc-300 hover:border-zinc-300 hover:scale-[1.02] active:scale-[0.96] active:translate-y-[2px] shadow-xs dark:bg-zinc-900 dark:text-zinc-300 dark:border-zinc-800 dark:border-b-zinc-950"
                }`}
              >
                <div
                  className={`flex h-11 w-11 items-center justify-center rounded-xl transition-colors ${
                    selected ? style.bg : "bg-zinc-100 dark:bg-zinc-850"
                  } ${style.text}`}
                >
                  <Icon className="h-5 w-5" strokeWidth={2.5} />
                </div>
                <span className="font-extrabold mt-1 tracking-tight">{QUOTE_CATEGORY_LABELS[c]}</span>
                <span className="text-[9.5px] font-bold text-zinc-400 dark:text-zinc-500 leading-none">
                  {QUOTE_CATEGORY_SUBTITLES[c]}
                </span>
              </button>
            );
          })}
        </div>
      </Field>

      {/* 지역 */}
      <Field label="지역" error={errors.region?.city?.message}>
        <div className="relative">
          <select
            value={selectedRegionValue}
            onChange={(e) => onRegionChange(e.target.value)}
            className="w-full appearance-none rounded-[16px] border border-zinc-200 bg-white px-4 py-3 text-[14px] font-bold text-zinc-800 outline-none transition-all focus:border-[#2563EB] focus:ring-4 focus:ring-blue-100 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200 dark:focus:ring-blue-950/20"
          >
            {FORM_REGION_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          <div className="pointer-events-none absolute inset-y-0 right-4 flex items-center">
            <ChevronDown className="h-4.5 w-4.5 text-zinc-500" strokeWidth={2.5} />
          </div>
        </div>
      </Field>

      {/* 평수 */}
      <Field label="평수 (선택)" hint="정수만 입력" error={errors.size?.message}>
        <Controller
          control={control}
          name="size"
          render={({ field }) => (
            <input
              type="number"
              inputMode="numeric"
              min={1}
              max={500}
              placeholder="예: 24"
              value={field.value ?? ""}
              onChange={(e) => {
                const v = e.target.value;
                field.onChange(v === "" ? null : Number(v));
              }}
              className="w-full rounded-[16px] border border-zinc-200 bg-white px-4 py-3 text-[14px] font-bold text-zinc-800 outline-none transition-all placeholder-zinc-350 focus:border-[#2563EB] focus:ring-4 focus:ring-blue-100 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200 dark:focus:ring-blue-950/20"
            />
          )}
        />
      </Field>

      {/* 희망일 */}
      <Field label="희망일 (선택)" error={errors.preferredDate?.message}>
        <Controller
          control={control}
          name="preferredDate"
          render={({ field }) => (
            <input
              type="date"
              value={field.value ? field.value.slice(0, 10) : ""}
              onChange={(e) => {
                const v = e.target.value;
                field.onChange(v ? new Date(v).toISOString() : null);
              }}
              className="w-full rounded-[16px] border border-zinc-200 bg-white px-4 py-3 text-[14px] font-bold text-zinc-800 outline-none transition-all focus:border-[#2563EB] focus:ring-4 focus:ring-blue-100 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200 dark:focus:ring-blue-950/20"
            />
          )}
        />
      </Field>

      {/* 연락처 */}
      <Field
        label="연락처"
        hint="010-1234-5678 형식"
        error={errors.contactPhone?.message}
      >
        <input
          {...register("contactPhone")}
          type="tel"
          placeholder="010-1234-5678"
          className="w-full rounded-[16px] border border-zinc-200 bg-white px-4 py-3 text-[14px] font-bold text-zinc-800 outline-none transition-all placeholder-zinc-350 focus:border-[#2563EB] focus:ring-4 focus:ring-blue-100 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200 dark:focus:ring-blue-950/20"
        />
      </Field>

      {/* 사진 */}
      <Field label="사진" hint="최대 3장, 대표 이미지 포함">
        <PhotoUpload
          pageId={requestId}
          pathPrefix="quote-photos"
          photos={photos}
          onChange={(next: Photo[]) =>
            setValue("photos", next, { shouldValidate: true })
          }
        />
        <p className="text-[11px] font-medium text-zinc-400 dark:text-zinc-500 mt-2.5 leading-normal">
          JPEG/PNG/WebP, 파일당 최대 5MB. 첫 번째 사진이 견적 상세 대표 사진으로 사용됩니다.
        </p>
      </Field>

      {/* 특이사항 */}
      <Field
        label="특이사항 (선택)"
        hint={`${noteValue.length} / 500`}
        error={errors.note?.message}
      >
        <Controller
          control={control}
          name="note"
          render={({ field }) => (
            <textarea
              rows={4}
              maxLength={500}
              value={field.value ?? ""}
              onChange={(e) => field.onChange(e.target.value || null)}
              placeholder="반려동물 여부, 주차 가능 정보, 문 비밀번호나 상세 요청 사항을 적어주시면 상세한 맞춤 견적을 받아보실 수 있습니다."
              className="w-full resize-none rounded-[16px] border border-zinc-200 bg-white px-4 py-3 text-[14px] font-bold text-zinc-800 outline-none transition-all placeholder-zinc-350 focus:border-[#2563EB] focus:ring-4 focus:ring-blue-100 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200 dark:focus:ring-blue-950/20"
            />
          )}
        />
      </Field>

      {submitError && (
        <p className="rounded-2xl bg-red-50 border border-red-100 px-4 py-3 text-sm font-semibold text-red-700 dark:bg-red-950/30 dark:border-red-900/50 dark:text-red-300">
          ⚠️ {submitError}
        </p>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="w-full flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-b from-[#3B82F6] to-[#2563EB] text-white px-4 py-4 text-sm font-extrabold border-b-4 border-[#1D4ED8] shadow-[0_8px_20px_rgba(37,99,235,0.25)] hover:from-[#4F8FF7] hover:to-[#2A6DF0] active:scale-[0.98] active:translate-y-[2px] disabled:opacity-50 transition-all cursor-pointer dark:border-[#1E40AF]"
      >
        {isPending ? "제출 중..." : "견적 요청 제출"}
      </button>
    </form>
  );
}

function Field({
  label,
  hint,
  error,
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2 rounded-[24px] border border-zinc-200/50 bg-white p-4.5 shadow-[0_8px_20px_rgba(15,23,42,0.02)] dark:border-zinc-850 dark:bg-zinc-950">
      <span className="flex items-baseline justify-between">
        <span className="text-[14px] font-extrabold text-zinc-900 dark:text-zinc-50">
          {label}
        </span>
        {hint && (
          <span className="text-[11px] font-bold text-zinc-400 dark:text-zinc-500">
            {hint}
          </span>
        )}
      </span>
      <div className="mt-1">{children}</div>
      {error && (
        <span className="text-xs font-semibold text-red-600 dark:text-red-400 mt-1 flex items-center gap-1">
          ⚠️ {error}
        </span>
      )}
    </div>
  );
}
