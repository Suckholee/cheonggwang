"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { User, Lock, Phone, KeyRound } from "lucide-react";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  type AuthError,
} from "firebase/auth";
import { clientAuth } from "@/lib/firebase/client";
import { signInWithEmail } from "@/app/actions/auth-actions";
import {
  usernameToSyntheticEmail,
  validateUsername,
} from "@/lib/auth/username";

type Mode = "login" | "signup";

/**
 * v1.6 (post-merge) · 로그인/회원가입 폼.
 * 이메일 필드를 "아이디"로 교체. 내부적으로 Firebase Auth에는 합성 이메일
 * `{id}@cheonggwang.auth` 로 변환해 전달.
 *
 * 레거시 호환: 입력값에 `@` 가 포함돼 있으면 진짜 이메일로 간주해 그대로 사용.
 * (예전 실제 이메일로 가입된 유저가 로그인 가능하도록.)
 */
export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = searchParams.get("next") ?? "/dashboard";
  // ?mode=signup 힌트 — /signup-partner 등 회원가입을 우선 유도하는 진입점에서 사용
  const initialMode: Mode =
    searchParams.get("mode") === "signup" ? "signup" : "login";

  const [mode, setMode] = useState<Mode>(initialMode);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  // Phone verification states
  const [phone, setPhone] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [smsSent, setSmsSent] = useState(false);
  const [phoneVerified, setPhoneVerified] = useState(false);
  const [confirmationResult, setConfirmationResult] = useState<any>(null);
  const [smsSending, setSmsSending] = useState(false);
  const [codeConfirming, setCodeConfirming] = useState(false);

  async function handleSendSms() {
    setError(null);
    setSmsSending(true);

    try {
      if (!username || !password) {
        throw new Error("아이디와 비밀번호를 먼저 입력해 주세요");
      }
      if (password.length < 8) {
        throw new Error("비밀번호는 8자 이상이어야 합니다");
      }
      if (!phone.match(/^[0-9]{2,4}-?[0-9]{3,4}-?[0-9]{4}$/)) {
        throw new Error("올바른 휴대폰 번호(010-XXXX-XXXX)를 입력해 주세요");
      }

      const syntheticEmail = resolveEmailForFirebase(username, "signup");
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
      setError(null);
      alert("인증번호가 발송되었습니다. 문자를 확인해 주세요.");
    } catch (err: any) {
      console.error("[phone-auth] Send SMS error:", err);
      setError(readableFirebaseAuthError(err.code) || err.message);
    } finally {
      setSmsSending(false);
    }
  }

  async function handleVerifyCode() {
    setError(null);
    setCodeConfirming(true);

    try {
      if (!verificationCode || verificationCode.length !== 6) {
        throw new Error("6자리 인증번호를 입력해 주세요");
      }
      if (!confirmationResult) {
        throw new Error("인증번호 발송을 먼저 진행해 주세요");
      }

      await confirmationResult.confirm(verificationCode);
      setPhoneVerified(true);
      setError(null);
      alert("휴대폰 인증이 성공적으로 완료되었습니다!");
    } catch (err: any) {
      console.error("[phone-auth] Confirm code error:", err);
      setError("인증번호가 일치하지 않거나 만료되었습니다. 다시 시도해 주세요.");
    } finally {
      setCodeConfirming(false);
    }
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    if (mode === "signup" && !phoneVerified) {
      setError("휴대폰 인증을 먼저 완료해 주세요");
      return;
    }

    try {
      let idToken: string;
      if (mode === "signup") {
        const user = clientAuth.currentUser;
        if (!user) {
          throw new Error("가입 세션이 유효하지 않습니다. 다시 시도해 주세요.");
        }
        idToken = await user.getIdToken();
      } else {
        let emailForFirebase: string;
        try {
          emailForFirebase = resolveEmailForFirebase(username, mode);
        } catch (err) {
          setError(err instanceof Error ? err.message : "아이디를 확인해 주세요");
          return;
        }
        const cred = await signInWithEmailAndPassword(
          clientAuth,
          emailForFirebase,
          password,
        );
        idToken = await cred.user.getIdToken();
      }

      startTransition(async () => {
        const result = await signInWithEmail(idToken);
        if (!result.ok) {
          setError(result.message);
          return;
        }
        router.replace(nextPath);
        router.refresh();
      });
    } catch (err: any) {
      setError(readableFirebaseAuthError(err.code));
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex w-full flex-col gap-4 px-0.5"
    >
      <div id="recaptcha-container"></div>

      {/* Segmented Control Switcher */}
      <div className="flex gap-1 rounded-lg bg-zinc-100 p-1 dark:bg-zinc-900/60">
        <div
          role="button"
          tabIndex={0}
          onClick={() => setMode("login")}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              setMode("login");
            }
          }}
          className={`flex-1 text-center rounded-md py-1.5 text-[13.5px] font-semibold cursor-pointer select-none transition-all duration-200 outline-none ${
            mode === "login"
              ? "bg-white text-zinc-900 shadow-[0_1px_3px_rgba(0,0,0,0.08)] dark:bg-zinc-800 dark:text-white"
              : "text-zinc-550 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
          }`}
        >
          로그인
        </div>
        <div
          role="button"
          tabIndex={0}
          onClick={() => setMode("signup")}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              setMode("signup");
            }
          }}
          className={`flex-1 text-center rounded-md py-1.5 text-[13.5px] font-semibold cursor-pointer select-none transition-all duration-200 outline-none ${
            mode === "signup"
              ? "bg-white text-zinc-900 shadow-[0_1px_3px_rgba(0,0,0,0.08)] dark:bg-zinc-800 dark:text-white"
              : "text-zinc-550 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
          }`}
        >
          회원가입
        </div>
      </div>

      <div className="mt-1 flex flex-col gap-3.5">
        <label className="flex flex-col gap-1.5">
          <span className="ml-0.5 text-[12.5px] font-semibold text-zinc-600 dark:text-zinc-350">
            아이디
          </span>
          <div className="relative">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400 dark:text-zinc-500">
              <User className="h-4 w-4" />
            </span>
            <input
              type="text"
              required
              disabled={mode === "signup" && phoneVerified}
              autoComplete="username"
              inputMode="text"
              placeholder={mode === "signup" ? "영문·숫자·_ (4-20자)" : "아이디 입력"}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full rounded-xl border border-zinc-200/80 bg-white pl-10 pr-4 py-3 text-[14px] outline-none transition-colors focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB] dark:border-zinc-800 dark:bg-zinc-900 dark:focus:border-[#5B8DF6] dark:focus:ring-[#5B8DF6] disabled:bg-zinc-50 dark:disabled:bg-zinc-950"
            />
          </div>
          {mode === "signup" && (
            <span className="ml-0.5 text-[11px] text-zinc-400 dark:text-zinc-500">
              영문 소문자로 시작 · 영문·숫자·_ 사용 가능
            </span>
          )}
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="ml-0.5 text-[12.5px] font-semibold text-zinc-600 dark:text-zinc-350">
            비밀번호
          </span>
          <div className="relative">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400 dark:text-zinc-500">
              <Lock className="h-4 w-4" />
            </span>
            <input
              type="password"
              required
              minLength={6}
              disabled={mode === "signup" && phoneVerified}
              placeholder={mode === "signup" ? "8자 이상 입력" : "비밀번호 입력"}
              autoComplete={
                mode === "signup" ? "new-password" : "current-password"
              }
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-xl border border-zinc-200/80 bg-white pl-10 pr-4 py-3 text-[14px] outline-none transition-colors focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB] dark:border-zinc-800 dark:bg-zinc-900 dark:focus:border-[#5B8DF6] dark:focus:ring-[#5B8DF6] disabled:bg-zinc-50 dark:disabled:bg-zinc-950"
            />
          </div>
        </label>

        {mode === "signup" && (
          <>
            <div className="flex flex-col gap-1.5">
              <span className="ml-0.5 text-[12.5px] font-semibold text-zinc-650 dark:text-zinc-300">
                휴대폰 번호
              </span>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400 dark:text-zinc-500">
                    <Phone className="h-4 w-4" />
                  </span>
                  <input
                    type="tel"
                    required
                    disabled={phoneVerified}
                    placeholder="010-1234-5678"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full rounded-xl border border-zinc-200/80 bg-white pl-10 pr-4 py-3 text-[14px] outline-none transition-colors focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB] dark:border-zinc-800 dark:bg-zinc-900 dark:focus:border-[#5B8DF6] dark:focus:ring-[#5B8DF6] disabled:bg-zinc-50 dark:disabled:bg-zinc-950"
                  />
                </div>
                <button
                  type="button"
                  disabled={phoneVerified || smsSending}
                  onClick={handleSendSms}
                  className="shrink-0 rounded-xl border border-zinc-300 bg-zinc-50 px-4 py-2.5 text-sm font-semibold text-zinc-700 transition-all hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-850 disabled:opacity-50"
                >
                  {smsSending ? "전송 중..." : smsSent ? "재전송" : "인증 요청"}
                </button>
              </div>
            </div>

            {smsSent && (
              <div className="flex flex-col gap-1.5">
                <span className="ml-0.5 text-[12.5px] font-semibold text-zinc-650 dark:text-zinc-300">
                  인증번호 입력
                </span>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400 dark:text-zinc-500">
                      <KeyRound className="h-4 w-4" />
                    </span>
                    <input
                      type="text"
                      required
                      disabled={phoneVerified}
                      maxLength={6}
                      placeholder="6자리 인증번호"
                      value={verificationCode}
                      onChange={(e) => setVerificationCode(e.target.value)}
                      className="w-full rounded-xl border border-zinc-200/80 bg-white pl-10 pr-4 py-3 text-[14px] outline-none transition-colors focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB] dark:border-zinc-800 dark:bg-zinc-900 dark:focus:border-[#5B8DF6] dark:focus:ring-[#5B8DF6] disabled:bg-zinc-50 dark:disabled:bg-zinc-950"
                    />
                  </div>
                  <button
                    type="button"
                    disabled={phoneVerified || codeConfirming}
                    onClick={handleVerifyCode}
                    className="shrink-0 rounded-xl bg-indigo-650 px-4 py-2.5 text-sm font-semibold text-white transition-all hover:bg-indigo-700 active:scale-95 disabled:opacity-50"
                  >
                    {codeConfirming ? "확인 중..." : phoneVerified ? "인증 완료" : "인증 확인"}
                  </button>
                </div>
              </div>
            )}

            {phoneVerified && (
              <p className="ml-1 text-[13px] font-bold text-emerald-600 dark:text-emerald-400">
                ✓ 휴대폰 인증이 완료되었습니다.
              </p>
            )}
          </>
        )}
      </div>

      {error && (
        <p className="rounded-[12px] bg-red-50 px-4 py-3 text-[13px] font-medium text-red-600 dark:bg-red-950/50 dark:text-red-400">
          ⚠️ {error}
        </p>
      )}

      {mode === "login" && (
        <p className="text-center text-[12px] text-zinc-500 dark:text-zinc-400">
          로그인이 어려우신가요?{" "}
          <a
            href="mailto:help@cheonggwang.kr?subject=로그인 문의"
            className="font-semibold text-[#2563EB] hover:underline dark:text-[#5B8DF6]"
          >
            운영팀에 문의하기
          </a>
        </p>
      )}

      <button
        type="submit"
        disabled={pending || (mode === "signup" && !phoneVerified)}
        style={{
          backgroundColor: "#2563EB",
          boxShadow: "0 4px 12px rgba(37, 99, 235, 0.15)",
        }}
        className="mt-2 rounded-xl px-4 py-2.5 text-[15px] font-bold text-white transition-all duration-200 hover:bg-blue-700 hover:opacity-95 active:scale-[0.98] disabled:opacity-50 dark:text-white"
      >
        {pending
          ? "처리 중..."
          : mode === "signup"
            ? "가입하고 시작하기"
            : "로그인"}
      </button>

      <div className="mt-1 pt-3 border-t border-zinc-100 dark:border-zinc-900/60 text-center text-[13px]">
        <span className="text-zinc-400 dark:text-zinc-500 block mb-1">
          청소 업체를 운영하시나요?
        </span>
        <Link
          href="/signup-provider"
          className="font-bold text-[#2563EB] hover:underline dark:text-[#5B8DF6]"
        >
          청명 파트너로 가입하기 →
        </Link>
      </div>
    </form>
  );
}

