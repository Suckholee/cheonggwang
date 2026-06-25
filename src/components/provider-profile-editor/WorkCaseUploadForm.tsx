"use client";

import { useState, useTransition } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { customAlphabet } from "nanoid";
import {
  createWorkCaseInputSchema,
  type CreateWorkCaseInput,
} from "@/domain/provider-editor-schema";
import {
  QUOTE_CATEGORIES,
  QUOTE_CATEGORY_LABELS,
} from "@/domain/quote-category";
import { PhotoUpload } from "@/components/editor/PhotoUpload";
import { createWorkCase } from "@/app/actions/provider-editor-actions";
import { Plus, AlertCircle, CheckCircle2 } from "lucide-react";

const nanoId16 = customAlphabet("0123456789abcdefghijklmnopqrstuvwxyz", 16);

export function WorkCaseUploadForm() {
  const [isPending, startTransition] = useTransition();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [workCaseId, setWorkCaseId] = useState(() => nanoId16());

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<CreateWorkCaseInput>({
    resolver: zodResolver(createWorkCaseInputSchema),
    defaultValues: {
      workCaseId,
      category: "residential",
      sizeLabel: "",
      memo: null,
    },
  });

  function onSubmit(data: CreateWorkCaseInput) {
    setSubmitError(null);
    startTransition(async () => {
      const result = await createWorkCase(data);
      if (result.ok) {
        const nextId = nanoId16();
        setWorkCaseId(nextId);
        reset({
          workCaseId: nextId,
          category: "residential",
          sizeLabel: "",
          memo: null,
          beforePhoto: undefined,
          afterPhoto: undefined,
        } as unknown as CreateWorkCaseInput);
      } else {
        setSubmitError(result.message);
      }
    });
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="space-y-8 rounded-2xl border border-[#F3F4F6] bg-white p-6 shadow-sm"
    >
      <div className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-[#6B7280]">
        <Plus className="h-4 w-4" />
        <span>새 작업 업로드</span>
      </div>

      <input type="hidden" {...register("workCaseId")} />

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <section className="space-y-2">
          <label className="text-[13px] font-semibold text-[#374151]">Before 사진</label>
          <Controller
            control={control}
            name="beforePhoto"
            render={({ field }) => (
              <div className="rounded-xl border-2 border-dashed border-[#E5E7EB] p-3 bg-[#F9FAFB] hover:bg-white hover:border-[#2563EB] transition-all">
                <PhotoUpload
                  pageId={`${workCaseId}-before`}
                  pathPrefix="work-photos"
                  maxPhotos={1}
                  photos={field.value ? [field.value] : []}
                  onChange={(photos) => field.onChange(photos[0] ?? undefined)}
                />
              </div>
            )}
          />
          {errors.beforePhoto && (
            <p className="text-[12px] font-medium text-[#EF4444]">Before 사진이 필요합니다</p>
          )}
        </section>

        <section className="space-y-2">
          <label className="text-[13px] font-semibold text-[#374151]">After 사진</label>
          <Controller
            control={control}
            name="afterPhoto"
            render={({ field }) => (
              <div className="rounded-xl border-2 border-dashed border-[#E5E7EB] p-3 bg-[#F9FAFB] hover:bg-white hover:border-[#2563EB] transition-all">
                <PhotoUpload
                  pageId={`${workCaseId}-after`}
                  pathPrefix="work-photos"
                  maxPhotos={1}
                  photos={field.value ? [field.value] : []}
                  onChange={(photos) => field.onChange(photos[0] ?? undefined)}
                />
              </div>
            )}
          />
          {errors.afterPhoto && (
            <p className="text-[12px] font-medium text-[#EF4444]">After 사진이 필요합니다</p>
          )}
        </section>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <section className="space-y-1.5">
          <label className="text-[12px] font-semibold text-[#4B5563]">카테고리</label>
          <div className="relative">
            <select
              {...register("category")}
              className="w-full appearance-none rounded-xl border border-[#D1D5DB] bg-white px-4 py-2.5 text-[14px] focus:border-[#2563EB] focus:outline-none focus:ring-4 focus:ring-[#DBEAFE] transition-all"
            >
              {QUOTE_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {QUOTE_CATEGORY_LABELS[c]}
                </option>
              ))}
            </select>
          </div>
        </section>

        <section className="space-y-1.5">
          <label htmlFor="sizeLabel" className="text-[12px] font-semibold text-[#4B5563]">
            작업 설명
          </label>
          <input
            id="sizeLabel"
            type="text"
            {...register("sizeLabel")}
            placeholder="32평 · 이사 전"
            className="w-full rounded-xl border border-[#D1D5DB] bg-white px-4 py-2.5 text-[14px] focus:border-[#2563EB] focus:outline-none focus:ring-4 focus:ring-[#DBEAFE] transition-all"
          />
          {errors.sizeLabel && (
            <p className="text-[12px] font-medium text-[#EF4444]">{errors.sizeLabel.message}</p>
          )}
        </section>
      </div>

      <section className="space-y-1.5">
        <label htmlFor="memo" className="text-[12px] font-semibold text-[#4B5563]">
          메모 <span className="font-normal text-[#9CA3AF]">(선택, 200자)</span>
        </label>
        <textarea
          id="memo"
          rows={3}
          {...register("memo", {
            setValueAs: (v) => (v === "" ? null : v),
          })}
          className="w-full rounded-xl border border-[#D1D5DB] bg-white px-4 py-2.5 text-[14px] focus:border-[#2563EB] focus:outline-none focus:ring-4 focus:ring-[#DBEAFE] transition-all"
          placeholder="작업 포인트 · 고객 반응 등"
        />
      </section>

      {submitError && (
        <div className="flex items-center gap-2 rounded-xl bg-[#FEF2F2] px-4 py-3 text-[14px] font-medium text-[#991B1B]">
          <AlertCircle className="h-4 w-4" />
          <span>{submitError}</span>
        </div>
      )}

      <button
        type="submit"
        disabled={isPending}
        className={`flex w-full items-center justify-center gap-2 rounded-xl bg-[#111827] py-4 text-[15px] font-bold text-white transition-all hover:bg-black active:scale-[0.98] disabled:opacity-50 ${
          isPending ? "cursor-wait" : ""
        }`}
      >
        {isPending ? (
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
        ) : (
          <Plus className="h-5 w-5" />
        )}
        <span>{isPending ? "업로드 중..." : "새 작업 업로드하기"}</span>
      </button>
    </form>
  );
}
