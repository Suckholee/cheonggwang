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

const nanoId16 = customAlphabet("0123456789abcdefghijklmnopqrstuvwxyz", 16);

export function WorkCaseUploadForm() {
  const [isPending, startTransition] = useTransition();
  const [submitError, setSubmitError] = useState<string | null>(null);
  // 폼 마운트 시 workCaseId 사전 발급 — Storage path와 Firestore id 일관성
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
      category: "move-in",
      sizeLabel: "",
      memo: null,
      // beforePhoto/afterPhoto는 PhotoUpload를 거쳐 설정되므로 빈 객체로 두면 Zod가 거부
      // — Controller로 photo 1장을 강제 바인딩.
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
          category: "move-in",
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
      className="space-y-5 rounded-lg border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950"
    >
      <h3 className="text-base font-semibold">새 작업 업로드</h3>

      <input type="hidden" {...register("workCaseId")} />

      <section>
        <label className="mb-2 block text-sm font-medium">Before 사진</label>
        <Controller
          control={control}
          name="beforePhoto"
          render={({ field }) => (
            <PhotoUpload
              pageId={`${workCaseId}-before`}
              pathPrefix="work-photos"
              maxPhotos={1}
              photos={field.value ? [field.value] : []}
              onChange={(photos) =>
                field.onChange(photos[0] ?? undefined)
              }
            />
          )}
        />
        {errors.beforePhoto && (
          <p className="mt-1 text-xs text-red-600 dark:text-red-400">
            Before 사진이 필요합니다
          </p>
        )}
      </section>

      <section>
        <label className="mb-2 block text-sm font-medium">After 사진</label>
        <Controller
          control={control}
          name="afterPhoto"
          render={({ field }) => (
            <PhotoUpload
              pageId={`${workCaseId}-after`}
              pathPrefix="work-photos"
              maxPhotos={1}
              photos={field.value ? [field.value] : []}
              onChange={(photos) =>
                field.onChange(photos[0] ?? undefined)
              }
            />
          )}
        />
        {errors.afterPhoto && (
          <p className="mt-1 text-xs text-red-600 dark:text-red-400">
            After 사진이 필요합니다
          </p>
        )}
      </section>

      <section>
        <label className="mb-1 block text-sm font-medium">카테고리</label>
        <select
          {...register("category")}
          className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950"
        >
          {QUOTE_CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {QUOTE_CATEGORY_LABELS[c]}
            </option>
          ))}
        </select>
      </section>

      <section>
        <label htmlFor="sizeLabel" className="mb-1 block text-sm font-medium">
          작업 설명
        </label>
        <input
          id="sizeLabel"
          type="text"
          {...register("sizeLabel")}
          placeholder="32평 · 이사 전"
          className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950"
        />
        {errors.sizeLabel && (
          <p className="mt-1 text-xs text-red-600 dark:text-red-400">
            {errors.sizeLabel.message}
          </p>
        )}
      </section>

      <section>
        <label htmlFor="memo" className="mb-1 block text-sm font-medium">
          메모 <span className="text-xs text-zinc-500">(선택, 200자)</span>
        </label>
        <textarea
          id="memo"
          rows={3}
          {...register("memo", {
            setValueAs: (v) => (v === "" ? null : v),
          })}
          className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950"
          placeholder="작업 포인트 · 고객 반응 등"
        />
      </section>

      {submitError && (
        <p className="rounded bg-red-50 px-3 py-2 text-xs text-red-700 dark:bg-red-950/50 dark:text-red-300">
          {submitError}
        </p>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="w-full rounded-lg bg-indigo-600 px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-indigo-700 disabled:opacity-50"
      >
        {isPending ? "업로드 중..." : "업로드"}
      </button>
    </form>
  );
}
