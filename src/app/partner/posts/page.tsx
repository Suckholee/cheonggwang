import { Suspense } from "react";
import { connection } from "next/server";
import Link from "next/link";
import { requirePartnerPage } from "@/lib/auth/require-partner";
import { postRepository } from "@/lib/firebase/post-repository";
import { nextAutoPublishWindow } from "@/lib/partner/auto-publish-window";
import PartnerPostsList from "@/components/partner/PartnerPostsList";

export const metadata = { title: "내 글 · 청광 파트너" };

const WEEKDAY_KO = ["일", "월", "화", "수", "목", "금", "토"];

function formatTime(minute: number): string {
  const h = Math.floor(minute / 60);
  const m = minute % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export default function PartnerPostsPage() {
  return (
    <div className="space-y-6">
      <Suspense fallback={<BannerSkeleton />}>
        <AutoPublishBanner />
      </Suspense>
      <Suspense fallback={<ListSkeleton />}>
        <PostsBody />
      </Suspense>
    </div>
  );
}

async function AutoPublishBanner() {
  await connection();
  const { partner } = await requirePartnerPage();
  const cfg = partner.autoPublish;
  const next = nextAutoPublishWindow(cfg);
  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium">
            자동발행:{" "}
            <span className={cfg.enabled ? "text-emerald-600" : "text-zinc-500"}>
              {cfg.enabled ? "ON" : "OFF"}
            </span>
          </p>
          {cfg.enabled && cfg.weekdays.length > 0 ? (
            <p className="mt-1 text-xs text-zinc-500">
              {cfg.weekdays
                .slice()
                .sort((a, b) => a - b)
                .map((d) => WEEKDAY_KO[d])
                .join("·")}{" "}
              {formatTime(cfg.startMinute)}–{formatTime(cfg.endMinute)} KST
              {next.startsAt
                ? ` · 다음 윈도우: ${next.startsAt.toLocaleString("ko-KR", { timeZone: "Asia/Seoul", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" })}`
                : ""}
            </p>
          ) : (
            <p className="mt-1 text-xs text-zinc-500">
              자동발행을 켜려면 설정에서 요일과 시간을 지정하세요.
            </p>
          )}
        </div>
        <Link
          href="/partner/settings"
          className="text-sm text-blue-600 hover:underline"
        >
          설정 변경
        </Link>
      </div>
    </div>
  );
}

async function PostsBody() {
  await connection();
  const { uid } = await requirePartnerPage();
  const posts = await postRepository.listMyPosts(uid, 100);
  return <PartnerPostsList posts={posts} />;
}

function BannerSkeleton() {
  return (
    <div className="h-20 animate-pulse rounded-lg bg-zinc-100 dark:bg-zinc-800" />
  );
}

function ListSkeleton() {
  return (
    <div className="h-40 animate-pulse rounded-lg bg-zinc-100 dark:bg-zinc-800" />
  );
}
