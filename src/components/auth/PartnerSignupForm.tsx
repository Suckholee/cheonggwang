"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  createUserWithEmailAndPassword,
  type AuthError,
} from "firebase/auth";
import { clientAuth } from "@/lib/firebase/client";
import {
  partnerApplicationFormSchema,
  type PartnerApplicationFormInput,
} from "@/domain/partner-application-schema";
import {
  QUOTE_CATEGORIES,
  QUOTE_CATEGORY_EMOJIS,
  QUOTE_CATEGORY_LABELS,
} from "@/domain/quote-category";
import { submitPartnerApplication } from "@/app/actions/partner-application-actions";

/**
 * v1.9 partner-application · §6.1 — 가입+신청 폼.
 *  - client-first 패턴: createUserWithEmailAndPassword → getIdToken → server action
 *  - real email 강제 (R2)
 */

export function PartnerSignupForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [submitError, setSubmitError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<PartnerApplicationFormInput>({
    resolver: zodResolver(partnerApplicationFormSchema),
    defaultValues: {
      email: "",
      password: "",
      passwordConfirm: "",
      businessName: "",
      phone: "",
      category: undefined,
      regionLabel: "",
      intro: "",
    },
  });

  async function onSubmit(data: PartnerApplicationFormInput) {
    setSubmitError(null);

    // 1. Firebase Auth 가입
    let idToken: string;
    try {
      const cred = await createUserWithEmailAndPassword(
        clientAuth,
        data.email,
        data.password,
      );
      idToken = await cred.user.getIdToken();
    } catch (err) {
      const authErr = err as AuthError;
      if (authErr.code === "auth/email-already-in-use") {
        setSubmitError(
          "이미 가입된 이메일입니다. 로그인 후 신청을 다시 시도해 주세요.",
        );
      } else if (authErr.code === "auth/invalid-email") {
        setSubmitError("올바른 이메일 형식이 아닙니다.");
      } else if (authErr.code === "auth/weak-password") {
        setSubmitError("비밀번호가 너무 약합니다 (최소 8자).");
      } else {
        setSubmitError(authErr.message ?? "가입 실패");
      }
      return;
    }

    // 2. server action — applicants doc 생성 + session cookie
    startTransition(async () => {
      const res = await submitPartnerApplication({
        idToken,
        businessName: data.businessName,
        phone: data.phone || undefined,
        category: data.category,
        regionLabel: data.regionLabel || undefined,
        intro: data.intro || undefined,
      });

      if (!res.ok) {
        setSubmitError(res.message);
        return;
      }
      router.push(res.data.redirectTo);
      router.refresh();
    });
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="w-full max-w-md space-y-4"
    >
      {/* Auth */}
      <div>
        <label className="mb-1 block text-sm font-medium">이메일*</label>
        <input
          type="email"
          {...register("email")}
          autoComplete="email"
          className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
        />
        {errors.email && (
          <p className="mt-1 text-xs text-red-600">{errors.email.message}</p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1 block text-sm font-medium">비밀번호*</label>
          <input
            type="password"
            {...register("password")}
            autoComplete="new-password"
            className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
          />
          {errors.password && (
            <p className="mt-1 text-xs text-red-600">{errors.password.message}</p>
          )}
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">비밀번호 확인*</label>
          <input
            type="password"
            {...register("passwordConfirm")}
            autoComplete="new-password"
            className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
          />
          {errors.passwordConfirm && (
            <p className="mt-1 text-xs text-red-600">
              {errors.passwordConfirm.message}
            </p>
          )}
        </div>
      </div>

      <div className="border-t border-zinc-200 pt-4 dark:border-zinc-800" />

      {/* Business */}
      <div>
        <label className="mb-1 block text-sm font-medium">매장명*</label>
        <input
          type="text"
          {...register("businessName")}
          className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
        />
        {errors.businessName && (
          <p className="mt-1 text-xs text-red-600">
            {errors.businessName.message}
          </p>
        )}
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium">연락처</label>
        <input
          type="tel"
          {...register("phone")}
          placeholder="010-1234-5678"
          className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
        />
        {errors.phone && (
          <p className="mt-1 text-xs text-red-600">{errors.phone.message}</p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1 block text-sm font-medium">예상 카테고리</label>
          <select
            {...register("category")}
            className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
          >
            <option value="">(선택)</option>
            {QUOTE_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {QUOTE_CATEGORY_EMOJIS[c]} {QUOTE_CATEGORY_LABELS[c]}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">지역</label>
          <input
            type="text"
            {...register("regionLabel")}
            placeholder="서울 강남구"
            className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
          />
        </div>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium">매장 소개</label>
        <textarea
          {...register("intro")}
          rows={3}
          maxLength={500}
          placeholder="매장 운영 기간, 위치, 특징 등을 간단히 적어주세요."
          className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
        />
        {errors.intro && (
          <p className="mt-1 text-xs text-red-600">{errors.intro.message}</p>
        )}
      </div>

      {submitError && (
        <div
          role="alert"
          className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-200"
        >
          {submitError}
        </div>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="w-full rounded-md bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
      >
        {isPending ? "신청 중…" : "신청 제출"}
      </button>

      <p className="text-center text-xs text-zinc-500">
        ⓘ 영업일 1-2일 내 검토 후 안내드립니다.
      </p>
    </form>
  );
}
