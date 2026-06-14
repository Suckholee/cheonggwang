import { Suspense } from "react";
import { redirect } from "next/navigation";
import Link from "next/link";
import { cookies } from "next/headers";
import { customAlphabet } from "nanoid";
import {
  SESSION_COOKIE_NAME,
  tryVerifySessionCookie,
} from "@/lib/firebase/auth-admin";
import {
  QUOTE_CATEGORY_EMOJIS,
  QUOTE_CATEGORY_LABELS,
  QUOTE_CATEGORY_SUBTITLES,
  isQuoteCategory,
  type QuoteCategory,
} from "@/domain/quote-category";
import { providerRepository } from "@/lib/firebase/provider-repository";
import { QuoteForm } from "@/components/quote/QuoteForm";
import { BrandLogo } from "@/components/ui/BrandLogo";
import { ChevronLeft, Home, Sparkles } from "lucide-react";

const nanoRequestId = customAlphabet(
  "0123456789abcdefghijklmnopqrstuvwxyz",
  16,
);

type SearchParams = { category?: string; providerId?: string };

export const metadata = {
  title: "견적 요청 — 청광",
};

export default function QuoteNewPage(props: {
  searchParams: Promise<SearchParams>;
}) {
  return (
    <div className="min-h-screen w-full bg-[linear-gradient(180deg,#f4f9ff_0%,#ffffff_18%,#ffffff_100%)] px-5 pt-3 pb-24 dark:bg-none">
      <header className="sticky top-0 z-40 -mx-5 mb-5 border-b border-white/70 bg-[#f4f9ff]/90 px-5 py-3 backdrop-blur dark:border-zinc-800/70 dark:bg-zinc-950/90">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Link
              href="/"
              className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/80 border border-zinc-200 text-zinc-600 hover:text-zinc-900 shadow-sm transition-all hover:scale-105 active:scale-95 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400"
              aria-label="홈으로 가기"
            >
              <ChevronLeft className="h-4.5 w-4.5" strokeWidth={2.5} />
            </Link>
            <BrandLogo />
          </div>
          <span className="rounded-full border border-[#d8e6ff] bg-white/80 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#2563EB]/80 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400">
            Request
          </span>
        </div>
        <style dangerouslySetInnerHTML={{__html: `
          @keyframes float {
            0%, 100% { transform: translateY(0px) scale(1); }
            50% { transform: translateY(-5px) scale(1.02); }
          }
        `}} />
        <div className="mt-4 flex items-center justify-between gap-4 rounded-[28px] border border-[#dbe8fb] bg-[linear-gradient(135deg,#ffffff_0%,#eef6ff_46%,#dcebff_100%)] px-5 py-5 shadow-[0_14px_34px_rgba(43,102,246,0.08)] dark:border-zinc-850 dark:bg-gradient-to-br dark:from-zinc-900 dark:to-zinc-950 animate-[page-fade-in_0.35s_ease-out]">
          <div className="flex-1">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#2563EB]/70 dark:text-zinc-400">
              Get a Quote
            </p>
            <h1 className="mt-1 text-[26px] font-black tracking-tight text-zinc-950 dark:text-zinc-50">
              견적 요청
            </h1>
            <p className="mt-2 text-[13px] leading-5 text-zinc-650 dark:text-zinc-400">
              필요한 청소 정보를 입력하고 2분 만에 최적의 견적 제안을 받아보세요.
            </p>
          </div>
          
          {/* Animated illustration on the right */}
          <div className="relative shrink-0 flex items-center justify-center w-20 h-20 bg-white/60 dark:bg-zinc-800/40 rounded-2xl border border-white/80 dark:border-zinc-700/30 shadow-[inset_0_2px_4px_rgba(255,255,255,0.6)] overflow-hidden animate-[float_3.5s_ease-in-out_infinite] z-10">
            <Home className="h-10 w-10 text-[#2563EB]/95 dark:text-blue-400/90" strokeWidth={1.5} />
            <Sparkles className="absolute top-2.5 right-2.5 h-4.5 w-4.5 text-amber-400 animate-[pulse_1.5s_ease-in-out_infinite]" />
            <Sparkles className="absolute bottom-3 left-3 h-3.5 w-3.5 text-amber-300 animate-[pulse_2s_ease-in-out_infinite]" />
          </div>
        </div>
      </header>

      <Suspense fallback={<FormSkeleton />}>
        <AuthedQuoteForm searchParams={props.searchParams} />
      </Suspense>
    </div>
  );
}

function FormSkeleton() {
  return (
    <div className="animate-pulse space-y-4">
      <div className="h-40 w-full rounded-[24px] bg-[#eef5ff] dark:bg-zinc-900" />
      <div className="h-20 w-full rounded-[24px] bg-[#eef5ff] dark:bg-zinc-900" />
      <div className="h-20 w-full rounded-[24px] bg-[#eef5ff] dark:bg-zinc-900" />
    </div>
  );
}

async function AuthedQuoteForm({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const jar = await cookies();
  const uid = await tryVerifySessionCookie(
    jar.get(SESSION_COOKIE_NAME)?.value,
  );
  if (!uid) {
    redirect(`/login?next=${encodeURIComponent("/quote/new")}`);
  }

  const sp = await searchParams;

  // providerId 우선: 청명의 첫 번째 category를 initialCategory로 설정
  let preferredProvider: {
    id: string;
    companyName: string;
    firstCategory: QuoteCategory;
  } | null = null;

  if (sp.providerId) {
    const provider = await providerRepository.get(sp.providerId);
    if (provider && provider.categories.length > 0) {
      preferredProvider = {
        id: provider.id,
        companyName: provider.companyName,
        firstCategory: provider.categories[0],
      };
    }
  }

  const initialCategory: QuoteCategory | undefined =
    preferredProvider?.firstCategory ??
    (sp.category && isQuoteCategory(sp.category) ? sp.category : undefined);

  const requestId = nanoRequestId();

  return (
    <>
      {preferredProvider && (
        <div className="mb-4 flex items-start gap-2 rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-3 text-sm dark:border-indigo-900/50 dark:bg-indigo-950/30">
          <span className="mt-0.5 text-base" aria-hidden>
            🎯
          </span>
          <div className="flex-1">
            <p className="font-semibold text-indigo-700 dark:text-indigo-300">
              {preferredProvider.companyName}에게 우선 전달
            </p>
            <p className="mt-0.5 text-xs text-indigo-600 dark:text-indigo-400">
              같은 카테고리 다른 청명에게도 자동 매칭됩니다
            </p>
          </div>
        </div>
      )}
      {initialCategory && !preferredProvider && (
        <p className="mb-6 text-sm text-zinc-600 dark:text-zinc-400">
          {QUOTE_CATEGORY_EMOJIS[initialCategory]}{" "}
          {QUOTE_CATEGORY_LABELS[initialCategory]} ·{" "}
          {QUOTE_CATEGORY_SUBTITLES[initialCategory]}
        </p>
      )}
      <QuoteForm
        requestId={requestId}
        initialCategory={initialCategory}
        preferredProviderId={preferredProvider?.id}
      />
    </>
  );
}
