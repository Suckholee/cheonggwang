"use client";

import Link from "next/link";
import { Search } from "lucide-react";

interface Props {
  hasFilters: boolean;
}

export function SearchEmptyState({ hasFilters }: Props) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 rounded-[28px] border border-dashed border-[#c9daf7] bg-[#f8fbff] px-5 py-16 text-center dark:border-zinc-700 dark:bg-zinc-900">
      <div className="flex h-20 w-20 items-center justify-center rounded-full bg-white shadow-sm dark:bg-zinc-950">
        <Search className="h-8 w-8 text-[#2B66F6] dark:text-zinc-300" aria-hidden strokeWidth={2.5} />
      </div>
      <div>
        <p className="text-[17px] font-bold text-zinc-900 dark:text-zinc-50">
          {hasFilters ? "조건에 맞는 청명이 없어요" : "아직 등록된 청명이 없어요"}
        </p>
        <p className="mt-1.5 text-[14px] text-zinc-500">
          {hasFilters
            ? "필터를 조정해 보거나 전체 목록을 확인해 보세요"
            : "곧 활성 청명이 추가될 예정입니다"}
        </p>
      </div>
      {hasFilters && (
        <Link
          href="/search"
          className="mt-4 rounded-full bg-[#edf4ff] px-5 py-2.5 text-[14px] font-bold text-[#2B66F6] transition-colors hover:bg-[#deecff] dark:bg-[#2B66F6]/20 dark:text-[#5B8DF6]"
        >
          필터 초기화
        </Link>
      )}
    </div>
  );
}
