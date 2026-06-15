export function TodayScheduleCard() {
  return (
    <section aria-labelledby="today-heading" className="mb-6">
      <h2
        id="today-heading"
        className="mb-3 text-[14px] font-extrabold text-zinc-800 dark:text-zinc-200"
      >
        오늘 일정
      </h2>
      <div className="flex flex-col items-center justify-center rounded-[24px] border border-dashed border-zinc-200 bg-zinc-50/20 py-8 text-center dark:border-zinc-800 dark:bg-zinc-900/10">
        <p className="text-xs font-bold text-zinc-400 dark:text-zinc-500">
          오늘 예정된 방문 일정이 없습니다.
        </p>
      </div>
    </section>
  );
}
