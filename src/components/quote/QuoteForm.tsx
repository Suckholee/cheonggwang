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
  Check,
  Search,
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
  const photos = watch("photos") ?? [];
  const noteValue = watch("note") ?? "";
  const region = watch("region");
  const size = watch("size");
  const preferredDate = watch("preferredDate");
  const contactPhone = watch("contactPhone") ?? "";

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
        o.region.city === region?.city &&
        o.region.district === region?.district,
    )?.value ?? FORM_REGION_OPTIONS[0].value;

  // Count completed fields
  const completedCount = [
    !!category,
    !!region?.city,
    size !== null && size !== undefined && size > 0,
    !!preferredDate,
    !!contactPhone && contactPhone.length >= 10,
    photos.length > 0,
    !!noteValue && noteValue.length > 0,
  ].filter(Boolean).length;
  
  const completionPercentage = Math.round((completedCount / 7) * 100);

  const isPhoneValid = /^[0-9]{2,4}-?[0-9]{3,4}-?[0-9]{4}$/.test(contactPhone);
  const isValidForm = !!category && !!region?.city && isPhoneValid;

  const SIZE_CHIPS = [
    { label: "10평 이하", value: 9 },
    { label: "10~20평", value: 15 },
    { label: "20~30평", value: 25 },
    { label: "30평 이상", value: 35 },
  ];

  const getSelectedChipValue = (val: number | null) => {
    if (val === null) return null;
    if (val <= 10) return 9;
    if (val > 10 && val <= 20) return 15;
    if (val > 20 && val <= 30) return 25;
    return 35;
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
      {/* CSS Animation Keyframes Inject */}
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes scaleIn {
          from { transform: scale(0.6); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
        @keyframes orbit {
          from { transform: rotate(0deg) translateX(56px) rotate(0deg); }
          to { transform: rotate(360deg) translateX(56px) rotate(-360deg); }
        }
      `}} />

      {/* Progress Steps Indicator */}
      <div className="rounded-[20px] border border-zinc-200/50 bg-white p-4.5 shadow-[0_6px_16px_rgba(15,23,42,0.01)] dark:border-zinc-850 dark:bg-zinc-950 flex flex-col gap-2">
        <div className="flex items-center justify-between text-xs font-bold">
          <span className="text-zinc-500 dark:text-zinc-400">견적 요청 진행률</span>
          <span className="text-[#2563EB] dark:text-[#3B82F6]">{completedCount} / 7개 완료</span>
        </div>
        <div className="h-2 w-full bg-zinc-100 rounded-full overflow-hidden dark:bg-zinc-900">
          <div 
            className="h-full bg-gradient-to-r from-[#3B82F6] to-[#2563EB] transition-all duration-300 rounded-full"
            style={{ width: `${completionPercentage}%` }}
          />
        </div>
      </div>

      {/* 카테고리 */}
      <Field 
        label="카테고리" 
        hint="6종 중 1개 선택" 
        error={errors.category?.message}
        completed={!!category}
      >
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
                className={`relative flex flex-col items-center justify-center gap-1 rounded-2xl px-2 py-4 text-xs transition-all duration-205 focus:outline-none border ${
                  selected
                    ? "bg-[#EFF6FF] text-zinc-950 border-[#2563EB] shadow-[0_6px_16px_rgba(37,99,235,0.08)] scale-[1.02] dark:bg-blue-950/20 dark:border-[#3B82F6] dark:text-zinc-50"
                    : "bg-white text-zinc-600 border-zinc-200 hover:border-zinc-300 hover:scale-[1.01] active:scale-[0.97] shadow-sm dark:bg-zinc-900 dark:text-zinc-400 dark:border-zinc-800"
                }`}
              >
                {/* Active Check Indicator */}
                {selected && (
                  <span className="absolute top-2 right-2 flex h-4.5 w-4.5 items-center justify-center rounded-full bg-[#2563EB] text-white animate-[scaleIn_0.15s_ease-out] dark:bg-[#3B82F6] shadow-sm z-10">
                    <Check className="h-2.5 w-2.5 stroke-[3.5]" />
                  </span>
                )}
                
                <div
                  className={`flex h-11 w-11 items-center justify-center rounded-xl transition-colors ${
                    selected ? style.bg : "bg-zinc-100 dark:bg-zinc-850"
                  } ${style.text}`}
                >
                  <Icon className="h-5 w-5" strokeWidth={2.2} />
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
      <Field 
        label="지역" 
        error={errors.region?.city?.message}
        completed={!!region?.city}
      >
        <div className="relative group">
          <select
            value={selectedRegionValue}
            onChange={(e) => onRegionChange(e.target.value)}
            className="w-full appearance-none rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-[14px] font-bold text-zinc-800 outline-none transition-all focus:border-[#2563EB] focus:ring-1 focus:ring-blue-100/50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200"
          >
            {FORM_REGION_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          <div className="pointer-events-none absolute inset-y-0 right-4 flex items-center transition-transform duration-250 group-focus-within:rotate-180">
            <ChevronDown className="h-4.5 w-4.5 text-zinc-500" strokeWidth={2.2} />
          </div>
        </div>
      </Field>

      {/* 평수 */}
      <Field 
        label="평수 (선택)" 
        hint="정수만 입력" 
        error={errors.size?.message}
        completed={size !== null && size !== undefined && size > 0}
      >
        <Controller
          control={control}
          name="size"
          render={({ field }) => (
            <div>
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
                className="w-full rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-[14px] font-bold text-zinc-800 outline-none transition-all placeholder-zinc-350 focus:border-[#2563EB] focus:ring-1 focus:ring-blue-100/50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200"
              />
              
              {/* Quick Size Select Chips */}
              <div className="mt-2.5 flex flex-wrap gap-2">
                {SIZE_CHIPS.map((chip) => {
                  const isSelected = getSelectedChipValue(field.value) === chip.value;
                  return (
                    <button
                      key={chip.value}
                      type="button"
                      onClick={() => setValue("size", chip.value, { shouldValidate: true })}
                      className={`rounded-full px-3 py-1.5 text-[11px] font-bold border transition-all duration-200 ${
                        isSelected
                          ? "bg-[#2563EB] text-white border-[#2563EB] shadow-xs dark:bg-[#3B82F6] dark:border-[#3B82F6]"
                          : "bg-zinc-50 text-zinc-650 border-zinc-200 hover:bg-zinc-100 hover:border-zinc-300 dark:bg-zinc-900 dark:text-zinc-400 dark:border-zinc-800 dark:hover:bg-zinc-850"
                      }`}
                    >
                      {chip.label}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        />
      </Field>

      {/* 희망일 */}
      <Field 
        label="희망일 (선택)" 
        error={errors.preferredDate?.message}
        completed={!!preferredDate}
      >
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
              className="w-full rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-[14px] font-bold text-zinc-800 outline-none transition-all focus:border-[#2563EB] focus:ring-1 focus:ring-blue-100/50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200"
            />
          )}
        />
      </Field>

      {/* 연락처 */}
      <Field
        label="연락처"
        hint="010-1234-5678 형식"
        error={errors.contactPhone?.message}
        completed={!!contactPhone && contactPhone.length >= 10}
      >
        <input
          {...register("contactPhone")}
          type="tel"
          placeholder="010-1234-5678"
          className="w-full rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-[14px] font-bold text-zinc-800 outline-none transition-all placeholder-zinc-350 focus:border-[#2563EB] focus:ring-1 focus:ring-blue-100/50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200"
        />
      </Field>

      {/* 사진 */}
      <Field 
        label="사진" 
        hint="최대 3장, 대표 이미지 포함"
        completed={photos.length > 0}
      >
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
        completed={!!noteValue && noteValue.length > 0}
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
              className="w-full resize-none rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-[14px] font-bold text-zinc-800 outline-none transition-all placeholder-zinc-350 focus:border-[#2563EB] focus:ring-1 focus:ring-blue-100/50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200"
            />
          )}
        />
      </Field>

      {submitError && (
        <p className="rounded-2xl bg-red-50 border border-red-100 px-4 py-3 text-sm font-semibold text-red-700 dark:bg-red-950/30 dark:border-red-900/50 dark:text-red-300">
          ⚠️ {submitError}
        </p>
      )}

      {/* Sticky Bottom CTA Button Area */}
      <div className="sticky bottom-[64px] z-30 -mx-5 bg-gradient-to-t from-[#F9FAFB] via-[#F9FAFB]/95 to-transparent px-5 pt-6 pb-4 dark:from-zinc-950 dark:via-zinc-950/95">
        <button
          type="submit"
          disabled={isPending || !isValidForm}
          className={`w-full flex items-center justify-center gap-2 rounded-2xl px-4 py-3.5 text-sm font-extrabold active:scale-[0.98] active:translate-y-[2px] transition-all duration-300 cursor-pointer ${
            isValidForm
              ? "bg-gradient-to-b from-[#3B82F6] to-[#2563EB] text-white hover:from-[#4F8FF7] hover:to-[#2A6DF0] shadow-[0_8px_20px_rgba(37,99,235,0.2)] border-b-4 border-[#1D4ED8] dark:border-[#1E40AF]"
              : "bg-zinc-100 text-zinc-400 border border-zinc-200 cursor-not-allowed border-b-4 border-b-zinc-300 dark:bg-zinc-900 dark:border-zinc-800 dark:border-b-zinc-950 dark:text-zinc-600"
          }`}
        >
          {isPending ? "제출 중..." : "견적 요청 제출"}
        </button>
      </div>

      {/* Full Screen Matching Animation Overlay */}
      {isPending && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-white/95 dark:bg-zinc-950/95 backdrop-blur-md animate-[page-fade-in_0.25s_ease-out]">
          <div className="relative flex flex-col items-center max-w-xs text-center px-4">
            {/* Radar glow */}
            <div className="absolute w-32 h-32 bg-blue-500/10 rounded-full blur-xl animate-pulse" />
            
            {/* Rotating / Pulsing Graphic */}
            <div className="relative w-28 h-28 flex items-center justify-center bg-gradient-to-tr from-blue-50 to-indigo-50 dark:from-zinc-900 dark:to-zinc-850 rounded-full border border-blue-100 dark:border-zinc-800 shadow-[inset_0_2px_6px_rgba(0,0,0,0.03)] mb-6">
              <Home className="h-12 w-12 text-blue-600 dark:text-blue-400 animate-[bounce_2s_infinite]" />
              
              {/* Orbiter container */}
              <div 
                className="absolute"
                style={{
                  animation: "orbit 4s linear infinite",
                }}
              >
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-white shadow-md border border-zinc-150 dark:bg-zinc-800 dark:border-zinc-700">
                  <Search className="h-4 w-4 text-blue-500 dark:text-blue-400" />
                </div>
              </div>
              
              <Sparkles className="absolute top-4 right-4 h-5 w-5 text-amber-400 animate-pulse" />
              <Sparkles className="absolute bottom-5 left-4 h-4 w-4 text-amber-300 animate-pulse delay-500" />
            </div>

            <h3 className="text-lg font-black text-zinc-900 dark:text-zinc-50 tracking-tight">
              조건에 맞는 청소 업체를 찾고 있어요
            </h3>
            
            <p className="mt-2 text-xs text-zinc-550 dark:text-zinc-400 leading-normal">
              선택하신 카테고리와 지역 정보를 토대로<br />
              최적의 청명 파트너를 분석하고 있습니다.
            </p>

            {/* Simple dot-flashing indicator */}
            <div className="mt-6 flex gap-1.5 items-center justify-center">
              <span className="w-2 h-2 rounded-full bg-blue-600 dark:bg-blue-400 animate-[bounce_1s_infinite]" />
              <span className="w-2 h-2 rounded-full bg-blue-500 dark:bg-blue-400 animate-[bounce_1s_infinite_0.2s]" />
              <span className="w-2 h-2 rounded-full bg-blue-400 dark:bg-blue-500 animate-[bounce_1s_infinite_0.4s]" />
            </div>
          </div>
        </div>
      )}
    </form>
  );
}

function Field({
  label,
  hint,
  error,
  completed,
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  completed?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className={`flex flex-col gap-2 rounded-[24px] border p-4.5 shadow-[0_8px_20px_rgba(15,23,42,0.015)] transition-all duration-300 ${
      completed
        ? "border-blue-200/80 bg-blue-50/5 dark:border-blue-900/30 bg-white dark:bg-zinc-950"
        : "border-zinc-200/50 bg-white dark:border-zinc-850 dark:bg-zinc-950"
    }`}>
      <span className="flex items-baseline justify-between">
        <span className="flex items-center gap-1.5">
          <span className="text-[14px] font-extrabold text-zinc-900 dark:text-zinc-50">
            {label}
          </span>
          {completed && (
            <span className="inline-flex items-center gap-0.5 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-extrabold text-emerald-600 border border-emerald-200/60 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900/50 animate-[scaleIn_0.2s_ease-out]">
              완료 ✓
            </span>
          )}
        </span>
        {hint && !completed && (
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
