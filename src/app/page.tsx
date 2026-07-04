import { Suspense } from "react";
import Link from "next/link";
import { cookies } from "next/headers";
import {
  ArrowRight,
  FileText,
  MessageCircle,
  Search,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import {
  SESSION_COOKIE_NAME,
  tryVerifySessionCookie,
} from "@/lib/firebase/auth-admin";
import { signOut } from "@/app/actions/auth-actions";
import { CategoryGrid } from "@/components/quote/CategoryGrid";
import { TodayCard } from "@/components/quote/TodayCard";
import { AveragePriceSection } from "@/components/client-dashboard/AveragePriceSection";
import { TopProvidersSection } from "@/components/client-dashboard/TopProvidersSection";
import { BrandLogo } from "@/components/ui/BrandLogo";
import { ProfileMenuButton } from "@/components/ui/ProfileMenuButton";
import { HeaderRegionSelect } from "@/components/ui/HeaderRegionSelect";
import PartnerApplyCTA from "@/components/landing/PartnerApplyCTA";

export const metadata = {
  title: "청광 — 청소 견적 마켓플레이스",
  description:
    "입주·사무실·에어컨 등 6가지 청소 카테고리. 2분 견적 요청 → 검증된 청명이 직접 연락드립니다.",
};

export default function MarketplaceHome() {
  return (
    <>
      <div className="min-h-screen w-full bg-[#F7F9FC] px-4 pt-2 pb-40 md:bg-transparent md:px-0 md:py-0 md:pb-12 md:min-h-0">
        <HomeHeader />

        <main className="space-y-8 md:space-y-0 animate-[fadeIn_0.3s_ease-out]">
          <div className="flex flex-col md:flex-row gap-6 lg:gap-8 items-start">
            {/* Left Column (Main Contents) */}
            <div className="w-full md:w-0 md:flex-[2] flex flex-col gap-8">
              <HeroSection />

              <section>
                <HomeSectionHeader
                  eyebrow="Quick Start"
                  title="어떤 청소가 필요하세요?"
                  description="자주 찾는 서비스를 바로 선택하고 2분 안에 견적을 시작해보세요."
                />
                <CategoryGrid />
              </section>

              <Suspense fallback={<SectionSkeleton />}>
                <AveragePriceSection />
              </Suspense>

              <CommunityPreviewSection />
            </div>

            {/* Right Column (Sidebar Widgets) */}
            <div className="w-full md:w-0 md:flex-[1] flex flex-col gap-6">
              <Suspense fallback={<TodayCardSkeleton />}>
                <TodayCardSlot />
              </Suspense>

              <PartnerApplyCTA />

              <TrustMetricsSection />

              <Suspense fallback={<SectionSkeleton />}>
                <TopProvidersSection />
              </Suspense>

              <Suspense fallback={<FooterSkeleton />}>
                <MarketplaceFooter />
              </Suspense>
            </div>
          </div>
        </main>
      </div>

      <StickyHomeCta />
    </>
  );
}

function HomeHeader() {
  return (
    <header className="sticky top-0 z-50 -mx-4 mb-5 border-b border-[#e7f0ff] bg-[#f4f9ff]/95 px-4 py-3 backdrop-blur md:-mx-8 md:px-8 md:py-4 md:border-b-0 md:bg-transparent md:backdrop-blur-none">
      <div className="flex items-center justify-between">
        <div className="md:hidden">
          <BrandLogo />
        </div>
        <div className="flex items-center gap-2 ml-auto">
          <HeaderRegionSelect />
          <div className="md:hidden">
            <ProfileMenuButton />
          </div>
        </div>
      </div>
    </header>
  );
}

function HeroSection() {
  return (
    <section 
      className="relative overflow-hidden rounded-[30px] border border-[#b0cfff] px-6 py-7 shadow-[0_12px_36px_rgba(43,102,246,0.08)] bg-cover bg-center md:py-10 md:px-8"
      style={{ backgroundImage: "url('/images/clean_living_room.png')" }}
    >
      {/* Premium semi-transparent white/blue glassmorphism overlay */}
      <div className="absolute inset-0 bg-gradient-to-r from-white/92 via-white/82 to-white/50 dark:from-zinc-950/92 dark:via-zinc-950/82 dark:to-zinc-950/50" />
      
      <div className="relative z-10">
        <div className="mb-2.5 inline-flex items-center gap-2 rounded-full border border-white/80 bg-white/80 px-3 py-1 text-[11px] font-semibold text-[#2563EB] shadow-xs dark:border-zinc-800/80 dark:bg-zinc-900/80 dark:text-[#3B82F6]">
          <Sparkles className="h-3.5 w-3.5" aria-hidden />
          믿고 맡길 수 있는 청소 연결
        </div>
        <h1 className="max-w-xs text-[32px] md:max-w-md font-extrabold leading-[1.25] tracking-[-0.2px] text-zinc-950 dark:text-zinc-50">
          오늘 필요한 청소,
          <br />
          빠르게 연결해드려요
        </h1>
        <p className="mt-3.5 max-w-sm text-[14px] leading-[1.6] text-zinc-600 dark:text-zinc-300 font-medium tracking-normal">
          입주청소부터 사무실 청소까지
          <br />
          비교 견적과 업체 정보를 한 번에 확인하세요.
        </p>
        <div className="mt-5 flex flex-col gap-2.5 md:flex-row md:items-center md:gap-4">
          <Link
            href="/quote/new"
            className="inline-flex w-full md:w-auto items-center justify-center gap-2 rounded-2xl bg-[#2563EB] px-5 py-3.5 text-base font-bold text-white shadow-[0_8px_20px_rgba(43,102,246,0.24)] transition-all hover:bg-[#1D4ED8] hover:shadow-[0_10px_24px_rgba(43,102,246,0.32)] active:scale-[0.99]"
          >
            청소 견적 받기
            <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
          <Link
            href="/search"
            className="inline-flex w-full md:w-auto items-center justify-center gap-1.5 px-5 py-3.5 text-sm font-bold text-[#2563EB] transition-colors hover:text-[#1D4ED8] dark:text-[#3B82F6] dark:hover:text-[#60A5FA] md:bg-white/80 md:border md:border-zinc-200 md:rounded-2xl md:shadow-xs md:hover:bg-zinc-50 dark:md:bg-zinc-900 dark:md:border-zinc-800"
          >
            <Search className="h-4 w-4" aria-hidden />
            업체 찾기
          </Link>
        </div>
      </div>
    </section>
  );
}

function TrustMetricsSection() {
  const metrics = [
    { label: "누적 작업", value: "1,240+", hint: "최근 등록 청명 기준" },
    { label: "평균 응답", value: "12분", hint: "상담 시작까지" },
    { label: "재이용률", value: "68%", hint: "반복 의뢰 비율" },
  ];

  return (
    <section>
      <HomeSectionHeader
        eyebrow="Trust Signal"
        title="맡기기 전에 확인하는 핵심 지표"
        description="청광은 가격보다 먼저 신뢰 신호를 보여주도록 홈을 구성합니다."
      />
      <div className="grid grid-cols-3 gap-2">
        {metrics.map((metric) => (
          <article
            key={metric.label}
            className="rounded-[24px] border border-[#E5EAF1] bg-white p-4 shadow-[0_4px_14px_rgba(15,23,42,0.06)] dark:border-zinc-800 dark:bg-zinc-950"
          >
            <p className="text-[11px] font-medium text-zinc-500">{metric.label}</p>
            <p className="mt-2 text-[22px] font-black tracking-tight text-zinc-950 dark:text-zinc-50">
              {metric.value}
            </p>
            <p className="mt-1 text-[11px] leading-4 text-zinc-400">{metric.hint}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

function CommunityPreviewSection() {
  const items = [
    {
      title: "청명들이 직접 정리한 입주청소 체크리스트",
      description: "처음 맡기는 고객도 바로 이해할 수 있는 핵심 포인트만 담았어요.",
      href: "/community",
      icon: FileText,
    },
    {
      title: "후기와 작업 사례로 청명의 스타일을 먼저 확인하세요",
      description: "광고보다 실제 작업 결과가 먼저 보이도록 커뮤니티와 프로필이 연결됩니다.",
      href: "/community",
      icon: ShieldCheck,
    },
    {
      title: "상담 전 궁금한 점은 채팅에서 바로 물어보세요",
      description: "견적 요청 후 일정, 옵션, 작업 범위를 자연스럽게 이어서 조율할 수 있어요.",
      href: "/chat",
      icon: MessageCircle,
    },
  ];

  return (
    <section className="rounded-[24px] border border-[#E5EAF1] bg-white p-5 shadow-[0_4px_14px_rgba(15,23,42,0.06)] dark:border-zinc-800 dark:bg-zinc-950">
      <HomeSectionHeader
        eyebrow="Explore"
        title="청소 팁과 작업 맥락까지 한 번에"
        description="커뮤니티와 상담 흐름을 홈에서 바로 이어주면 첫 방문자도 훨씬 덜 불안합니다."
      />
      <div className="space-y-3">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.title}
              href={item.href}
              className="flex items-start gap-3 rounded-[22px] border border-zinc-200/80 bg-[#f9fbff] p-4 transition-colors hover:bg-[#f3f8ff] dark:border-zinc-800 dark:bg-zinc-900 dark:hover:bg-zinc-800"
            >
              <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#d9e9ff] text-[#2563EB]">
                <Icon className="h-5 w-5" aria-hidden />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                  {item.title}
                </p>
                <p className="mt-1 text-[13px] leading-5 text-zinc-600 dark:text-zinc-400">
                  {item.description}
                </p>
              </div>
              <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-zinc-400" aria-hidden />
            </Link>
          );
        })}
      </div>
    </section>
  );
}

function StickyHomeCta() {
  return (
    <div
      className="md:hidden pointer-events-none fixed inset-x-0 z-50 mx-auto w-full max-w-[480px] px-4"
      style={{
        // 하단 탭 네비게이션 바(--bottom-nav-height=64px) 위에 올라가도록 오프셋.
        // safe-area-inset-bottom 은 iOS 홈 인디케이터 회피용.
        bottom:
          "calc(var(--bottom-nav-height) + env(safe-area-inset-bottom, 0px) + 8px)",
      }}
    >
      <div className="pointer-events-auto flex gap-2 rounded-[26px] border border-white/80 bg-white/92 p-2 shadow-[0_16px_48px_rgba(15,23,42,0.18)] backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/92">
        <Link
          href="/search"
          className="flex-1 rounded-[18px] border border-zinc-200 px-4 py-3 text-center text-sm font-semibold text-zinc-700 transition-colors hover:bg-zinc-50 dark:border-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-900"
        >
          청명 찾기
        </Link>
        <Link
          href="/quote/new"
          className="flex-[1.25] rounded-[18px] bg-[#2563EB] px-4 py-3 text-center text-sm font-semibold text-white transition-colors hover:bg-[#1D4ED8]"
        >
          견적 요청
        </Link>
      </div>
    </div>
  );
}

function HomeSectionHeader({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description?: string;
}) {
  return (
    <div className="mb-4">
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#2563EB]/70">
        {eyebrow}
      </p>
      <h2 className="mt-1 text-[22px] font-black tracking-tight text-zinc-950 dark:text-zinc-50">
        {title}
      </h2>
      {description ? (
        <p className="mt-1 text-[13px] leading-5 text-zinc-500 dark:text-zinc-400">
          {description}
        </p>
      ) : null}
    </div>
  );
}

async function MarketplaceFooter() {
  const jar = await cookies();
  const uid = await tryVerifySessionCookie(
    jar.get(SESSION_COOKIE_NAME)?.value,
  );

  return (
    <footer className="rounded-[24px] border border-[#E5EAF1] bg-white p-5 text-sm shadow-[0_4px_14px_rgba(15,23,42,0.06)] dark:border-zinc-800 dark:bg-zinc-950">
      <div className="flex items-start gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#e7f0ff] text-[#2563EB]">
          <Sparkles className="h-5 w-5" aria-hidden />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
            더 많은 작업 사례와 홍보 피드를 둘러보세요
          </p>
          <p className="mt-1 text-[13px] leading-5 text-zinc-500 dark:text-zinc-400">
            커뮤니티와 홍보 피드는 청명의 작업 스타일과 서비스 톤을 비교할 때 가장 빠른 참고 자료예요.
          </p>
        </div>
      </div>
      <Link
        href="/discover"
        className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-[#2563EB] hover:text-[#1D4ED8]"
      >
        홍보 피드 둘러보기
        <ArrowRight className="h-4 w-4" aria-hidden />
      </Link>
      {uid && (
        <form action={signOut} className="mt-4">
          <button
            type="submit"
            className="text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
          >
            로그아웃
          </button>
        </form>
      )}
    </footer>
  );
}

function FooterSkeleton() {
  return (
    <div className="animate-pulse rounded-[28px] border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950">
      <div className="h-5 w-32 rounded bg-zinc-200 dark:bg-zinc-800" />
      <div className="mt-3 h-4 w-full rounded bg-zinc-100 dark:bg-zinc-900" />
      <div className="mt-2 h-4 w-4/5 rounded bg-zinc-100 dark:bg-zinc-900" />
      <div className="mt-4 h-4 w-28 rounded bg-zinc-200 dark:bg-zinc-800" />
    </div>
  );
}

async function TodayCardSlot() {
  const jar = await cookies();
  const uid = await tryVerifySessionCookie(
    jar.get(SESSION_COOKIE_NAME)?.value,
  );

  if (!uid) {
    return (
      <section className="rounded-[24px] border border-[#E5EAF1] bg-white p-5 shadow-[0_4px_14px_rgba(15,23,42,0.06)] dark:border-zinc-800 dark:bg-zinc-950">
        <div className="mb-4 flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#e8f1ff] text-[#2563EB]">
            <FileText className="h-5 w-5" aria-hidden />
          </div>
          <div>
            <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
              로그인하면 내 견적과 상담 내역을 한 번에 관리할 수 있어요
            </p>
            <p className="mt-1 text-[13px] leading-5 text-zinc-500 dark:text-zinc-400">
              요청 상태 확인, 채팅 연결, 재요청까지 홈에서 바로 이어집니다.
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Link
            href="/login"
            className="flex-1 rounded-2xl bg-[#2563EB] px-4 py-3.5 text-center text-sm font-bold text-white shadow-[0_8px_20px_rgba(43,102,246,0.18)] transition-colors hover:bg-blue-700"
          >
            로그인하기
          </Link>
          <Link
            href="/quote/new"
            className="flex-1 rounded-2xl border border-zinc-200 bg-white px-4 py-3.5 text-center text-sm font-bold text-zinc-700 transition-colors hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-300 dark:hover:bg-zinc-900"
          >
            비회원 견적 요청
          </Link>
        </div>
      </section>
    );
  }

  return <TodayCard uid={uid} />;
}

function TodayCardSkeleton() {
  return (
    <section className="animate-pulse rounded-[24px] border border-[#E5EAF1] bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950">
      <div className="mb-4 flex justify-between">
        <div className="h-5 w-32 rounded bg-zinc-200 dark:bg-zinc-800" />
        <div className="h-4 w-20 rounded bg-zinc-200 dark:bg-zinc-800" />
      </div>
      <div className="mb-4 h-16 rounded-xl bg-zinc-100 dark:bg-zinc-900" />
      <div className="h-12 rounded-xl bg-zinc-200 dark:bg-zinc-800" />
    </section>
  );
}

function SectionSkeleton() {
  return (
    <section className="animate-pulse">
      <div className="mb-3 h-5 w-40 rounded bg-zinc-200 dark:bg-zinc-800" />
      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-2">
        <div className="h-28 w-44 shrink-0 rounded-xl bg-zinc-100 dark:bg-zinc-900" />
        <div className="h-28 w-44 shrink-0 rounded-xl bg-zinc-100 dark:bg-zinc-900" />
        <div className="h-28 w-44 shrink-0 rounded-xl bg-zinc-100 dark:bg-zinc-900" />
      </div>
    </section>
  );
}
