"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { signOut as firebaseSignOut } from "firebase/auth";
import { clientAuth } from "@/lib/firebase/client";

/**
 * v1.6 — 클라이언트 + 서버 양쪽 로그아웃.
 *  1. Firebase Auth SDK signOut (클라이언트 auth state 해제)
 *  2. GET /logout (서버 세션 쿠키 삭제)
 *  3. 홈으로 리다이렉트 + refresh
 *
 * 이전 구현은 서버 쿠키만 삭제해서 `onAuthStateChanged` 가 여전히 로그인 상태를 보고함.
 */
interface Props {
  className?: string;
  children?: React.ReactNode;
  redirectTo?: string;
}

export function LogoutButton({
  className = "",
  children = "로그아웃",
  redirectTo = "/",
}: Props) {
  const router = useRouter();
  const [pending, start] = useTransition();

  function handleClick() {
    start(async () => {
      try {
        await firebaseSignOut(clientAuth);
      } catch (e) {
        console.warn("[logout] client signOut failed", e);
      }
      try {
        await fetch("/logout", { method: "GET", redirect: "manual" });
      } catch (e) {
        console.warn("[logout] server cookie delete failed", e);
      }
      router.replace(redirectTo);
      router.refresh();
    });
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={pending}
      className={className}
    >
      {pending ? "로그아웃 중..." : children}
    </button>
  );
}
