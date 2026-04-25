import { Suspense } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { ImagePlus } from "lucide-react";
import {
  verifySessionCookie,
  SESSION_COOKIE_NAME,
} from "@/lib/firebase/auth-admin";
import { storyScrapbookRepository } from "@/lib/firebase/story-scrapbook-repository";
import { ScrapbookItemCard } from "@/components/community/stories/ScrapbookItemCard";

export const metadata: Metadata = {
  title: "내 스크랩북 · 청광",
  description: "사진을 올려두면 AI가 블로그를 만들어드려요.",
};

interface PageProps {
  searchParams: Promise<{ uploaded?: string }>;
}

export default function ScrapbookPage(props: PageProps) {
  return (
    <div className="mx-auto min-h-screen max-w-2xl px-4 pt-2 pb-24">
      <header className="py-4">
        <h1 className="text-[22px] font-bold tracking-tight">내 스크랩북</h1>
        <p className="mt-1 text-[13px] text-zinc-500">
          사진을 올려두면 하루 안에 AI가 블로그를 만들어드려요
        </p>
      </header>
      <div className="mb-4">
        <Link
          href="/stories/new"
          className="flex items-center justify-center gap-2 rounded-full bg-indigo-600 px-5 py-3 text-sm font-medium text-white transition-colors hover:bg-indigo-700"
        >
          <ImagePlus className="h-4 w-4" aria-hidden />
          새 스크랩 올리기
        </Link>
      </div>
      <Suspense fallback={<ListSkeleton />}>
        <ScrapbookBody searchParams={props.searchParams} />
      </Suspense>
    </div>
  );
}

function ListSkeleton() {
  return (
    <div className="flex flex-col gap-2" aria-label="불러오는 중">
      <div className="h-24 animate-pulse rounded-xl bg-zinc-100 dark:bg-zinc-900" />
      <div className="h-24 animate-pulse rounded-xl bg-zinc-100 dark:bg-zinc-900" />
    </div>
  );
}

async function ScrapbookBody({
  searchParams,
}: {
  searchParams: Promise<{ uploaded?: string }>;
}) {
  const { uploaded } = await searchParams;
  const jar = await cookies();
  let uid: string;
  try {
    uid = await verifySessionCookie(jar.get(SESSION_COOKIE_NAME)?.value);
  } catch {
    redirect(`/login?next=${encodeURIComponent("/stories")}`);
  }
  const items = await storyScrapbookRepository.listByOwner(uid, 50);
  return (
    <div className="flex flex-col gap-3">
      {uploaded === "1" && (
        <div
          role="status"
          className="rounded-lg bg-emerald-50 p-3 text-xs text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-200"
        >
          저장됐어요. AI가 블로그 글을 만들어 공개 커뮤니티에 게시합니다.
        </div>
      )}
      {items.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="flex flex-col gap-2">
          {items.map((item) => (
            <ScrapbookItemCard key={item.id} item={item} />
          ))}
        </div>
      )}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-zinc-300 p-8 text-center dark:border-zinc-700">
      <ImagePlus className="h-10 w-10 text-zinc-400" aria-hidden />
      <div>
        <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          아직 올린 스크랩이 없어요
        </p>
        <p className="mt-1 text-xs text-zinc-500">
          사진 1~5장을 올려주세요. 하루 안에 AI가 블로그로 만들어드립니다.
        </p>
      </div>
    </div>
  );
}
