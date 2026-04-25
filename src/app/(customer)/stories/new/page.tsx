import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { ArrowLeft } from "lucide-react";
import {
  verifySessionCookie,
  SESSION_COOKIE_NAME,
} from "@/lib/firebase/auth-admin";
import { StoryUploadForm } from "@/components/community/stories/StoryUploadForm";

export const metadata: Metadata = {
  title: "새 스크랩 올리기 · 청광",
  description: "사진을 올려두면 AI가 블로그를 만들어드려요.",
};

export default async function NewScrapbookUploadPage() {
  const jar = await cookies();
  try {
    await verifySessionCookie(jar.get(SESSION_COOKIE_NAME)?.value);
  } catch {
    redirect(`/login?next=${encodeURIComponent("/stories/new")}`);
  }

  return (
    <div className="mx-auto min-h-screen max-w-2xl px-4 pt-2 pb-24">
      <header className="py-4">
        <Link
          href="/stories"
          className="inline-flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
        >
          <ArrowLeft className="h-3 w-3" aria-hidden /> 스크랩북으로
        </Link>
        <h1 className="mt-2 text-[22px] font-bold tracking-tight">
          새 스크랩 올리기
        </h1>
        <p className="mt-1 text-[13px] text-zinc-500">
          사진 1~5장 + 짧은 메모를 올리면 하루 안에 블로그로 만들어드려요
        </p>
      </header>
      <StoryUploadForm />
    </div>
  );
}
