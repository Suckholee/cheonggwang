"use client";

import Link from "next/link";
import { FileText } from "lucide-react";

interface Props {
  heading?: string;
  body?: string;
  cta?: { label: string; href: string };
}

export function CommunityEmptyState({
  heading = "아직 포스트가 없어요",
  body = "청명이 홍보 포스트를 올리면 여기에 표시됩니다",
  cta,
}: Props = {}) {
  const linkLabel = cta?.label ?? "청명찾기 →";
  const linkHref = cta?.href ?? "/search";
  return (
    <div className="flex flex-col items-center gap-3 rounded-[24px] border border-dashed border-[#c9daf7] bg-[#f8fbff] p-8 text-center dark:border-zinc-700 dark:bg-zinc-900">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white shadow-sm dark:bg-zinc-950">
        <FileText className="h-8 w-8 text-[#2B66F6]" aria-hidden />
      </div>
      <div>
        <p className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
          {heading}
        </p>
        <p className="mt-1 text-xs leading-5 text-zinc-500">{body}</p>
      </div>
      <Link
        href={linkHref}
        className="rounded-full bg-[#edf4ff] px-4 py-2 text-sm font-semibold text-[#2B66F6] transition-colors hover:bg-[#deecff] dark:bg-indigo-950/40 dark:text-indigo-300"
      >
        {linkLabel}
      </Link>
    </div>
  );
}
