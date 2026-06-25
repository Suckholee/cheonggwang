import { Suspense } from "react";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { cookies } from "next/headers";
import { CheckCircle2, ChevronRight, Sparkles } from "lucide-react";
import {
  SESSION_COOKIE_NAME,
  verifySessionCookie,
} from "@/lib/firebase/auth-admin";
import { quoteRequestRepository } from "@/lib/firebase/quote-request-repository";
import { providerRepository } from "@/lib/firebase/provider-repository";
import { QUOTE_CATEGORY_LABELS } from "@/domain/quote-category";

type SearchParams = { id?: string };

export const metadata = {
  title: "견적 요청 접수 완료 — 청광",
};

export default function QuoteThanksPage(props: {
  searchParams: Promise<SearchParams>;
}) {
  return (
    <div 
      className="mx-auto min-h-screen max-w-md bg-cover bg-center shadow-2xl border-x border-zinc-200/50 dark:border-zinc-800/50 relative flex items-center justify-center py-12 px-4"
      style={{ backgroundImage: "url('/images/clean_thanks_bg.png')" }}
    >
      {/* Premium semi-transparent white/blue glassmorphism overlay */}
      <div className="absolute inset-0 bg-zinc-900/35 dark:bg-zinc-950/65 backdrop-blur-[2px]" />

      <div className="relative z-10 w-full max-w-[420px] rounded-[24px] border border-white/45 bg-white/90 p-5.5 shadow-[0_24px_64px_rgba(0,0,0,0.15)] backdrop-blur-md dark:border-zinc-800/40 dark:bg-zinc-950/85 transition-all">
        <Suspense fallback={<ThanksSkeleton />}>
          <ThanksBody searchParams={props.searchParams} />
        </Suspense>
      </div>
    </div>
  );
}

function ThanksSkeleton() {
  return (
    <div className="animate-pulse text-center">
      <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-zinc-200 dark:bg-zinc-850" />
      <div className="mx-auto mb-6 h-6 w-48 rounded bg-zinc-200 dark:bg-zinc-850" />
      <div className="mb-6 h-32 w-full rounded-2xl bg-zinc-100 dark:bg-zinc-900" />
      <div className="flex gap-2">
        <div className="h-11 flex-1 rounded-xl bg-zinc-200 dark:bg-zinc-850" />
        <div className="h-11 flex-1 rounded-xl bg-zinc-200 dark:bg-zinc-850" />
      </div>
    </div>
  );
}