/**
 * 입력값이 이메일 형식(`@` 포함)이면 그대로 Firebase에 전달 (레거시 유저 호환).
 * 그 외엔 아이디로 취급해 형식 검증 후 합성 이메일로 변환.
 * 가입 모드에선 아이디 형식을 엄격히 강제.
 */
function resolveEmailForFirebase(rawInput: string, mode: Mode): string {
  const trimmed = rawInput.trim();
  if (!trimmed) {
    throw new Error("아이디를 입력해 주세요");
  }
  if (trimmed.includes("@")) {
    // 레거시 실제 이메일 로그인 경로 — 가입에선 불허
    if (mode === "signup") {
      throw new Error("아이디에는 @ 를 포함할 수 없어요");
    }
    return trimmed.toLowerCase();
  }
  const normalized = validateUsername(trimmed);
  return usernameToSyntheticEmail(normalized);
}

function readableFirebaseAuthError(code: string | undefined): string {
  switch (code) {
    case "auth/invalid-email":
      return "아이디 형식이 올바르지 않습니다";
    case "auth/user-not-found":
    case "auth/wrong-password":
    case "auth/invalid-credential":
      return "아이디 또는 비밀번호가 올바르지 않습니다";
    case "auth/email-already-in-use":
      return "이미 사용 중인 아이디입니다";
    case "auth/weak-password":
      return "비밀번호는 6자 이상이어야 합니다";
    case "auth/too-many-requests":
      return "잠시 후 다시 시도해주세요";
    default:
      return code ?? "로그인에 실패했습니다";
  }
}
