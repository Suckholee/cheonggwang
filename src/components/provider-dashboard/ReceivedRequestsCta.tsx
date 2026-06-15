import Link from "next/link";
import { Inbox, ChevronRight } from "lucide-react";

interface Props {
  count: number;
}

export function ReceivedRequestsCta({ count }: Props) {
  return (
    <Link
      href="/provider/requests"
      className="group relative flex items-center justify-between rounded-[24px] border border-blue-100 bg-gradient-to-r from-[#eef6ff] to-[#e0eaff] p-5 shadow-xs transition-all hover:scale-[1.01] active:scale-[0.99] dark:border-blue-950/30 dark:from-blue-950/20 dark:to-blue-900/10 mb-6"
    >
      <div className="flex items-center gap-4 min-w-0">
        <div className="relative flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-md shadow-blue-500/10 group-hover:scale-105 transition-transform dark:bg-blue-500">
          <Inbox className="h-5.5 w-5.5" strokeWidth={2.5} />
          {count > 0 && (
            <span className="absolute -top-1 -right-1 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-rose-500 px-1.5 text-[9px] font-black text-white border-2 border-white dark:border-zinc-950 shadow-sm animate-pulse">
              {count}
            </span>
          )}
        </div>
        <div className="min-w-0">
          <h3 className="text-[15px] font-black text-zinc-900 dark:text-zinc-50 leading-tight">
            받은 요청 확인하기
          </h3>
          <p className="mt-1 text-xs font-bold text-zinc-500 dark:text-zinc-400 truncate">
            {count > 0
              ? `새로운 ${count}건의 견적 요청이 파트너님을 기다리고 있습니다.`
              : "새로운 견적 요청이 없습니다. 프로필을 완성하고 대기해보세요."}
          </p>
        </div>
      </div>
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/80 text-blue-600 shadow-2xs group-hover:bg-white group-hover:translate-x-0.5 transition-all dark:bg-zinc-800 dark:text-blue-400">
        <ChevronRight className="h-4.5 w-4.5" strokeWidth={3} />
      </div>
    </Link>
  );
}
