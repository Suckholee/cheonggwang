"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { RotateCcw, PenSquare } from "lucide-react";

interface Props {
  hasFilter: boolean;
}

export function EmptyFeed({ hasFilter }: Props) {
  const router = useRouter();

  function handleReset() {
    router.replace("/discover");
  }

  if (hasFilter) {
    return (
      <div className="flex flex-col items-center gap-4 px-6 py-20 text-center">
        <p className="text-4xl" aria-hidden>
          🔎
        </p>
        <div className="space-y-1.5">
          <h2 className="text-[17px] font-bold text-zinc-900 dark:text-zinc-50">
            아직 조건에 맞는 게시글이 없어요
          </h2>
          <p className="text-[13px] leading-5 text-zinc-500 dark:text-zinc-400">
            지역이나 업종을 바꿔보거나
            <br />
            직접 견적 요청을 남겨보세요.
          </p>
        </div>
        <div className="mt-2 flex items-center gap-2">
          <button
            type="button"
            onClick={handleReset}
            className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-200 bg-white px-3.5 py-2 text-xs font-semibold text-zinc-700 shadow-sm transition-colors hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-300 dark:hover:bg-zinc-900"
          >
            <RotateCcw className="h-3.5 w-3.5" aria-hidden />
            필터 초기화
          </button>
          <Link
            href="/quote/new"
            className="inline-flex items-center gap-1.5 rounded-xl bg-[#2563EB] px-3.5 py-2 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-[#1D4ED8]"
          >
            <PenSquare className="h-3.5 w-3.5" aria-hidden />
            견적 요청하기
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-3 px-6 py-24 text-center">
      <p className="text-4xl" aria-hidden>
        ☀️
      </p>
      <div className="space-y-1">
        <h2 className="text-[17px] font-bold text-zinc-900 dark:text-zinc-50">곧 첫 게시글이 올라갈 거예요</h2>
        <p className="text-[13px] leading-5 text-zinc-500 dark:text-zinc-400">
          지금 청광에서 홍보 페이지를 준비 중입니다.
        </p>
      </div>
    </div>
  );
}
