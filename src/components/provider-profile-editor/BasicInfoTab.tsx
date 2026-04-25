"use client";

import { useState, useTransition } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  basicInfoInputSchema,
  type BasicInfoInput,
} from "@/domain/provider-editor-schema";
import { PhotoUpload } from "@/components/editor/PhotoUpload";
import { updateProfileBasic } from "@/app/actions/provider-editor-actions";
import { RegionCheckboxGrid } from "./RegionCheckboxGrid";
import { CategoryCheckboxGrid } from "./CategoryCheckboxGrid";
import type { Provider } from "@/types/provider";
import type { Photo } from "@/types/page";

interface Props {
  provider: Provider;
}

const DESC_MAX = 500;

export function BasicInfoTab({ provider }: Props) {
  const [isPending, startTransition] = useTransition();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitOk, setSubmitOk] = useState(false);

  const initialPhoto: Photo | null =
    provider.profileImage && provider.profileImagePath
      ? {
          url: provider.profileImage,
          path: provider.profileImagePath,
          order: 0,
        }
      : null;

  const {
    register,
    handleSubmit,
    control,
    watch,
    formState: { errors },
  } = useForm<BasicInfoInput>({
    resolver: zodResolver(basicInfoInputSchema),
    defaultValues: {
      profileImage: initialPhoto,
      description: provider.description ?? null,
      regions: provider.regions,
      categories: provider.categories,
      contactPhone: provider.contactPhone ?? null,
    },
  });

  const descValue = watch("description") ?? "";

  function onSubmit(data: BasicInfoInput) {
    setSubmitError(null);
    setSubmitOk(false);
    startTransition(async () => {
      const result = await updateProfileBasic(data);
      if (result.ok) {
        setSubmitOk(true);
      } else {
        setSubmitError(result.message);
      }
    });
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <section>
        <label className="mb-2 block text-sm font-medium">프로필 사진</label>
        <Controller
          control={control}
          name="profileImage"
          render={({ field }) => (
            <PhotoUpload
              pageId="profile"
              pathPrefix="profile-images"
              maxPhotos={1}
              photos={field.value ? [field.value] : []}
              onChange={(photos) => field.onChange(photos[0] ?? null)}
            />
          )}
        />
      </section>

      <section>
        <label
          htmlFor="description"
          className="mb-2 block text-sm font-medium"
        >
          소개글 <span className="text-xs text-zinc-500">(선택)</span>
        </label>
        <textarea
          id="description"
          rows={5}
          {...register("description", {
            setValueAs: (v) => (v === "" ? null : v),
          })}
          className="w-full rounded-[16px] border border-zinc-200 bg-white px-4 py-3.5 text-[15px] outline-none transition-colors focus:border-[#2B66F6] focus:ring-1 focus:ring-[#2B66F6] dark:border-zinc-800 dark:bg-zinc-900 dark:focus:border-[#5B8DF6] dark:focus:ring-[#5B8DF6]"
          placeholder="청명의 강점 · 철학 · 경력 등을 소개해 주세요"
          aria-invalid={!!errors.description}
        />
        <div className="mt-1 flex justify-between text-xs text-zinc-500">
          <span>
            {errors.description && (
              <span className="text-red-600 dark:text-red-400">
                {errors.description.message}
              </span>
            )}
          </span>
          <span>
            {descValue.length} / {DESC_MAX}
          </span>
        </div>
      </section>

      <section>
        <label className="mb-2 block text-sm font-medium">활동 지역</label>
        <Controller
          control={control}
          name="regions"
          render={({ field }) => (
            <RegionCheckboxGrid
              value={field.value}
              onChange={field.onChange}
              error={errors.regions?.message}
            />
          )}
        />
      </section>

      <section>
        <label className="mb-2 block text-sm font-medium">서비스 카테고리</label>
        <Controller
          control={control}
          name="categories"
          render={({ field }) => (
            <CategoryCheckboxGrid
              value={field.value}
              onChange={field.onChange}
              error={errors.categories?.message}
            />
          )}
        />
      </section>

      <section>
        <label
          htmlFor="contactPhone"
          className="mb-2 block text-sm font-medium"
        >
          연락처
        </label>
        <input
          id="contactPhone"
          type="tel"
          {...register("contactPhone", {
            setValueAs: (v) => (v === "" ? null : v),
          })}
          className="w-full rounded-[16px] border border-zinc-200 bg-white px-4 py-3.5 text-[15px] outline-none transition-colors focus:border-[#2B66F6] focus:ring-1 focus:ring-[#2B66F6] dark:border-zinc-800 dark:bg-zinc-900 dark:focus:border-[#5B8DF6] dark:focus:ring-[#5B8DF6]"
          placeholder="010-1234-5678"
          aria-invalid={!!errors.contactPhone}
        />
        {errors.contactPhone && (
          <p className="mt-1 text-xs text-red-600 dark:text-red-400">
            {errors.contactPhone.message}
          </p>
        )}
      </section>

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
        className="w-full rounded-[16px] bg-[#2B66F6] px-4 py-4 text-[16px] font-bold text-white transition-all hover:bg-blue-700 active:scale-[0.98] disabled:opacity-50 dark:bg-[#2B66F6]"
      >
        {isPending ? "저장 중..." : "저장하기"}
      </button>
    </form>
  );
}
