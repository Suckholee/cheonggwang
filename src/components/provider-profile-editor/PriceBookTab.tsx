"use client";

import { useState, useTransition } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  upsertPriceBookInputSchema,
  type UpsertPriceBookInput,
} from "@/domain/provider-editor-schema";
import { upsertPriceBook } from "@/app/actions/provider-editor-actions";
import { PriceBookEntryRow } from "./PriceBookEntryRow";
import type { Provider } from "@/types/provider";

interface Props {
  provider: Provider;
}

const MAX_ENTRIES = 10;

export function PriceBookTab({ provider }: Props) {
  const [isPending, startTransition] = useTransition();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitOk, setSubmitOk] = useState(false);

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<UpsertPriceBookInput>({
    resolver: zodResolver(upsertPriceBookInputSchema),
    defaultValues: {
      entries: provider.priceBook ?? [],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "entries",
  });

  function onSubmit(data: UpsertPriceBookInput) {
    setSubmitError(null);
    setSubmitOk(false);
    startTransition(async () => {
      const result = await upsertPriceBook(data);
      if (result.ok) {
        setSubmitOk(true);
      } else {
        setSubmitError(result.message);
      }
    });
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div>
        <h2 className="mb-2 text-base font-semibold">
          서비스 단가 <span className="text-xs text-zinc-500">(최대 10개)</span>
        </h2>
        <p className="text-xs text-zinc-500">
          고객이 비교할 수 있는 기준 금액을 등록하세요. 세부 조건은 견적에서
          조정할 수 있습니다.
        </p>
      </div>

      {fields.length === 0 ? (
        <div className="rounded-lg border border-dashed border-zinc-300 p-8 text-center text-sm text-zinc-500 dark:border-zinc-700">
          아직 등록된 단가가 없어요
        </div>
      ) : (
        <div className="space-y-3">
          {fields.map((field, index) => (
            <PriceBookEntryRow
              key={field.id}
              index={index}
              register={register}
              errors={errors}
              onRemove={() => remove(index)}
            />
          ))}
        </div>
      )}

      <button
        type="button"
        disabled={fields.length >= MAX_ENTRIES}
        onClick={() =>
          append({
            category: "move-in",
            unit: "per_visit",
            unitLabel: "",
            basePrice: 0,
          })
        }
        className="w-full rounded-lg border border-dashed border-indigo-400 px-4 py-3 text-sm font-medium text-indigo-600 transition-colors hover:bg-indigo-50 disabled:opacity-50 dark:border-indigo-600 dark:text-indigo-400 dark:hover:bg-indigo-950/30"
      >
        + 항목 추가 ({fields.length}/{MAX_ENTRIES})
      </button>

      {submitError && (
        <p className="rounded bg-red-50 px-3 py-2 text-xs text-red-700 dark:bg-red-950/50 dark:text-red-300">
          {submitError}
        </p>
      )}
      {submitOk && (
        <p className="rounded bg-emerald-50 px-3 py-2 text-xs text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300">
          저장되었습니다
        </p>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="w-full rounded-lg bg-indigo-600 px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-indigo-700 disabled:opacity-50"
      >
        {isPending ? "저장 중..." : "저장하기"}
      </button>
    </form>
  );
}
