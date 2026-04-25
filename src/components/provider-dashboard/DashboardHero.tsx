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
    <section className="mb-6 rounded-2xl border border-indigo-200 bg-indigo-50 p-5 dark:border-indigo-900/50 dark:bg-indigo-950/30">
      <p className="mb-1 text-xs text-indigo-700 dark:text-indigo-300">
        {greeting}
      </p>
      <h1 className="mb-2 truncate text-xl font-bold text-zinc-900 dark:text-zinc-50">
        {provider.companyName}
      </h1>
      <div className="mb-3">
        <Link
          href={`/providers/${provider.id}`}
          className="text-xs font-medium text-indigo-600 hover:underline dark:text-indigo-400"
        >
          공개 프로필 보기 →
        </Link>
      </div>
      <AvailabilityToggle initial={provider.isAvailable ?? true} />
    </section>
  );
}
