"use client";

import Link from "next/link";
import { MessageCircle } from "lucide-react";

interface Props {
  role: "client" | "provider";
}

export function EmptyThreadsHint({ role }: Props) {
  return (
    <div className="flex flex-col items-center gap-4 rounded-xl border border-dashed border-zinc-300 p-8 text-center dark:border-zinc-700">
      <MessageCircle className="h-10 w-10 text-zinc-400" aria-hidden />
      <div>
        <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          아직 채팅이 없어요
        </p>
        <p className="mt-1 text-xs text-zinc-500">
          {role === "client"
            ? "청명의 견적이 오면 여기서 협의할 수 있어요"
            : "요청에 견적을 제출하면 채팅이 시작됩니다"}
        </p>
      </div>
      <Link
        href={role === "client" ? "/received" : "/provider/requests"}
        className="text-sm font-medium text-indigo-600 hover:underline dark:text-indigo-400"
      >
        {role === "client" ? "받은 견적 보기 →" : "받은 요청 보기 →"}
      </Link>
    </div>
  );
}
