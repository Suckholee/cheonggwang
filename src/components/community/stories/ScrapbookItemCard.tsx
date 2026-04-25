import Link from "next/link";
import Image from "next/image";
import { Clock, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { shouldUnoptimizeImage } from "@/lib/image/should-unoptimize";
import { formatRelativeTime } from "@/lib/format/relative-time";
import type { StoryScrapbookItem } from "@/types/story-scrapbook";

interface Props {
  item: StoryScrapbookItem;
}

function StatusBadge({ status }: { status: StoryScrapbookItem["status"] }) {
  if (status === "published") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
        <CheckCircle2 className="h-3 w-3" aria-hidden /> 게시 완료
      </span>
    );
  }
  if (status === "processing") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-2 py-0.5 text-[10px] font-medium text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300">
        <Loader2 className="h-3 w-3 animate-spin" aria-hidden /> 생성 중
      </span>
    );
  }
  if (status === "failed") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2 py-0.5 text-[10px] font-medium text-rose-700 dark:bg-rose-950/40 dark:text-rose-300">
        <AlertCircle className="h-3 w-3" aria-hidden /> 실패
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
      <Clock className="h-3 w-3" aria-hidden /> 배치 대기
    </span>
  );
}

export function ScrapbookItemCard({ item }: Props) {
  const photoCount = item.photoUrls.length;
  const firstPhoto = item.photoUrls[0];

  const body = (
    <div className="flex items-start gap-3 rounded-xl border border-zinc-200 bg-white p-3 transition-colors hover:border-indigo-300 dark:border-zinc-800 dark:bg-zinc-950 dark:hover:border-indigo-700">
      <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-lg bg-zinc-100 dark:bg-zinc-900">
        {firstPhoto && (
          <Image
            src={firstPhoto}
            alt="스크랩 사진"
            fill
            sizes="80px"
            unoptimized={shouldUnoptimizeImage(firstPhoto)}
            className="object-cover"
          />
        )}
        {photoCount > 1 && (
          <span className="absolute bottom-0.5 right-0.5 rounded bg-black/60 px-1.5 py-0.5 text-[10px] font-medium text-white">
            +{photoCount - 1}
          </span>
        )}
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex items-center justify-between gap-2">
          <StatusBadge status={item.status} />
          <span className="shrink-0 text-[11px] text-zinc-500">
            {formatRelativeTime(item.uploadedAt.getTime())}
          </span>
        </div>
        {item.memo && (
          <p className="line-clamp-2 text-xs text-zinc-600 dark:text-zinc-400">
            {item.memo}
          </p>
        )}
        {item.status === "failed" && item.failureReason && (
          <p className="line-clamp-1 text-[11px] text-rose-600 dark:text-rose-400">
            {item.failureReason}
          </p>
        )}
        {item.status === "published" && item.publishedSlug && (
          <p className="text-[11px] text-indigo-600 dark:text-indigo-400">
            공개 커뮤니티에서 보기 →
          </p>
        )}
      </div>
    </div>
  );

  if (item.status === "published" && item.publishedSlug) {
    return (
      <Link
        href={`/community/p/${item.publishedSlug}`}
        aria-label="게시된 블로그 열기"
      >
        {body}
      </Link>
    );
  }
  return body;
}
