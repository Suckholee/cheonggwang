import { BrandLogo } from "@/components/ui/BrandLogo";
import { ChevronLeft, Lock } from "lucide-react";
import Link from "next/link";
import Image from "next/image";

export const metadata = {
  title: "설정 · 청광",
};

export default function ProviderSettingsPage() {
  return (
    <div className="min-h-screen w-full bg-[linear-gradient(180deg,#f4f9ff_0%,#ffffff_18%,#ffffff_100%)] px-5 pt-3 pb-28 dark:bg-none">
      <header className="sticky top-0 z-40 -mx-5 mb-5 border-b border-white/70 bg-[#f4f9ff]/90 px-5 py-3 backdrop-blur dark:border-zinc-800/70 dark:bg-zinc-950/90">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Link
              href="/provider/home"
              className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/80 border border-zinc-200 text-zinc-600 hover:text-zinc-900 shadow-sm transition-all hover:scale-105 active:scale-95 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400"
              aria-label="홈으로 가기"
            >
              <ChevronLeft className="h-4.5 w-4.5" strokeWidth={2.5} />
            </Link>
            <BrandLogo />
          </div>
          <span className="rounded-full border border-[#d8e6ff] bg-white/80 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#2563EB]/80 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400">
            Partner
          </span>
        </div>
        <div className="mt-4 rounded-[28px] border border-[#dbe8fb] bg-[linear-gradient(135deg,#ffffff_0%,#eef6ff_46%,#dcebff_100%)] px-5 py-5 shadow-[0_14px_34px_rgba(43,102,246,0.08)] dark:border-zinc-850 dark:bg-gradient-to-br dark:from-zinc-900 dark:to-zinc-950">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#2563EB]/70 dark:text-zinc-400">
            Settings
          </p>
          <h1 className="mt-1 text-[26px] font-black tracking-tight text-zinc-950 dark:text-zinc-50">
            환경 설정
          </h1>
          <p className="mt-2 text-[13px] leading-5 text-zinc-650 dark:text-zinc-400">
            계정 정보 확인 및 앱 알림, 서비스 노출 관련 옵션을 관리합니다.
          </p>
        </div>
      </header>

      <div className="overflow-hidden flex flex-col items-center rounded-[24px] border border-zinc-200 bg-white shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:bg-zinc-900 dark:border-zinc-800">
        <div className="relative h-44 w-full bg-zinc-100 dark:bg-zinc-950">
          <Image
            src="/images/cozy_login_bg.png"
            alt="설정 준비 중"
            fill
            sizes="(max-width: 640px) 100vw, 400px"
            className="object-cover"
          />
          {/* Soft mask overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-white via-white/40 to-transparent dark:from-zinc-900 dark:via-zinc-900/40" />

          {/* Floating icon badge */}
          <div className="absolute left-1/2 bottom-0 -translate-x-1/2 translate-y-1/2 flex h-14 w-14 items-center justify-center rounded-2xl border-4 border-white bg-amber-500 text-white shadow-md dark:border-zinc-900 dark:bg-amber-600">
            <Lock className="h-6 w-6" strokeWidth={2.5} />
          </div>
        </div>

        <div className="px-5 pb-6 pt-10 text-center flex flex-col items-center">
          <h2 className="text-[16px] font-extrabold text-zinc-900 dark:text-zinc-50">
            환경 설정 준비 중
          </h2>
          <p className="mt-1.5 max-w-xs text-xs font-bold text-zinc-400 dark:text-zinc-500 leading-normal">
            알림 수신 설정, 정산 계좌 관리 및 추가 보안 옵션이 현재 준비 중입니다. v1.1 업데이트에서 곧 만나보실 수 있습니다.
          </p>

          <Link
            href="/provider/home"
            className="mt-6 inline-flex w-full min-w-[200px] items-center justify-center gap-1.5 rounded-xl bg-white text-zinc-750 font-extrabold border border-zinc-200 border-b-[3px] border-b-zinc-300 px-4 py-2.5 text-xs shadow-xs hover:border-[#2563EB]/40 hover:scale-[1.02] active:scale-[0.96] active:translate-y-[1px] transition-all dark:bg-zinc-900 dark:text-zinc-300 dark:border-zinc-800 dark:border-b-zinc-950"
          >
            대시보드로 돌아가기
          </Link>
        </div>
      </div>
    </div>
  );
}
