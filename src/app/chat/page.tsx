import { Suspense } from "react";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import {
  SESSION_COOKIE_NAME,
  verifySessionCookie,
} from "@/lib/firebase/auth-admin";
import { userRepository } from "@/lib/firebase/user-repository";
import { ThreadsListClient } from "@/components/chat/ThreadsListClient";
import type { ThreadRole } from "@/types/chat";

import { BrandLogo } from "@/components/ui/BrandLogo";
import { ChevronLeft } from "lucide-react";
import Link from "next/link";

export const metadata = {
  title: "채팅 · 청광",
};

export default function ChatPage() {
  return (
    <div className="min-h-screen w-full bg-[linear-gradient(180deg,#f4f9ff_0%,#ffffff_18%,#ffffff_100%)] px-5 pt-3 pb-28 dark:bg-none">
      <header className="sticky top-0 z-40 -mx-5 mb-5 border-b border-white/70 bg-[#f4f9ff]/90 px-5 py-3 backdrop-blur dark:border-zinc-800/70 dark:bg-zinc-950/90">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Link
              href="/"
              className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/80 border border-zinc-200 text-zinc-600 hover:text-zinc-900 shadow-sm transition-all hover:scale-105 active:scale-95 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400"
              aria-label="홈으로 가기"
            >
              <ChevronLeft className="h-4.5 w-4.5" strokeWidth={2.5} />
            </Link>
            <BrandLogo />
          </div>
          <span className="rounded-full border border-[#d8e6ff] bg-white/80 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#2563EB]/80 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400">
            Chat
          </span>
        </div>
        <div className="mt-4 rounded-[28px] border border-[#dbe8fb] bg-[linear-gradient(135deg,#ffffff_0%,#eef6ff_46%,#dcebff_100%)] px-5 py-5 shadow-[0_14px_34px_rgba(43,102,246,0.08)] dark:border-zinc-850 dark:bg-gradient-to-br dark:from-zinc-900 dark:to-zinc-950">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#2563EB]/70 dark:text-zinc-400">
            Messages
          </p>
          <h1 className="mt-1 text-[26px] font-black tracking-tight text-zinc-950 dark:text-zinc-50">
            채팅방 목록
          </h1>
          <p className="mt-2 text-[13px] leading-5 text-zinc-650 dark:text-zinc-400">
            견적 조율 및 청소 일정 확정을 위한 실시간 상담을 받아보세요.
          </p>
        </div>
      </header>
      <Suspense fallback={<ListSkeleton />}>
        <ChatListBody />
      </Suspense>
    </div>
  );
}

function ListSkeleton() {
  return (
    <div className="space-y-2" aria-label="채팅 로딩 중">
      <div className="h-14 animate-pulse rounded-xl bg-zinc-100 dark:bg-zinc-900" />
      <div className="h-14 animate-pulse rounded-xl bg-zinc-100 dark:bg-zinc-900" />
    </div>
  );
}

async function ChatListBody() {
  const jar = await cookies();
  let uid: string;
  try {
    uid = await verifySessionCookie(jar.get(SESSION_COOKIE_NAME)?.value);
  } catch {
    redirect(`/login?next=${encodeURIComponent("/chat")}`);
  }

  const user = await userRepository.get(uid);
  const role: ThreadRole = user?.providerId ? "provider" : "client";

  return <ThreadsListClient uid={uid} role={role} />;
}
