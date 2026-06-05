import { Lock } from "lucide-react";

export function TodayScheduleCard() {
  return (
    <section aria-labelledby="today-heading" className="mb-6">
      <h2
        id="today-heading"
        className="mb-3 text-[14px] font-extrabold text-zinc-800 dark:text-zinc-200"
      >
        오늘 일정
      </h2>
      <div className="flex items-center gap-4.5 rounded-[24px] border border-dashed border-zinc-200 bg-zinc-50/50 p-5 text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900/30">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-zinc-100 text-zinc-400 dark:bg-zinc-800">
          <Lock className="h-5 w-5" strokeWidth={2.5} />
        </div>
        <div className="flex-1">
          <p className="text-[13px] font-extrabold text-zinc-800 dark:text-zinc-200">v1.3에서 공개 예정</p>
          <p className="text-xs font-medium text-zinc-400 leading-relaxed mt-0.5">
            일정 확정 기능이 추가되면 오늘 방문 리스트가 표시됩니다.
          </p>
        </div>
      </div>
    </section>
  );
}
