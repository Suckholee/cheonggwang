"use client";

import Link from "next/link";
import { ClipboardList, Tag } from "lucide-react";

interface Props {
  /** 활동 카테고리 3개 미만이면 "카테고리 설정" 강조 */
  emphasizeCategories: boolean;
  /** 프로필 미완성 (description/priceBook 비어있음) */
  emphasizeProfile: boolean;
}

export function EmptyRequestsHint({
  emphasizeCategories,
  emphasizeProfile,
}: Props) {
  const profileBorder = emphasizeProfile
    ? "border-indigo-300 bg-indigo-50 dark:border-indigo-700 dark:bg-indigo-950/30"
    : "border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950";
  const categoriesBorder = emphasizeCategories
    ? "border-indigo-300 bg-indigo-50 dark:border-indigo-700 dark:bg-indigo-950/30"
    : "border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950";

  return (
    <div className="space-y-3 rounded-xl border border-dashed border-zinc-300 p-5 text-center dark:border-zinc-700">
      <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
        아직 받은 요청이 없어요
      </p>
      <p className="text-xs text-zinc-500">
        매칭률을 높여 첫 요청을 받아볼까요?
      </p>

      <Link
        href="/provider/profile?tab=basic"
        className={`flex items-center gap-3 rounded-lg border p-3 text-left transition-colors ${profileBorder}`}
      >
        <ClipboardList className="h-5 w-5 shrink-0 text-indigo-600 dark:text-indigo-400" />
        <div className="flex-1">
          <p className="text-sm font-medium">프로필 완성하기</p>
          <p className="text-xs text-zinc-500">
            소개글 · 단가 · 포트폴리오 추가
          </p>
        </div>
        <span className="text-indigo-600 dark:text-indigo-400" aria-hidden>
          →
        </span>
      </Link>

      <Link
        href="/provider/profile?tab=basic"
        className={`flex items-center gap-3 rounded-lg border p-3 text-left transition-colors ${categoriesBorder}`}
      >
        <Tag className="h-5 w-5 shrink-0 text-indigo-600 dark:text-indigo-400" />
        <div className="flex-1">
          <p className="text-sm font-medium">카테고리 넓히기</p>
          <p className="text-xs text-zinc-500">
            더 많은 카테고리를 선택해 매칭을 늘리세요
          </p>
        </div>
        <span className="text-indigo-600 dark:text-indigo-400" aria-hidden>
          →
        </span>
      </Link>
    </div>
  );
}
