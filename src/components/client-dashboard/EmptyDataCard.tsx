interface Props {
  title?: string;
  description?: string;
  /** snap-start shrink-0 width 카드 사이즈에 맞춤 (AveragePrice=w-44 · TopProvider=w-40) */
  width?: "w-44" | "w-40" | "w-full";
}

export function EmptyDataCard({
  title = "아직 데이터 없음",
  description = "곧 업데이트 예정입니다",
  width = "w-full",
}: Props) {
  return (
    <div
      className={`flex shrink-0 snap-start flex-col items-center justify-center rounded-[22px] border border-dashed border-[#c9daf7] bg-[#f8fbff] p-5 text-center dark:border-zinc-700 dark:bg-zinc-900 ${width}`}
    >
      <p className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
        {title}
      </p>
      <p className="mt-1 text-[11px] leading-4 text-zinc-500">{description}</p>
    </div>
  );
}
