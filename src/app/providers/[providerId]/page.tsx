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
    <div className="mx-auto min-h-screen max-w-xl px-4 py-4">
      <Link
        href="/received"
        className="mb-4 inline-flex items-center gap-1 text-sm text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
      >
        <ChevronLeft className="h-4 w-4" aria-hidden />
        돌아가기
      </Link>
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
