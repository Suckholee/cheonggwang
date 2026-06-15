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
import { Search } from "lucide-react";
import Link from "next/link";

export const metadata = {
  title: "채팅 · 청광",
};

export default function ChatPage() {
  return (
    <div className="min-h-screen w-full bg-[linear-gradient(180deg,#f4f9ff_0%,#ffffff_18%,#ffffff_100%)] px-4 pt-2 pb-28 dark:bg-none">
      <header className="sticky top-0 z-40 -mx-4 mb-3 border-b border-zinc-200/40 bg-[#f4f9ff]/95 px-4 py-3.5 backdrop-blur dark:border-zinc-850 dark:bg-zinc-950/95">
        <div className="flex items-center justify-between">
          <BrandLogo />
          <Link
            href="/search"
            className="flex h-8 w-8 items-center justify-center rounded-xl bg-white border border-zinc-200 text-zinc-600 hover:text-zinc-900 shadow-sm transition-all hover:scale-105 active:scale-95 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200"
            aria-label="검색"
          >
            <Search className="h-4.5 w-4.5" strokeWidth={2.3} />
          </Link>
        </div>
      </header>
      
      <div className="px-0.5 mb-4.5 pt-0.5">
        <h1 className="text-[20px] font-black tracking-tight text-zinc-950 dark:text-zinc-50">
          채팅
        </h1>
        <p className="mt-1 text-[13px] leading-relaxed text-zinc-500 dark:text-zinc-400">
          견적과 일정을 업체와 조율하세요.
        </p>
      </div>

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
