import Link from "next/link";
import { AvailabilityToggle } from "./AvailabilityToggle";
import type { Provider } from "@/types/provider";

interface Props {
  provider: Provider;
  totalCount: number;
}

export function DashboardHero({ provider, totalCount }: Props) {
  const isAvailable = provider.isAvailable ?? true;

  return (
    <section className="relative overflow-hidden rounded-[28px] border border-blue-100 bg-gradient-to-br from-[#ebf3ff]/80 to-[#f4f9ff]/50 p-5 shadow-xs mb-5 dark:border-zinc-850 dark:from-zinc-900/50 dark:to-zinc-950">
      <div className="flex flex-col gap-4">
        {/* Top Info Area */}
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-[20px] font-black tracking-tight text-zinc-950 dark:text-zinc-50 leading-tight">
              {provider.companyName}님, {isAvailable ? "활동중입니다" : "일시중지 상태입니다"}
            </h1>
            <p className="mt-1 text-xs font-bold text-zinc-500 dark:text-zinc-400">
              신규 요청 <span className="text-[#2563EB] dark:text-[#3B82F6] font-extrabold">{totalCount}건</span> · 오늘 일정 <span className="font-extrabold text-zinc-700 dark:text-zinc-300">0건</span>
            </p>
          </div>
          {isAvailable ? (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-[10px] font-extrabold text-emerald-600 dark:border-emerald-950/40 dark:bg-emerald-950/20 dark:text-emerald-400">
              ● 활동중
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-zinc-200 bg-zinc-150 px-2.5 py-0.5 text-[10px] font-extrabold text-zinc-500 dark:border-zinc-800 dark:bg-zinc-800/40 dark:text-zinc-450">
              ○ 일시중지
            </span>
          )}
        </div>

        {/* Bottom Actions Area */}
        <div className="flex flex-col gap-2.5 sm:flex-row sm:items-stretch">
          <div className="flex-1 min-w-0 flex items-center rounded-2xl border border-zinc-200/60 bg-white/70 px-4 py-3 shadow-2xs dark:border-zinc-800 dark:bg-zinc-900/60 backdrop-blur-xs">
            <AvailabilityToggle initial={isAvailable} />
          </div>
          <Link
            href={`/providers/${provider.id}`}
            className="flex items-center justify-center gap-1 rounded-2xl bg-white border border-zinc-200 text-[#2563EB] font-extrabold px-5 py-3 text-xs shadow-2xs hover:bg-[#f4f9ff]/50 hover:scale-[1.01] active:scale-[0.99] transition-all dark:bg-zinc-900 dark:border-zinc-800 dark:text-[#3B82F6] dark:hover:bg-zinc-850"
          >
            공개 프로필 보기 →
          </Link>
        </div>
      </div>
    </section>
  );
}
