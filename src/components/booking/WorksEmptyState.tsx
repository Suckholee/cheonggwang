"use client";

import Link from "next/link";
import { ClipboardCheck } from "lucide-react";

export function WorksEmptyState() {
  return (
    <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-zinc-300 p-8 text-center dark:border-zinc-700">
      <ClipboardCheck className="h-10 w-10 text-zinc-400" aria-hidden />
      <div>
        <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          아직 확정된 일정이 없어요
        </p>
        <p className="mt-1 text-xs text-zinc-500">
          고객과 채팅에서 일정을 확정해 보세요
        </p>
      </div>
      <Link
        href="/provider/requests"
        className="text-sm font-medium text-indigo-600 hover:underline dark:text-indigo-400"
      >
        받은 요청 보기 →
      </Link>
    </div>
  );
}
