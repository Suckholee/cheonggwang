"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm, useFieldArray, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Trash2 } from "lucide-react";
import {
  proposalFormSchema,
  type ProposalFormInput,
} from "@/domain/quote-proposal-schema";
import {
  QUOTE_CATEGORY_LABELS,
  type QuoteCategory,
} from "@/domain/quote-category";
import { submitQuote } from "@/app/actions/quote-response-actions";
import { buildThreadId } from "@/domain/chat-schemas";
import type { QuoteRequest } from "@/types/quote-request";

interface Props {
  request: QuoteRequest;
  providerId: string;
}

export function QuoteProposalForm({ request, providerId }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [submitError, setSubmitError] = useState<string | null>(null);

  const defaultLabel = `기본 ${QUOTE_CATEGORY_LABELS[request.category]}`;

  const {
    register,
    handleSubmit,
    control,
    watch,
    formState: { errors },
  } = useForm<ProposalFormInput>({
    resolver: zodResolver(proposalFormSchema),
    defaultValues: {
      items: [{ label: defaultLabel, price: 0, note: null }],
      scheduledAtDate: "",
      scheduledAtTime: "",
      estimatedWorkHours: null,
      insured: false,
      insuranceAmount: null,
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "items",
  });

  const items = watch("items");
  const totalAmount = items.reduce(
    (sum, i) => sum + (Number(i.price) || 0),
    0,
  );
  const insured = watch("insured");

  function onSubmit(data: ProposalFormInput) {
    setSubmitError(null);

    // scheduledAt 조합
    let scheduledAt: string | null = null;
    if (data.scheduledAtDate && data.scheduledAtTime) {
      const iso = new Date(
        `${data.scheduledAtDate}T${data.scheduledAtTime}:00`,
      ).toISOString();
      scheduledAt = iso;
    }

    startTransition(async () => {
      const result = await submitQuote({
        requestId: request.id,
        items: data.items.map((i) => ({
          label: i.label,
          price: i.price,
          note: i.note ?? null,
        })),
        scheduledAt,
        estimatedWorkHours: data.estimatedWorkHours,
        insured: data.insured,
        insuranceAmount: data.insured ? data.insuranceAmount ?? null : null,
      });

      if (result.ok) {
        // v1.2 #1 chat — submit 성공 → 생성된 thread로 이동 (의뢰인과 협의 시작)
        const threadId = buildThreadId(request.id, providerId);
        router.replace(`/chat/${threadId}`);
        router.refresh();
      } else {
        setSubmitError(result.message);
      }
    });
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-6">
      {/* Summary bar */}
      <div className="rounded-xl bg-zinc-50 px-4 py-3 text-sm text-zinc-600 dark:bg-zinc-900 dark:text-zinc-400">
        {QUOTE_CATEGORY_LABELS[request.category as QuoteCategory]} ·{" "}
        {request.region.district}
        {request.size ? ` · ${request.size}평` : ""}
      </div>

      {/* Items */}
      <section className="flex flex-col gap-3">
        <label className="text-sm font-medium">항목</label>
        {fields.map((field, index) => (
          <div
            key={field.id}
            className="flex flex-col gap-2 rounded-xl border border-zinc-200 p-3 dark:border-zinc-800"
          >
            <div className="flex items-center gap-2">
              <input
                {...register(`items.${index}.label`)}
                placeholder="항목명"
                className="flex-1 rounded border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-950"
              />
              {fields.length > 1 && (
                <button
                  type="button"
                  onClick={() => remove(index)}
                  className="rounded p-2 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-900"
                  aria-label="항목 삭제"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </div>
            <Controller
              control={control}
              name={`items.${index}.price`}
              render={({ field: f }) => (
                <input
                  type="number"
                  inputMode="numeric"
                  min={0}
                  value={f.value ?? 0}
                  onChange={(e) =>
                    f.onChange(
                      e.target.value === "" ? 0 : Number(e.target.value),
                    )
                  }
                  placeholder="금액 (원)"
                  className="w-full rounded border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-950"
                />
              )}
            />
            {errors.items?.[index]?.label?.message && (
              <p className="text-xs text-red-600">
                {errors.items[index]?.label?.message}
              </p>
            )}
            {errors.items?.[index]?.price?.message && (
              <p className="text-xs text-red-600">
                {errors.items[index]?.price?.message}
              </p>
            )}
          </div>
        ))}
        <button
          type="button"
          onClick={() =>
            append({ label: "", price: 0, note: null })
          }
          disabled={fields.length >= 10}
          className="flex items-center justify-center gap-1.5 rounded-xl border border-dashed border-zinc-300 py-2.5 text-sm font-medium text-zinc-600 hover:border-zinc-400 disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-400"
        >
          <Plus className="h-4 w-4" /> 항목 추가
        </button>
      </section>

      {/* 희망 일정 */}
      <Field label="희망 일정 (선택)">
        <div className="flex gap-2">
          <input
            {...register("scheduledAtDate")}
            type="date"
            className="flex-1 rounded border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-950"
          />
          <input
            {...register("scheduledAtTime")}
            type="time"
            className="w-28 rounded border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-950"
          />
        </div>
      </Field>

      {/* 작업 예상 시간 */}
      <Field label="작업 예상 시간 (선택)">
        <Controller
          control={control}
          name="estimatedWorkHours"
          render={({ field }) => (
            <input
              type="number"
              inputMode="numeric"
              min={1}
              max={48}
              value={field.value ?? ""}
              onChange={(e) => {
                const v = e.target.value;
                field.onChange(v === "" ? null : Number(v));
              }}
              placeholder="예: 5"
              className="w-full rounded border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-950"
            />
          )}
        />
      </Field>

      {/* 배상보험 */}
      <label className="flex items-center gap-2 text-sm">
        <input
          {...register("insured")}
          type="checkbox"
          className="h-4 w-4 rounded border-zinc-300"
        />
        <span>배상보험 가입</span>
      </label>

      {insured && (
        <Field label="배상보험 금액 (원)">
          <Controller
            control={control}
            name="insuranceAmount"
            render={({ field }) => (
              <input
                type="number"
                inputMode="numeric"
                min={0}
                value={field.value ?? ""}
                onChange={(e) => {
                  const v = e.target.value;
                  field.onChange(v === "" ? null : Number(v));
                }}
                placeholder="예: 300000000"
                className="w-full rounded border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-950"
              />
            )}
          />
        </Field>
      )}

      {/* 합계 */}
      <div className="border-t border-zinc-200 pt-4 dark:border-zinc-800">
        <div className="flex items-baseline justify-between">
          <span className="text-sm text-zinc-600 dark:text-zinc-400">합계</span>
          <span className="text-2xl font-bold">
            {totalAmount.toLocaleString()}원
          </span>
        </div>
      </div>

      {submitError && (
        <p className="rounded bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
          {submitError}
        </p>
      )}

      <button
        type="submit"
        disabled={isPending || totalAmount <= 0}
        className="rounded bg-indigo-600 px-4 py-3.5 text-sm font-semibold text-white transition-colors hover:bg-indigo-700 disabled:opacity-50"
      >
        {isPending
          ? "제출 중..."
          : `${totalAmount.toLocaleString()}원 견적 제출`}
      </button>
    </form>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-sm font-medium">{label}</span>
      {children}
    </label>
  );
}
