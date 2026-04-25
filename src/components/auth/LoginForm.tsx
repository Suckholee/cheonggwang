"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
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

  const [mode, setMode] = useState<Mode>("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    let emailForFirebase: string;
    try {
      emailForFirebase = resolveEmailForFirebase(username, mode);
    } catch (err) {
      setError(err instanceof Error ? err.message : "아이디를 확인해 주세요");
      return;
    }

    try {
      const cred =
        mode === "signup"
          ? await createUserWithEmailAndPassword(
              clientAuth,
              emailForFirebase,
              password,
            )
          : await signInWithEmailAndPassword(
              clientAuth,
              emailForFirebase,
              password,
            );

      const idToken = await cred.user.getIdToken();

      startTransition(async () => {
        const result = await signInWithEmail(idToken);
        if (!result.ok) {
          setError(result.message);
          return;
        }
        router.replace(nextPath);
        router.refresh();
      });
    } catch (err) {
      const authErr = err as AuthError;
      setError(readableFirebaseAuthError(authErr.code));
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex w-full w-full flex-col gap-5 px-1"
    >
      <div className="flex gap-2 rounded-xl bg-zinc-100 p-1 dark:bg-zinc-900">
        <button
          type="button"
          onClick={() => setMode("login")}
          className={`flex-1 rounded-lg px-3 py-2.5 text-[15px] font-bold transition-all ${
            mode === "login"
              ? "bg-white text-zinc-900 shadow-sm dark:bg-zinc-800 dark:text-white"
              : "text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
          }`}
        >
          로그인
        </button>
        <button
          type="button"
          onClick={() => setMode("signup")}
          className={`flex-1 rounded-lg px-3 py-2.5 text-[15px] font-bold transition-all ${
            mode === "signup"
              ? "bg-white text-zinc-900 shadow-sm dark:bg-zinc-800 dark:text-white"
              : "text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
          }`}
        >
          회원가입
        </button>
      </div>

      <div className="mt-2 flex flex-col gap-4">
        <label className="flex flex-col gap-1.5">
          <span className="ml-1 text-[13px] font-bold text-zinc-700 dark:text-zinc-300">
            아이디
          </span>
          <input
            type="text"
            required
            autoComplete="username"
            inputMode="text"
            placeholder={mode === "signup" ? "영문·숫자·_ (4-20자)" : "아이디"}
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="rounded-[16px] border border-zinc-200 bg-white px-4 py-3.5 text-[15px] outline-none transition-colors focus:border-[#2B66F6] focus:ring-1 focus:ring-[#2B66F6] dark:border-zinc-800 dark:bg-zinc-900 dark:focus:border-[#5B8DF6] dark:focus:ring-[#5B8DF6]"
          />
          {mode === "signup" && (
            <span className="ml-1 text-[11px] text-zinc-500">
              영문 소문자로 시작 · 영문·숫자·_ 사용 가능
            </span>
          )}
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="ml-1 text-[13px] font-bold text-zinc-700 dark:text-zinc-300">
            비밀번호
          </span>
          <input
            type="password"
            required
            minLength={6}
            placeholder="6자 이상"
            autoComplete={
              mode === "signup" ? "new-password" : "current-password"
            }
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="rounded-[16px] border border-zinc-200 bg-white px-4 py-3.5 text-[15px] outline-none transition-colors focus:border-[#2B66F6] focus:ring-1 focus:ring-[#2B66F6] dark:border-zinc-800 dark:bg-zinc-900 dark:focus:border-[#5B8DF6] dark:focus:ring-[#5B8DF6]"
          />
        </label>
      </div>

      {error && (
        <p className="rounded-[12px] bg-red-50 px-4 py-3 text-[13px] font-medium text-red-600 dark:bg-red-950/50 dark:text-red-400">
          ⚠️ {error}
        </p>
      )}

      {mode === "login" && (
        <p className="text-center text-[12px] text-zinc-500 dark:text-zinc-400">
          비밀번호를 잊으셨나요?{" "}
          <a
            href="mailto:help@cheonggwang.app?subject=비밀번호 재설정 요청"
            className="font-semibold text-[#2B66F6] hover:underline dark:text-[#5B8DF6]"
          >
            운영팀에 문의
          </a>
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="mt-2 rounded-[16px] bg-[#2B66F6] px-4 py-3.5 text-[16px] font-bold text-white transition-all hover:bg-blue-700 active:scale-[0.98] disabled:opacity-50 dark:bg-[#2B66F6] dark:text-white"
      >
        {pending
          ? "처리 중..."
          : mode === "signup"
            ? "가입하고 시작하기"
            : "로그인"}
      </button>

      <div className="mt-4 pt-4 text-center text-[14px]">
        <span className="text-zinc-500 dark:text-zinc-400">
          청소 업체를 운영하시나요?
        </span>{" "}
        <Link
          href="/signup-provider"
          className="font-bold text-[#2B66F6] hover:underline dark:text-[#5B8DF6]"
        >
          청명으로 가입 →
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
