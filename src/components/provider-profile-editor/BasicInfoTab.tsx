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
import { User, Phone, MapPin, Grid, CheckCircle2, AlertCircle } from "lucide-react";

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
        setTimeout(() => setSubmitOk(false), 3000);
      } else {
        setSubmitError(result.message);
      }
    });
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-10">
      <div className="space-y-8">
        <section className="space-y-4">
          <div className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-[#6B7280]">
            <User className="h-4 w-4" />
            <span>기본 프로필</span>
          </div>
          <div className="space-y-6">
            <div className="space-y-2">
              <label className="text-[13px] font-semibold text-[#374151]">프로필 사진</label>
              <Controller
                control={control}
                name="profileImage"
                render={({ field }) => (
                  <div className="rounded-xl border-2 border-dashed border-[#E5E7EB] p-4 bg-[#F9FAFB] hover:bg-white hover:border-[#2563EB] transition-all">
                    <PhotoUpload
                      pageId="profile"
                      pathPrefix="profile-images"
                      maxPhotos={1}
                      photos={field.value ? [field.value] : []}
                      onChange={(photos) => field.onChange(photos[0] ?? null)}
                    />
                  </div>
                )}
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="description" className="text-[13px] font-semibold text-[#374151]">
                소개글 <span className="font-normal text-[#6B7280]">(선택)</span>
              </label>
              <div className="relative">
                <textarea
                  id="description"
                  rows={6}
                  {...register("description", {
                    setValueAs: (v) => (v === "" ? null : v),
                  })}
                  className="w-full rounded-xl border border-[#D1D5DB] bg-white px-4 py-3.5 text-[15px] focus:border-[#2563EB] focus:outline-none focus:ring-4 focus:ring-[#DBEAFE] transition-all placeholder:text-[#9CA3AF]"
                  placeholder="청명의 강점 · 철학 · 경력 등을 소개해 주세요"
                  aria-invalid={!!errors.description}
                />
                <div className="absolute bottom-3 right-3 text-[11px] font-bold text-[#6B7280]">
                  {descValue.length} / {DESC_MAX}
                </div>
              </div>
              {errors.description && (
                <p className="text-[12px] font-medium text-[#EF4444]">{errors.description.message}</p>
              )}
            </div>
          </div>
        </section>

        <section className="space-y-4">
          <div className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-[#6B7280]">
            <MapPin className="h-4 w-4" />
            <span>활동 지역</span>
          </div>
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

        <section className="space-y-4">
          <div className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-[#6B7280]">
            <Grid className="h-4 w-4" />
            <span>서비스 카테고리</span>
          </div>
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

        <section className="space-y-4">
          <div className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-[#6B7280]">
            <Phone className="h-4 w-4" />
            <span>연락처 정보</span>
          </div>
          <div className="space-y-2">
            <input
              id="contactPhone"
              type="tel"
              {...register("contactPhone", {
                setValueAs: (v) => (v === "" ? null : v),
              })}
              className="w-full rounded-xl border border-[#D1D5DB] bg-white px-4 py-3.5 text-[15px] focus:border-[#2563EB] focus:outline-none focus:ring-4 focus:ring-[#DBEAFE] transition-all"
              placeholder="010-1234-5678"
              aria-invalid={!!errors.contactPhone}
            />
            {errors.contactPhone && (
              <p className="text-[12px] font-medium text-[#EF4444]">{errors.contactPhone.message}</p>
            )}
          </div>
        </section>
      </div>

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
            <span>프로필이 성공적으로 저장되었습니다.</span>
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
