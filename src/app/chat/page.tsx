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

export const metadata = {
  title: "채팅 · 청광",
};

export default function ChatPage() {
  return (
    <div className="mx-auto min-h-screen max-w-xl px-4 py-6 pb-24">
      <header className="mb-4">
        <h1 className="text-xl font-bold">채팅</h1>
        <p className="mt-1 text-xs text-zinc-500">견적에 대해 협의해 보세요</p>
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
