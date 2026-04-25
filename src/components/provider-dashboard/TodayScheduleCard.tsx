import { Lock } from "lucide-react";

export function TodayScheduleCard() {
  return (
    <section aria-labelledby="today-heading" className="mb-6">
      <h2
        id="today-heading"
        className="mb-3 text-sm font-semibold text-zinc-700 dark:text-zinc-300"
      >
        오늘 일정
      </h2>
      <div className="flex items-center gap-3 rounded-xl border border-dashed border-zinc-300 bg-zinc-50 p-4 text-zinc-500 dark:border-zinc-700 dark:bg-zinc-900">
        <Lock className="h-4 w-4 shrink-0" aria-hidden />
        <div className="flex-1">
          <p className="text-sm font-medium">v1.3에서 공개 예정</p>
          <p className="text-xs">
            일정 확정 기능이 추가되면 오늘 방문 리스트가 표시됩니다.
          </p>
        </div>
      </div>
    </section>
  );
}
