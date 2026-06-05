import Link from "next/link";
import { AvailabilityToggle } from "./AvailabilityToggle";
import type { Provider } from "@/types/provider";

interface Props {
  provider: Provider;
}

function getGreeting(now: Date = new Date()): string {
  const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000).getUTCHours();
  if (kst < 6) return "편안한 밤이에요";
  if (kst < 12) return "좋은 아침이에요";
  if (kst < 18) return "좋은 오후예요";
  return "편안한 저녁이에요";
}

export function DashboardHero({ provider }: Props) {
  const greeting = getGreeting();
  return (
    <section
      className="relative overflow-hidden rounded-[28px] border border-[#d8e6ff] px-5 py-6 shadow-[0_14px_34px_rgba(43,102,246,0.06)] bg-cover bg-center mb-5 dark:border-zinc-850"
      style={{ backgroundImage: "url('/images/clean_office_cafe.png')" }}
    >
      {/* Premium backdrop-filter gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-r from-white/98 via-white/92 to-white/70 dark:from-zinc-950/98 dark:via-zinc-950/92 dark:to-zinc-950/70" />

      <div className="relative z-10">
        <div className="mb-2 inline-flex items-center gap-1.5 rounded-full border border-[#d8e6ff] bg-white/90 px-3 py-1 text-[11px] font-extrabold text-[#2563EB] shadow-xs dark:border-zinc-800 dark:bg-zinc-900/90 dark:text-[#3B82F6]">
          ⚡ 실시간 파트너 대기 중
        </div>

        <p className="text-[11px] font-bold text-zinc-450 dark:text-zinc-500">
          {greeting}
        </p>

        <h1 className="mt-1 truncate text-[24px] font-black tracking-tight text-zinc-950 dark:text-zinc-50 leading-tight">
          {provider.companyName}
        </h1>

        <div className="mt-4 flex items-center justify-between gap-4">
          <Link
            href={`/providers/${provider.id}`}
            className="inline-flex items-center gap-1 rounded-xl bg-[#2563EB]/10 border border-[#2563EB]/15 text-[#2563EB] font-extrabold px-3.5 py-1.5 text-xs shadow-xs hover:scale-105 active:scale-95 transition-all dark:bg-[#3B82F6]/10 dark:border-[#3B82F6]/15 dark:text-[#3B82F6]"
          >
            공개 프로필 보기 →
          </Link>
          <div className="rounded-xl border border-zinc-200/50 bg-white/80 px-3 py-1 shadow-2xs dark:border-zinc-800 dark:bg-zinc-900/80">
            <AvailabilityToggle initial={provider.isAvailable ?? true} />
          </div>
        </div>
      </div>
    </section>
  );
}
