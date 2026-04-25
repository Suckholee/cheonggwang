"use client";

import { useRouter } from "next/navigation";
import { ArrowRight, MessageCircle } from "lucide-react";

interface Props {
  providerId: string;
}

export function BottomCTA({ providerId }: Props) {
  const router = useRouter();

  function handleRequestQuote() {
    router.push(`/quote/new?providerId=${encodeURIComponent(providerId)}`);
  }

  return (
    <div className="mt-10 flex gap-2 border-t border-zinc-200 pt-5 dark:border-zinc-800">
      <button
        type="button"
        disabled
        aria-label="문의 (v1.2 예정)"
        className="flex items-center gap-2 rounded-xl border border-zinc-300 px-4 py-3 text-sm font-medium text-zinc-400 dark:border-zinc-700"
      >
        <MessageCircle className="h-4 w-4" aria-hidden />
        문의
      </button>
      <button
        type="button"
        onClick={handleRequestQuote}
        className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-indigo-700"
      >
        견적 요청하기
        <ArrowRight className="h-4 w-4" aria-hidden />
      </button>
    </div>
  );
}
