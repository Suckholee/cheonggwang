import Link from "next/link";
import Image from "next/image";
import { MessageCircle } from "lucide-react";

interface Props {
  role: "client" | "provider";
}

export function EmptyThreadsHint({ role }: Props) {
  return (
    <div className="overflow-hidden flex flex-col items-center rounded-[24px] border border-zinc-200 bg-white shadow-sm dark:bg-zinc-900 dark:border-zinc-800">
      <div className="relative h-44 w-full bg-zinc-100 dark:bg-zinc-950">
        <Image
          src="/images/clean_living_room.png"
          alt="채팅 소개"
          fill
          sizes="(max-width: 640px) 100vw, 400px"
          className="object-cover"
        />
        {/* Soft mask overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-white via-white/40 to-transparent dark:from-zinc-900 dark:via-zinc-900/40" />

        {/* Floating icon badge */}
        <div className="absolute left-1/2 bottom-0 -translate-x-1/2 translate-y-1/2 flex h-14 w-14 items-center justify-center rounded-2xl border-4 border-white bg-[#2563EB] text-white shadow-md dark:border-zinc-900 dark:bg-[#3B82F6]">
          <MessageCircle className="h-6 w-6" strokeWidth={2.5} />
        </div>
      </div>

      <div className="px-5 pb-6 pt-10 text-center flex flex-col items-center">
        <h2 className="text-[16px] font-extrabold text-zinc-900 dark:text-zinc-50">
          아직 시작된 채팅이 없어요
        </h2>
        <p className="mt-1.5 max-w-xs text-xs font-bold text-zinc-400 dark:text-zinc-500 leading-normal">
          {role === "client"
            ? "청명 파트너들이 제안한 견적이 접수되면 여기서 실시간으로 협의를 진행할 수 있습니다."
            : "새로운 고객 요청에 견적을 제안하시면 채팅방이 자동으로 열립니다."}
        </p>

        <Link
          href={role === "client" ? "/received" : "/provider/requests"}
          className="mt-6 inline-flex w-full min-w-[200px] items-center justify-center gap-1.5 rounded-xl bg-white text-zinc-700 font-extrabold border border-zinc-200 border-b-[3px] border-b-zinc-300 px-4 py-2.5 text-xs shadow-xs hover:border-[#2563EB]/40 hover:scale-[1.02] active:scale-[0.96] active:translate-y-[1px] transition-all dark:bg-zinc-900 dark:text-zinc-300 dark:border-zinc-800 dark:border-b-zinc-950"
        >
          {role === "client" ? "받은 견적 확인하기 →" : "받은 요청 확인하기 →"}
        </Link>
      </div>
    </div>
  );
}
