import Link from "next/link";
import { Plus, Calendar, CreditCard, ChevronRight } from "lucide-react";

export async function TodayCard({ uid }: { uid: string }) {
  // 실제 앱에서는 uid를 기반으로 데이터를 가져오지만, 
  // UI 시연을 위해 더미 데이터를 사용합니다.
  return (
    <section className="mt-2 rounded-[20px] bg-white p-5 shadow-[0_4px_12px_rgba(0,0,0,0.03)] dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800">
      <div className="mb-5 flex items-center justify-between">
        <h2 className="text-[15px] font-bold text-[#2B66F6] dark:text-[#5B8DF6]">
          오늘의 할 일 · 4건
        </h2>
        <span className="text-[13px] font-medium text-zinc-400 dark:text-zinc-500">
          4월 20일 (월)
        </span>
      </div>

      <div className="flex flex-col gap-3">
        {/* Item 1 */}
        <Link href="/received" className="flex items-center justify-between rounded-2xl bg-[#F0F4FF] p-4 dark:bg-blue-950/30 transition-colors">
          <div className="flex items-start gap-3">
            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#2B66F6]" />
            <div>
              <p className="text-[15px] font-bold text-zinc-900 dark:text-zinc-100">새 견적 3건 도착</p>
              <p className="text-[13px] text-zinc-500 dark:text-zinc-400 mt-0.5">입주청소 32평 · 22~32만원 범위</p>
            </div>
          </div>
          <span className="flex h-[22px] min-w-[22px] items-center justify-center rounded-full bg-[#E5484D] px-1.5 text-[12px] font-bold text-white">
            3
          </span>
        </Link>

        {/* Item 2 */}
        <Link href="#" className="flex items-center justify-between rounded-2xl border border-zinc-100 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900 transition-colors">
          <div className="flex items-start gap-3">
            <Calendar className="mt-0.5 h-[18px] w-[18px] text-[#23C16B]" strokeWidth={2} />
            <div>
              <p className="text-[15px] font-bold text-zinc-900 dark:text-zinc-100">모레 14:00 · 새봄홈서비스 방문</p>
              <p className="text-[13px] text-zinc-500 dark:text-zinc-400 mt-0.5">주차 정보 1건 미확인</p>
            </div>
          </div>
          <ChevronRight className="h-4 w-4 text-zinc-300" />
        </Link>

        {/* Item 3 */}
        <Link href="#" className="flex items-center justify-between rounded-2xl border border-zinc-100 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900 transition-colors">
          <div className="flex items-start gap-3">
            <CreditCard className="mt-0.5 h-[18px] w-[18px] text-[#F5A623]" strokeWidth={2} />
            <div>
              <p className="text-[15px] font-bold text-zinc-900 dark:text-zinc-100">결제 요청 1건 · 27만원</p>
              <p className="text-[13px] text-zinc-500 dark:text-zinc-400 mt-0.5">이지클린 · 작업 완료됨</p>
            </div>
          </div>
          <ChevronRight className="h-4 w-4 text-zinc-300" />
        </Link>
      </div>

      <Link
        href="/quote/new"
        className="mt-5 flex w-full items-center justify-center gap-2 rounded-[14px] bg-[#2B66F6] py-[15px] text-[16px] font-bold text-white transition-colors hover:bg-blue-700"
      >
        <Plus className="h-[18px] w-[18px]" strokeWidth={2.5} /> 새 견적 요청
      </Link>
    </section>
  );
}
