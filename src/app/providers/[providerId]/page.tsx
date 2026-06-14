import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { providerRepository } from "@/lib/firebase/provider-repository";
import { workCaseRepository } from "@/lib/firebase/work-case-repository";
import { reviewRepository } from "@/lib/firebase/review-repository";
import { postRepository } from "@/lib/firebase/post-repository";
import { ProviderHero } from "@/components/provider-profile/ProviderHero";
import { ProviderMeta } from "@/components/provider-profile/ProviderMeta";
import { ProviderStats } from "@/components/provider-profile/ProviderStats";
import { PriceBookList } from "@/components/provider-profile/PriceBookList";
import { WorkGallery } from "@/components/provider-profile/WorkGallery";
import { ReviewList } from "@/components/provider-profile/ReviewList";
import { BottomCTA } from "@/components/provider-profile/BottomCTA";
import { NewsSection } from "@/components/provider-profile/NewsSection";

export const metadata = {
  title: "청명 · 청광",
};

type Params = { providerId: string };

export default function ProviderProfilePage(props: {
  params: Promise<Params>;
}) {
  return (
    <div className="min-h-screen w-full bg-[linear-gradient(180deg,#f4f9ff_0%,#ffffff_18%,#ffffff_100%)] px-5 pt-3 pb-28 dark:bg-none">
      <header className="sticky top-0 z-40 -mx-5 mb-5 border-b border-white/70 bg-[#f4f9ff]/90 px-5 py-3.5 backdrop-blur dark:border-zinc-800/70 dark:bg-zinc-950/90">
        <div className="flex items-center justify-between">
          <Link
            href="/received"
            className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/80 border border-zinc-200 text-zinc-600 hover:text-zinc-900 shadow-sm transition-all hover:scale-105 active:scale-95 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400"
            aria-label="돌아가기"
          >
            <ChevronLeft className="h-4.5 w-4.5" strokeWidth={2.5} />
          </Link>
          <h1 className="text-[17px] font-extrabold tracking-tight text-zinc-950 dark:text-zinc-50">
            청명 프로필
          </h1>
          <div className="w-8" />
        </div>
      </header>
      <Suspense fallback={<ProfileSkeleton />}>
        <ProfileBody params={props.params} />
      </Suspense>
    </div>
  );
}

function ProfileSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="aspect-[4/3] w-full rounded-2xl bg-zinc-100 dark:bg-zinc-900" />
      <div className="mt-6 h-8 w-48 rounded bg-zinc-200 dark:bg-zinc-800" />
      <div className="mt-2 h-4 w-64 rounded bg-zinc-200 dark:bg-zinc-800" />
      <div className="mt-5 grid grid-cols-3 gap-2">
        <div className="h-16 rounded-xl bg-zinc-100 dark:bg-zinc-900" />
        <div className="h-16 rounded-xl bg-zinc-100 dark:bg-zinc-900" />
        <div className="h-16 rounded-xl bg-zinc-100 dark:bg-zinc-900" />
      </div>
      <div className="mt-8 h-48 rounded-2xl bg-zinc-100 dark:bg-zinc-900" />
    </div>
  );
}

async function ProfileBody({ params }: { params: Promise<Params> }) {
  const { providerId } = await params;

  const [provider, workCases, reviews, posts] = await Promise.all([
    providerRepository.get(providerId),
    workCaseRepository.listByProvider(providerId, 4),
    reviewRepository.listByProvider(providerId, 3),
    postRepository.listByProvider(providerId, 3),
  ]);

  if (!provider) notFound();

  return (
    <>
      <ProviderHero provider={provider} />
      <ProviderMeta provider={provider} />
      <ProviderStats provider={provider} />
      <PriceBookList entries={provider.priceBook} />
      <WorkGallery cases={workCases} />
      <NewsSection posts={posts} />
      <ReviewList reviews={reviews} totalCount={provider.reviewCount} />
      <BottomCTA providerId={provider.id} />
    </>
  );
}