function formatDate(date: Date | null | undefined): string {
  if (!date) return "협의 필요";
  return new Date(date).toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

async function ThanksBody({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const id = sp.id;
  if (!id) notFound();

  const jar = await cookies();
  let uid: string;
  try {
    uid = await verifySessionCookie(jar.get(SESSION_COOKIE_NAME)?.value);
  } catch {
    redirect(`/login?next=${encodeURIComponent("/quote/thanks?id=" + id)}`);
  }

  const request = await quoteRequestRepository.get(id);
  if (!request || request.clientUid !== uid) notFound();

  // 현재 요청 카테고리에 매칭되는 실제 청명 파트너사 목록 조회
  const matchedProviders = await providerRepository.listByCategory(request.category);
  const catLabel = QUOTE_CATEGORY_LABELS[request.category];
  const locationStr = request.address || `${request.region.city} ${request.region.district}`;
  const sizeStr = request.size ? `${request.size}평` : "협의 필요";

  return (
    <>
      {/* 1) 완료 상태 및 번호 표시 */}
      <div className="mb-5 text-center">
        <div className="mb-2 flex justify-center text-blue-600 dark:text-blue-400 animate-[bounce_1.8s_infinite]" aria-hidden>
          <CheckCircle2 className="h-12 w-12" />
        </div>
        <h1 className="mb-1.5 text-[22px] font-black tracking-tight text-zinc-950 dark:text-zinc-50">
          견적 요청이 접수됐어요
        </h1>
        <div className="inline-block rounded-full bg-zinc-100 dark:bg-zinc-900 px-3 py-1 text-[11px] font-bold text-zinc-500 tracking-normal mb-1">
          요청번호 #R-{id.toUpperCase().slice(0, 12)}
        </div>
        
        {/* 2) 자연스러운 문구 및 연락처 분리 */}
        <div className="mt-3.5 border-t border-zinc-200/50 dark:border-zinc-800/40 pt-3 text-[12.5px] leading-relaxed text-zinc-650 dark:text-zinc-400">
          <p className="font-semibold text-zinc-900 dark:text-zinc-100">담당자가 24시간 이내 연락드릴 예정입니다.</p>
          <p className="mt-0.5 text-zinc-500">연락처: <span className="font-bold text-zinc-800 dark:text-zinc-300">{request.contactPhone}</span></p>
        </div>
      </div>

      {/* 3) 진행 상태 가로 인디케이터 표시 */}
      <div className="mb-5.5 rounded-2xl border border-zinc-150 bg-zinc-50/50 p-4 dark:border-zinc-850 dark:bg-zinc-900/30">
        <div className="flex items-center justify-between text-[11px]">
          <div className="flex flex-col items-center gap-1.5 shrink-0">
            <span className="flex h-5.5 w-5.5 items-center justify-center rounded-full bg-[#2563EB] text-white font-black text-[9.5px] shadow-xs">1</span>
            <span className="font-extrabold text-[#2563EB] dark:text-blue-400">접수 완료</span>
          </div>
          <div className="h-[2px] flex-1 bg-blue-500/30 mx-2 -translate-y-3 dark:bg-blue-900/30" />
          <div className="flex flex-col items-center gap-1.5 shrink-0">
            <span className="flex h-5.5 w-5.5 items-center justify-center rounded-full bg-zinc-200 text-zinc-550 font-bold text-[9.5px] dark:bg-zinc-800 dark:text-zinc-400">2</span>
            <span className="font-semibold text-zinc-500 dark:text-zinc-400">업체 검토</span>
          </div>
          <div className="h-[2px] flex-1 bg-zinc-200 mx-2 -translate-y-3 dark:bg-zinc-800" />
          <div className="flex flex-col items-center gap-1.5 shrink-0">
            <span className="flex h-5.5 w-5.5 items-center justify-center rounded-full bg-zinc-200 text-zinc-550 font-bold text-[9.5px] dark:bg-zinc-800 dark:text-zinc-400">3</span>
            <span className="font-semibold text-zinc-500 dark:text-zinc-400">견적 안내</span>
          </div>
          <div className="h-[2px] flex-1 bg-zinc-200 mx-2 -translate-y-3 dark:bg-zinc-800" />
          <div className="flex flex-col items-center gap-1.5 shrink-0">
            <span className="flex h-5.5 w-5.5 items-center justify-center rounded-full bg-zinc-200 text-zinc-550 font-bold text-[9.5px] dark:bg-zinc-800 dark:text-zinc-400">4</span>
            <span className="font-semibold text-zinc-500 dark:text-zinc-400">예약 확정</span>
          </div>
        </div>
      </div>

      {/* 4) 정돈된 2열 형태의 요청 요약 표 */}
      <section className="mb-5.5 rounded-2xl border border-zinc-200/60 bg-white/95 p-4 dark:border-zinc-800/50 dark:bg-zinc-950/80 shadow-xs">
        <h2 className="mb-3.5 text-[11px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
          요청 정보 요약
        </h2>
        <div className="divide-y divide-zinc-100 dark:divide-zinc-900 text-[13.5px]">
          <div className="flex justify-between py-2">
            <span className="font-semibold text-zinc-400 dark:text-zinc-500 w-20 shrink-0">서비스</span>
            <span className="font-bold text-zinc-900 dark:text-zinc-100 text-right flex-1 truncate">{catLabel}</span>
          </div>
          <div className="flex justify-between py-2">
            <span className="font-semibold text-zinc-400 dark:text-zinc-500 w-20 shrink-0">주소/위치</span>
            <span className="font-bold text-zinc-900 dark:text-zinc-100 text-right flex-1 truncate">{locationStr}</span>
          </div>
          <div className="flex justify-between py-2">
            <span className="font-semibold text-zinc-400 dark:text-zinc-500 w-20 shrink-0">평수</span>
            <span className="font-bold text-zinc-900 dark:text-zinc-100 text-right flex-1 truncate">{sizeStr}</span>
          </div>
          <div className="flex justify-between py-2">
            <span className="font-semibold text-zinc-400 dark:text-zinc-500 w-20 shrink-0">희망일</span>
            <span className="font-bold text-zinc-900 dark:text-zinc-100 text-right flex-1 truncate">{formatDate(request.preferredDate)}</span>
          </div>
          <div className="flex justify-between py-2">
            <span className="font-semibold text-zinc-400 dark:text-zinc-500 w-20 shrink-0">연락처</span>
            <span className="font-bold text-zinc-900 dark:text-zinc-100 text-right flex-1 truncate">{request.contactPhone}</span>
          </div>
        </div>
      </section>

      {/* 5) 불안감을 덜어주는 추천 파트너사 리스트 (업체명 노출 제한 및 가명화) */}
      <section className="mb-4 rounded-2xl border border-blue-100 bg-blue-50/20 p-4 dark:border-zinc-900/30 dark:bg-zinc-900/40 shadow-xs">
        <h2 className="mb-3 text-[11px] font-extrabold uppercase tracking-wider text-blue-600 dark:text-blue-400 flex items-center gap-1.5">
          <Sparkles className="h-3.5 w-3.5 text-blue-500 animate-pulse" />
          배정 대기 중인 청광 인증 파트너 풀
        </h2>
        
        {matchedProviders.length === 0 ? (
          <p className="text-[11px] text-zinc-400 dark:text-zinc-500">해당 지역 및 카테고리에 배정 대기 중인 파트너사가 곧 연결됩니다.</p>
        ) : (
          <div className="space-y-2">
            {matchedProviders.slice(0, 2).map((prov, idx) => (
              <div key={prov.id} className="flex items-center gap-3 bg-white p-3 rounded-xl border border-zinc-150 shadow-xs dark:bg-zinc-950 dark:border-zinc-800/50">
                <div className="w-8.5 h-8.5 rounded-lg bg-blue-50 dark:bg-zinc-900 flex items-center justify-center font-black text-[11px] text-[#2563EB] dark:text-blue-400 shrink-0">
                  P{idx + 1}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <h4 className="text-[11.5px] font-extrabold text-zinc-900 dark:text-zinc-100 truncate">
                      인증 파트너사 {idx + 1}
                    </h4>
                    <span className="inline-flex items-center gap-0.5 rounded-full bg-[#EFF6FF] border border-[#BFDBFE] px-1 py-[0.5px] text-[8px] font-bold text-[#2563EB] dark:bg-blue-950/20 dark:text-blue-400 dark:border-blue-900/40">
                      ✓ 인증
                    </span>
                  </div>
                  <p className="text-[9.5px] text-zinc-500 dark:text-zinc-400 truncate mt-0.5">
                    {prov.regions.slice(0, 2).map(r => r.district).join(" · ") || "서울 전역"} 활동 · {prov.slogan || "꼼꼼한 전문 케어"}
                  </p>
                </div>
                {prov.rating !== null && (
                  <div className="shrink-0 text-right text-[9.5px] text-zinc-550">
                    <span className="font-semibold text-amber-500">★ {prov.rating}</span>
                    {prov.reviewCount !== null && (
                      <span className="text-zinc-400 dark:text-zinc-500">({prov.reviewCount})</span>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* 5-2) 신설: 향후 2단계 견적 진행 상세 가이드라인 (업무 문의 감소 목적) */}
      <section className="mb-5.5 rounded-2xl border border-zinc-200 bg-zinc-50/30 p-4 dark:border-zinc-800/40 dark:bg-zinc-900/10">
        <h2 className="mb-3 text-[11px] font-extrabold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
          향후 진행 프로세스 안내
        </h2>
        <div className="space-y-3.5">
          <div className="flex gap-3">
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-50 text-[10px] font-black text-blue-600 border border-blue-200/60 dark:bg-zinc-850 dark:text-zinc-350 dark:border-zinc-700">1</span>
            <div className="min-w-0">
              <h4 className="text-xs font-bold text-zinc-900 dark:text-zinc-100">현장 접수 목록 등재 (완료)</h4>
              <p className="mt-0.5 text-[10.5px] leading-relaxed text-zinc-500">제출하신 1차 기본 견적 요청서가 청광 매칭 센터의 &apos;현장 접수 목록&apos;에 공식 등록되었습니다.</p>
            </div>
          </div>
          <div className="flex gap-3">
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-50 text-[10px] font-black text-blue-600 border border-blue-200/60 dark:bg-zinc-850 dark:text-zinc-350 dark:border-zinc-700">2</span>
            <div className="min-w-0">
              <h4 className="text-xs font-bold text-zinc-900 dark:text-zinc-100">우수 파트너사 현장 방문 신청</h4>
              <p className="mt-0.5 text-[10.5px] leading-relaxed text-zinc-500">목록에 등록된 고객님의 요청 내용을 확인한 검증된 파트너사(청명)들이 현장 실측을 위해 방문을 신청합니다.</p>
            </div>
          </div>
          <div className="flex gap-3">
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-50 text-[10px] font-black text-blue-600 border border-blue-200/60 dark:bg-zinc-850 dark:text-zinc-350 dark:border-zinc-700">3</span>
            <div className="min-w-0">
              <h4 className="text-xs font-bold text-zinc-900 dark:text-zinc-100">현장 방문 및 2차 최종 견적 확정</h4>
              <p className="mt-0.5 text-[10.5px] leading-relaxed text-zinc-500">조율된 일정에 파트너사가 현장을 직접 실측하고, 현장에서 합리적이고 투명한 2차 최종 견적서를 즉시 발행하여 예약이 완료됩니다.</p>
            </div>
          </div>
        </div>
      </section>

      {/* 6) 개편된 CTA 버튼 배치 (1순위: 상세 보기, 2순위: 다른 청소, 3순위: 홈 텍스트링크) */}
      <div className="flex flex-col gap-2.5">
        <Link
          href={`/received/${id}`}
          className="flex items-center justify-center gap-1.5 rounded-2xl bg-[#2563EB] py-3.5 text-sm font-extrabold text-white shadow-[0_8px_20px_rgba(37,99,235,0.2)] hover:bg-blue-700 active:scale-[0.98] transition-all"
        >
          요청 상세 보기
          <ChevronRight className="h-4 w-4" />
        </Link>
        <Link
          href="/quote/new"
          className="flex items-center justify-center gap-1.5 rounded-2xl border border-zinc-200 bg-white py-3 text-sm font-bold text-zinc-700 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-300 dark:hover:bg-zinc-900 transition-colors"
        >
          다른 청소 요청하기
        </Link>
        <Link
          href="/"
          className="text-center text-xs font-bold text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors mt-1 py-1"
        >
          홈으로 가기
        </Link>
      </div>
    </>
  );
}
