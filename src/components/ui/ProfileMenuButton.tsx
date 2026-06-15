"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged, signOut as firebaseSignOut } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { ChevronDown, LogIn, LogOut, Settings, User } from "lucide-react";
import { clientAuth, clientDb } from "@/lib/firebase/client";

interface ProfileState {
  displayName: string;
  /** 프로필 메뉴 부제에 보여줄 식별자 — username 우선, 없으면 실제 이메일. */
  subtitle: string;
  providerId: string | null;
}

async function readProfile(uid: string): Promise<ProfileState> {
  const snap = await getDoc(doc(clientDb, "users", uid));
  const data = snap.data() as
    | {
        displayName?: unknown;
        email?: unknown;
        username?: unknown;
        providerId?: unknown;
      }
    | undefined;

  const username =
    typeof data?.username === "string" && data.username.trim()
      ? data.username
      : "";
  const email = typeof data?.email === "string" ? data.email : "";

  return {
    displayName:
      typeof data?.displayName === "string" && data.displayName.trim()
        ? data.displayName
        : "사용자",
    subtitle: username || email,
    providerId:
      typeof data?.providerId === "string" ? data.providerId : null,
  };
}

function getInitial(name: string): string {
  return name.trim().charAt(0) || "U";
}

export function ProfileMenuButton() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [ready, setReady] = useState(false);
  const [profile, setProfile] = useState<ProfileState | null>(null);
  const [loggingOut, startLogout] = useTransition();
  const containerRef = useRef<HTMLDivElement | null>(null);

  async function handleLogout() {
    setOpen(false);
    startLogout(async () => {
      try {
        // 1. 클라이언트 Firebase Auth 로그아웃 (onAuthStateChanged 가 null 받도록)
        await firebaseSignOut(clientAuth);
      } catch (e) {
        console.warn("[logout] client signOut failed", e);
      }
      // 2. 서버 세션 쿠키 삭제 (fetch 로 호출 — redirect 미자동 따라감)
      try {
        await fetch("/logout", { method: "GET", redirect: "manual" });
      } catch (e) {
        console.warn("[logout] server cookie delete failed", e);
      }
      // 3. 로컬 상태 리셋 + 홈으로 이동 + 풀리로드
      setProfile(null);
      router.replace("/");
      router.refresh();
    });
  }

  useEffect(() => {
    const unsub = onAuthStateChanged(clientAuth, async (user) => {
      if (!user) {
        setProfile(null);
        setReady(true);
        return;
      }

      try {
        const next = await readProfile(user.uid);
        setProfile(next);
      } catch (e) {
        console.warn("[profile-menu] profile read failed:", e);
        // 레거시 합성 이메일 fallback: email 뒤의 @cheonggwang.auth 제거해 username 추출.
        const rawEmail = user.email ?? "";
        const isSynthetic = rawEmail.endsWith("@cheonggwang.auth");
        setProfile({
          displayName: user.displayName || "사용자",
          subtitle: isSynthetic ? rawEmail.split("@")[0] : rawEmail,
          providerId: null,
        });
      } finally {
        setReady(true);
      }
    });

    return () => unsub();
  }, []);

  useEffect(() => {
    function onPointerDown(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, []);

  const name = profile?.displayName ?? "로그인";
  const initial = getInitial(name);
  const infoHref = profile?.providerId ? "/provider/profile" : "/dashboard";

  return (
    <div ref={containerRef} className="relative flex items-center">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="flex items-center justify-center rounded-full border border-[#dbe8fb] bg-white p-1 text-zinc-700 shadow-sm transition-colors hover:bg-[#f7fbff] dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800 shrink-0"
      >
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#2563EB] text-[11px] font-bold text-white shadow-sm">
          {ready && profile ? initial : (
            <svg
              className="h-3.5 w-3.5 text-white"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
            </svg>
          )}
        </span>
      </button>

      {open ? (
        <div
          role="menu"
          className="absolute right-0 mt-2 w-64 overflow-hidden rounded-[24px] border border-[#dbe8fb] bg-white p-2 shadow-[0_18px_40px_rgba(43,102,246,0.14)] dark:border-zinc-800 dark:bg-zinc-950"
        >
          <div className="rounded-[18px] bg-[#f4f9ff] px-4 py-3 dark:bg-zinc-900">
            <p className="text-sm font-bold text-zinc-900 dark:text-zinc-50">
              {name}
            </p>
            <p className="mt-1 truncate text-xs text-zinc-500 dark:text-zinc-400">
              {profile?.subtitle || "로그인하고 내 정보와 활동을 확인해보세요"}
            </p>
          </div>

          <div className="mt-2 space-y-1">
            {profile ? (
              <>
                <Link
                  href={infoHref}
                  role="menuitem"
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-3 rounded-[18px] px-4 py-3 text-sm font-medium text-zinc-700 transition-colors hover:bg-[#f7fbff] dark:text-zinc-300 dark:hover:bg-zinc-900"
                >
                  {profile.providerId ? (
                    <Settings className="h-4 w-4 text-[#2563EB]" aria-hidden />
                  ) : (
                    <User className="h-4 w-4 text-[#2563EB]" aria-hidden />
                  )}
                  {profile.providerId ? "내 정보 수정" : "내 정보 보기"}
                </Link>
                <button
                  type="button"
                  role="menuitem"
                  onClick={handleLogout}
                  disabled={loggingOut}
                  className="flex w-full items-center gap-3 rounded-[18px] px-4 py-3 text-left text-sm font-medium text-zinc-700 transition-colors hover:bg-[#f7fbff] disabled:opacity-60 dark:text-zinc-300 dark:hover:bg-zinc-900"
                >
                  <LogOut className="h-4 w-4 text-rose-500" aria-hidden />
                  {loggingOut ? "로그아웃 중..." : "로그아웃"}
                </button>
              </>
            ) : (
              <Link
                href="/login"
                role="menuitem"
                onClick={() => setOpen(false)}
                className="flex items-center gap-3 rounded-[18px] px-4 py-3 text-sm font-medium text-zinc-700 transition-colors hover:bg-[#f7fbff] dark:text-zinc-300 dark:hover:bg-zinc-900"
              >
                <LogIn className="h-4 w-4 text-[#2563EB]" aria-hidden />
                로그인
              </Link>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
