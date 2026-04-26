"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { onAuthStateChanged, type User } from "firebase/auth";
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
 * v1.10 partner-application — 매장 정보만 입력 폼.
 *
 *  cycle #23 변경:
 *    - 사용자가 이미 로그인된 client 상태 (페이지 진입 가드에서 보장)
 *    - clientAuth.currentUser?.getIdToken() 으로 토큰 가져와 server action 호출
 *    - server action(submitPartnerApplication)은 cycle #21 그대로 — verifyIdToken + applicants/users TX 머지
 */

export function PartnerSignupForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(clientAuth, (u) => setUser(u));
    return () => unsub();
  }, []);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<PartnerApplicationFormInput>({
    resolver: zodResolver(partnerApplicationFormSchema),
    defaultValues: {
      businessName: "",
      phone: "",
      category: undefined,
      regionLabel: "",
      intro: "",
    },
  });

  async function onSubmit(data: PartnerApplicationFormInput) {
    setSubmitError(null);

    if (!user) {
      setSubmitError("로그인 세션이 만료되었습니다. 다시 로그인해 주세요.");
      router.push("/login?next=/signup-partner");
      return;
    }

    let idToken: string;
    try {
      idToken = await user.getIdToken(/* forceRefresh */ true);
    } catch {
      setSubmitError("인증 정보를 가져오지 못했습니다. 다시 시도해 주세요.");
      return;
    }

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
      {/* 현재 로그인 계정 표시 */}
      {user ? (
        <div className="rounded-md bg-zinc-50 px-3 py-2 text-xs text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
          <span className="font-medium">로그인 계정:</span> {user.email}
        </div>
      ) : null}

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
        disabled={isPending || !user}
        className="w-full rounded-md bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
      >
        {isPending ? "신청 중…" : "파트너 등록 신청"}
      </button>

      <p className="text-center text-xs text-zinc-500">
        ⓘ 영업일 1-2일 내 검토 후 안내드립니다.
      </p>
    </form>
  );
}
