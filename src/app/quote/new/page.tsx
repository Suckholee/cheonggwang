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
    <div className="mx-auto max-w-xl px-4 py-8">
      <header className="mb-6 flex items-center justify-between">
        <Link
          href="/"
          className="text-sm text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
        >
          ← 홈
        </Link>
      </header>

      <h1 className="mb-2 text-2xl font-bold">견적 요청</h1>
      <Suspense fallback={<FormSkeleton />}>
        <AuthedQuoteForm searchParams={props.searchParams} />
      </Suspense>
    </div>
  );
}

function FormSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="mb-6 h-4 w-40 rounded bg-zinc-200 dark:bg-zinc-800" />
      <div className="h-96 w-full rounded bg-zinc-100 dark:bg-zinc-900" />
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
