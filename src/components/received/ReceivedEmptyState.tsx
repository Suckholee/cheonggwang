import Link from "next/link";
import { FilePlus } from "lucide-react";

export function ReceivedEmptyState() {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 text-center">
      <span className="text-5xl" aria-hidden>
        📋
      </span>
      <h2 className="text-lg font-bold">아직 요청한 견적이 없어요</h2>
      <p className="max-w-xs text-sm text-zinc-500 dark:text-zinc-400">
        아래 카테고리에서 시작하거나, 새 견적 요청 버튼으로 진행하세요.
      </p>
      <Link
        href="/quote/new"
        className="mt-2 inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-indigo-700"
      >
        <FilePlus className="h-4 w-4" aria-hidden />새 견적 요청
      </Link>
    </div>
  );
}
