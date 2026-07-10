"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  createUserWithEmailAndPassword,
  type AuthError,
} from "firebase/auth";
import { clientAuth } from "@/lib/firebase/client";
import {
  providerSignupFormSchema,
  type ProviderSignupFormInput,
} from "@/domain/provider-signup-schema";
import {
  QUOTE_CATEGORIES,
  QUOTE_CATEGORY_EMOJIS,
  QUOTE_CATEGORY_LABELS,
} from "@/domain/quote-category";
import { registerProvider } from "@/app/actions/provider-signup-actions";
import { usernameToSyntheticEmail } from "@/lib/auth/username";

export function ProviderSignupForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Phone verification states
  const [smsSent, setSmsSent] = useState(false);
  const [phoneVerified, setPhoneVerified] = useState(false);
  const [confirmationResult, setConfirmationResult] = useState<any>(null);
  const [smsSending, setSmsSending] = useState(false);
  const [codeConfirming, setCodeConfirming] = useState(false);
  const [verificationCode, setVerificationCode] = useState("");

  const {
    register,
    handleSubmit,
    getValues,
    trigger,
    formState: { errors },
  } = useForm<ProviderSignupFormInput>({
    resolver: zodResolver(providerSignupFormSchema),
    defaultValues: {
      username: "",
      password: "",
      passwordConfirm: "",
      companyName: "",
      primaryCategory: "residential",
      contactPhone: "",
      termsAgreed: undefined as unknown as true,
      marketingAgreed: false,
    },
  });

  async function handleSendSms() {
    setSubmitError(null);
    const isValid = await trigger(["username", "password", "passwordConfirm", "companyName", "contactPhone"]);
    if (!isValid) return;

    setSmsSending(true);

      if (process.env.NODE_ENV === "development") {
        const username = getValues("username");
        const password = getValues("password");
        const syntheticEmail = usernameToSyntheticEmail(username);
        
        let user = clientAuth.currentUser;
        if (user && user.email !== syntheticEmail) {
          await clientAuth.signOut();
          user = null;
        }

        if (!user) {
          await createUserWithEmailAndPassword(clientAuth, syntheticEmail, password);
        }

        setSmsSent(true);
        alert("[개발 모드] SMS 전송이 생략되었습니다. 인증번호에 아무 숫자나 6자리 입력 후 확인을 눌러주세요.");
        setSmsSending(false);
        return;
      }

      const username = getValues("username");
      const password = getValues("password");
      const phone = getValues("contactPhone");

      const syntheticEmail = usernameToSyntheticEmail(username);
      const { toE164 } = await import("@/lib/format/phone");
      const e164Phone = toE164(phone);

      const { RecaptchaVerifier, linkWithPhoneNumber } = await import("firebase/auth");
      
      let user = clientAuth.currentUser;
      if (user && user.email !== syntheticEmail) {
        await clientAuth.signOut();
        user = null;
      }

      if (!user) {
        const cred = await createUserWithEmailAndPassword(clientAuth, syntheticEmail, password);
        user = cred.user;
      }

      let verifier = (window as any).recaptchaVerifier;
      if (!verifier) {
        verifier = new RecaptchaVerifier(clientAuth, "recaptcha-container", {
          size: "invisible",
        });
        (window as any).recaptchaVerifier = verifier;
      }

      const confirmation = await linkWithPhoneNumber(user, e164Phone, verifier);
      setConfirmationResult(confirmation);
      setSmsSent(true);
      alert("인증번호가 발송되었습니다. 문자를 확인해 주세요.");
    } catch (err: any) {
      console.error("[provider-phone-auth] Send SMS error:", err);
      setSubmitError(readableFirebaseAuthError(err.code) || err.message);
    } finally {
      setSmsSending(false);
    }
  }

  async function handleVerifyCode() {
    setSubmitError(null);
    setCodeConfirming(true);

    try {
      if (!verificationCode || verificationCode.length !== 6) {
        throw new Error("6자리 인증번호를 입력해 주세요");
      }
      if (process.env.NODE_ENV === "development") {
        setPhoneVerified(true);
        alert("[개발 모드] 휴대폰 인증이 성공적으로 완료되었습니다!");
        setCodeConfirming(false);
        return;
      }

      if (!confirmationResult) {
        throw new Error("인증번호 발송을 먼저 진행해 주세요");
      }

      await confirmationResult.confirm(verificationCode);
      setPhoneVerified(true);
      alert("휴대폰 인증이 성공적으로 완료되었습니다!");
    } catch (err: any) {
      console.error("[provider-phone-auth] Confirm code error:", err);
      setSubmitError("인증번호가 일치하지 않거나 만료되었습니다. 다시 시도해 주세요.");
    } finally {
      setCodeConfirming(false);
    }
  }

  async function onSubmit(data: ProviderSignupFormInput) {
    setSubmitError(null);

    if (!phoneVerified) {
      setSubmitError("휴대폰 인증을 먼저 완료해 주세요");
      return;
    }

    try {
      const user = clientAuth.currentUser;
      if (!user) {
        throw new Error("가입 세션이 유효하지 않습니다. 다시 시도해 주세요.");
      }

      const idToken = await user.getIdToken();

      startTransition(async () => {
        const result = await registerProvider({
          idToken,
          companyName: data.companyName,
          primaryCategory: data.primaryCategory,
          contactPhone: data.contactPhone,
          marketingAgreed: data.marketingAgreed,
        });

        if (result.ok) {
          router.replace("/provider/profile");
          router.refresh();
        } else {
          setSubmitError(result.message);
        }
      });
    } catch (err: any) {
      setSubmitError(readableFirebaseAuthError(err.code) || err.message);
    }
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="flex w-full max-w-md flex-col gap-4 rounded-lg border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950"
    >
      <div id="recaptcha-container"></div>

      <Field
        label="아이디"
        hint="영문 소문자로 시작 · 영문/숫자/_ (4-20자)"
        error={errors.username?.message}
      >
        <input
          {...register("username")}
          type="text"
          disabled={phoneVerified}
          autoComplete="username"
          inputMode="text"
          placeholder="sebombhome"
          className="w-full rounded border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-900 disabled:bg-zinc-50 dark:disabled:bg-zinc-950"
        />
      </Field>

      <Field
        label="비밀번호"
        hint="8자 이상"
        error={errors.password?.message}
      >
        <input
          {...register("password")}
          type="password"
          disabled={phoneVerified}
          autoComplete="new-password"
          className="w-full rounded border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-900 disabled:bg-zinc-50 dark:disabled:bg-zinc-950"
        />
      </Field>

      <Field
        label="비밀번호 확인"
        error={errors.passwordConfirm?.message}
      >
        <input
          {...register("passwordConfirm")}
          type="password"
          disabled={phoneVerified}
          autoComplete="new-password"
          className="w-full rounded border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-900 disabled:bg-zinc-50 dark:disabled:bg-zinc-950"
        />
      </Field>

      <Field label="업체명" error={errors.companyName?.message}>
        <input
          {...register("companyName")}
          type="text"
          maxLength={40}
          disabled={phoneVerified}
          placeholder="예: 새봄홈서비스"
          className="w-full rounded border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-900 disabled:bg-zinc-50 dark:disabled:bg-zinc-950"
        />
      </Field>

      <Field
        label="대표 카테고리"
        hint="가입 후 편집에서 추가 가능"
        error={errors.primaryCategory?.message}
      >
        <select
          {...register("primaryCategory")}
          disabled={phoneVerified}
          className="w-full rounded border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-900 disabled:bg-zinc-50 dark:disabled:bg-zinc-950"
        >
          {QUOTE_CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {QUOTE_CATEGORY_EMOJIS[c]} {QUOTE_CATEGORY_LABELS[c]}
            </option>
          ))}
        </select>
      </Field>

      <div className="flex flex-col gap-1.5">
        <span className="flex items-baseline justify-between text-sm font-medium">
          <span>전화번호</span>
          <span className="text-xs font-normal text-zinc-500">010-1234-5678 형식</span>
        </span>
        <div className="flex gap-2">
          <input
            {...register("contactPhone")}
            type="tel"
            disabled={phoneVerified}
            placeholder="010-1234-5678"
            className="flex-1 rounded border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-900 disabled:bg-zinc-50 dark:disabled:bg-zinc-950"
          />
          <button
            type="button"
            disabled={phoneVerified || smsSending}
            onClick={handleSendSms}
            className="shrink-0 rounded border border-zinc-300 bg-zinc-50 px-4 py-2 text-sm font-semibold text-zinc-700 transition-all hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-850 disabled:opacity-50"
          >
            {smsSending ? "전송 중..." : smsSent ? "재전송" : "인증 요청"}
          </button>
        </div>
        {errors.contactPhone?.message && (
          <span className="text-xs text-red-600">{errors.contactPhone.message}</span>
        )}
      </div>

      {smsSent && (
        <div className="flex flex-col gap-1.5">
          <span className="text-sm font-medium">인증번호 입력</span>
          <div className="flex gap-2">
            <input
              type="text"
              required
              disabled={phoneVerified}
              maxLength={6}
              placeholder="6자리 인증번호"
              value={verificationCode}
              onChange={(e) => setVerificationCode(e.target.value)}
              className="flex-1 rounded border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-900 disabled:bg-zinc-50 dark:disabled:bg-zinc-950"
            />
            <button
              type="button"
              disabled={phoneVerified || codeConfirming}
              onClick={handleVerifyCode}
              className="shrink-0 rounded bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition-all hover:bg-indigo-700 active:scale-95 disabled:opacity-50"
            >
              {codeConfirming ? "확인 중..." : phoneVerified ? "인증 완료" : "인증 확인"}
            </button>
          </div>
        </div>
      )}

      {phoneVerified && (
        <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
          ✓ 휴대폰 인증이 완료되었습니다.
        </p>
      )}

      <label className="flex items-start gap-2 text-sm">
        <input
          {...register("termsAgreed")}
          type="checkbox"
          className="mt-0.5 h-4 w-4 rounded border-zinc-300"
        />
        <span className="text-zinc-700 dark:text-zinc-300">
          <Link
            href="/terms"
            target="_blank"
            className="text-indigo-600 underline dark:text-indigo-400"
          >
            서비스 이용약관
          </Link>
          {" · "}
          <Link
            href="/privacy"
            target="_blank"
            className="text-indigo-600 underline dark:text-indigo-400"
          >
            개인정보 처리방침
          </Link>
          에 동의합니다 (필수)
        </span>
      </label>
      {errors.termsAgreed?.message && (
        <p className="text-xs text-red-600">{errors.termsAgreed.message}</p>
      )}

      <label className="flex items-start gap-2 text-sm">
        <input
          {...register("marketingAgreed")}
          type="checkbox"
          className="mt-0.5 h-4 w-4 rounded border-zinc-300"
        />
        <span className="text-zinc-600 dark:text-zinc-400">
          마케팅 정보 수신 동의 (선택)
        </span>
      </label>

      {submitError && (
        <p className="rounded bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
          {submitError}
        </p>
      )}

      <button
        type="submit"
        disabled={isPending || !phoneVerified}
        className="rounded bg-indigo-600 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-indigo-700 disabled:opacity-50"
      >
        {isPending ? "가입 중..." : "청명으로 가입하기"}
      </button>

      <div className="border-t border-zinc-200 pt-4 text-center text-sm dark:border-zinc-800">
        <span className="text-zinc-600 dark:text-zinc-400">
          이미 가입하셨나요?
        </span>{" "}
        <Link
          href="/login"
          className="font-medium text-zinc-900 hover:underline dark:text-zinc-100"
        >
          로그인 →
        </Link>
      </div>
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

function readableFirebaseAuthError(code: string | undefined): string {
  switch (code) {
    case "auth/invalid-email":
      return "아이디 형식이 올바르지 않습니다";
    case "auth/email-already-in-use":
      return "이미 사용 중인 아이디입니다. 로그인 페이지로 이동해주세요.";
    case "auth/weak-password":
      return "비밀번호가 너무 약합니다 (8자 이상 권장)";
    case "auth/too-many-requests":
      return "요청이 많습니다. 잠시 후 다시 시도해주세요";
    case "auth/network-request-failed":
      return "네트워크 오류입니다. 연결 상태를 확인해주세요";
    default:
      return code ?? "가입 중 오류가 발생했습니다";
  }
}
