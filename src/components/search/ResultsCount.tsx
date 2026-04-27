interface Props {
  count: number;
}

export function ResultsCount({ count }: Props) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="mb-4 rounded-[20px] border border-[#dbe8fb] bg-white px-4 py-3 text-[14px] font-medium text-zinc-500 shadow-[0_8px_20px_rgba(43,102,246,0.04)] dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-400"
    >
      총 <span className="font-bold text-[#2563EB] dark:text-[#5B8DF6]">{count}</span>명의 청명이 있어요
    </div>
  );
}
