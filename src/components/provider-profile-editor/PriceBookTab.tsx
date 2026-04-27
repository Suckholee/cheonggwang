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
import { Plus, Info, CheckCircle2, AlertCircle, Coins } from "lucide-react";

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
        setTimeout(() => setSubmitOk(false), 3000);
      } else {
        setSubmitError(result.message);
      }
    });
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-10">
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-[#6B7280]">
            <Coins className="h-4 w-4" />
            <span>서비스 단가 설정</span>
          </div>
          <span className="text-[12px] font-bold text-[#9CA3AF]">
            {fields.length} / {MAX_ENTRIES}
          </span>
        </div>

        <div className="flex gap-2 rounded-lg bg-[#F9FAFB] p-3 text-[12px] text-[#6B7280]">
          <Info className="h-4 w-4 shrink-0 text-[#2563EB]" />
          <p>
            고객이 비교할 수 있는 기준 금액을 등록하세요. 
            세부 조건은 실제 견적 발송 시 조정할 수 있습니다.
          </p>
        </div>

        {fields.length === 0 ? (
          <div className="rounded-2xl border-2 border-dashed border-[#E5E7EB] p-10 text-center transition-all hover:bg-[#F9FAFB]">
            <p className="text-[14px] font-medium text-[#9CA3AF]">아직 등록된 단가가 없어요</p>
          </div>
        ) : (
          <div className="space-y-4">
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
          className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-[#D1D5DB] py-4 text-[14px] font-bold text-[#4B5563] transition-all hover:border-[#2563EB] hover:bg-[#EFF6FF] hover:text-[#2563EB] disabled:opacity-50"
        >
          <Plus className="h-4 w-4" />
          항목 추가하기
        </button>
      </section>

      <div className="pt-8 border-t border-[#F3F4F6] space-y-6">
        {submitError && (
          <div className="flex items-center gap-2 rounded-xl bg-[#FEF2F2] px-4 py-3 text-[14px] font-medium text-[#991B1B] animate-in shake">
            <AlertCircle className="h-4 w-4" />
            <span>{submitError}</span>
          </div>
        )}
        {submitOk && (
          <div className="flex items-center gap-2 rounded-xl bg-[#ECFDF5] px-4 py-3 text-[14px] font-medium text-[#065F46] animate-in fade-in slide-in-from-bottom-2">
            <CheckCircle2 className="h-4 w-4" />
            <span>단가 설정이 성공적으로 저장되었습니다.</span>
          </div>
        )}

        <button
          type="submit"
          disabled={isPending}
          className={`flex w-full items-center justify-center gap-2 rounded-xl bg-[#2563EB] py-4 text-[16px] font-bold text-white shadow-lg shadow-blue-500/20 transition-all hover:bg-[#1D4ED8] hover:shadow-blue-500/30 active:scale-[0.98] disabled:opacity-50 ${
            isPending ? "cursor-wait" : ""
          }`}
        >
          {isPending ? (
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
          ) : (
            <CheckCircle2 className="h-5 w-5" />
          )}
          <span>{isPending ? "저장 중..." : "설정 저장하기"}</span>
        </button>
      </div>
    </form>
  );
}
