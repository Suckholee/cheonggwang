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
  QUOTE_CATEGORY_EMOJIS,
  QUOTE_CATEGORY_LABELS,
  QUOTE_CATEGORY_SUBTITLES,
  type QuoteCategory,
} from "@/domain/quote-category";
import { FORM_REGION_OPTIONS } from "@/domain/region-presets";
import { PhotoUpload } from "@/components/editor/PhotoUpload";
import { submitQuoteRequest } from "@/app/actions/quote-actions";
import type { Photo } from "@/types/page";

interface Props {
  requestId: string;
  initialCategory?: QuoteCategory;
  /** v1.1b #2 provider-profile · "견적 요청하기" 경로에서 우선 청명 지정 */
  preferredProviderId?: string;
}

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
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5">
      {/* 카테고리 */}
      <Field label="카테고리" hint="6종 중 1개 선택" error={errors.category?.message}>
        <div className="grid grid-cols-3 gap-2">
          {QUOTE_CATEGORIES.map((c) => {
            const selected = c === category;
            return (
              <button
                key={c}
                type="button"
                onClick={() =>
                  setValue("category", c, { shouldValidate: true })
                }
                className={`flex flex-col items-center gap-1 rounded-xl border px-3 py-3 text-xs transition-colors ${
                  selected
                    ? "border-zinc-900 bg-zinc-900 text-white dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900"
                    : "border-zinc-200 bg-white hover:border-zinc-400 dark:border-zinc-800 dark:bg-zinc-950"
                }`}
              >
                <span className="text-xl" aria-hidden>
                  {QUOTE_CATEGORY_EMOJIS[c]}
                </span>
                <span className="font-medium">{QUOTE_CATEGORY_LABELS[c]}</span>
                <span className={selected ? "text-zinc-300" : "text-zinc-500"}>
                  {QUOTE_CATEGORY_SUBTITLES[c]}
                </span>
              </button>
            );
          })}
        </div>
      </Field>

      {/* 지역 */}
      <Field label="지역" error={errors.region?.city?.message}>
        <select
          value={selectedRegionValue}
          onChange={(e) => onRegionChange(e.target.value)}
          className="w-full rounded border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-950"
        >
          {FORM_REGION_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
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
              className="w-full rounded border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-950"
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
              className="w-full rounded border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-950"
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
          className="w-full rounded border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-950"
        />
      </Field>

      {/* 사진 */}
      <Field label="사진" hint="최대 5장, 장당 5MB">
        <PhotoUpload
          pageId={requestId}
          pathPrefix="quote-photos"
          photos={photos}
          onChange={(next: Photo[]) =>
            setValue("photos", next, { shouldValidate: true })
          }
        />
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
              placeholder="펫 있음, 주차 가능 여부, 기타 요청사항 등"
              className="w-full resize-none rounded border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-950"
            />
          )}
        />
      </Field>

      {submitError && (
        <p className="rounded bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
          {submitError}
        </p>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="rounded bg-zinc-900 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
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
    <label className="flex flex-col gap-1.5">
      <span className="flex items-baseline justify-between text-sm font-medium">
        <span>{label}</span>
        {hint && (
          <span className="text-xs font-normal text-zinc-500">{hint}</span>
        )}
      </span>
      {children}
      {error && <span className="text-xs text-red-600">{error}</span>}
    </label>
  );
}
