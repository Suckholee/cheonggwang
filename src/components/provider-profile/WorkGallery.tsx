import Image from "next/image";
import { QUOTE_CATEGORY_LABELS } from "@/domain/quote-category";
import { shouldUnoptimizeImage } from "@/lib/image/should-unoptimize";
import type { WorkCase } from "@/types/work-case";
import { EmptySection } from "./EmptySection";

interface Props {
  cases: WorkCase[];
}

function formatMMDD(date: Date): string {
  const kst = new Date(date.getTime() + 9 * 60 * 60 * 1000);
  const m = kst.getUTCMonth() + 1;
  const d = kst.getUTCDate();
  return `${m}/${d}`;
}

function WorkCard({ work }: { work: WorkCase }) {
  const label = QUOTE_CATEGORY_LABELS[work.category];
  return (
    <article className="flex flex-col gap-2 rounded-xl border border-zinc-200 bg-white p-2 dark:border-zinc-800 dark:bg-zinc-950">
      <div className="grid grid-cols-2 gap-1">
        <div className="relative aspect-square overflow-hidden rounded-lg bg-zinc-100 dark:bg-zinc-900">
          {work.beforePhoto?.url && (
            <Image
              src={work.beforePhoto.url}
              alt={`${label} Before`}
              fill
              sizes="(max-width: 640px) 45vw, 200px"
              unoptimized={shouldUnoptimizeImage(work.beforePhoto.url)}
              className="object-cover"
            />
          )}
          <span className="absolute left-1 top-1 rounded bg-zinc-900/80 px-1.5 py-0.5 text-[10px] font-semibold text-white">
            B
          </span>
        </div>
        <div className="relative aspect-square overflow-hidden rounded-lg bg-zinc-100 dark:bg-zinc-900">
          {work.afterPhoto?.url && (
            <Image
              src={work.afterPhoto.url}
              alt={`${label} After`}
              fill
              sizes="(max-width: 640px) 45vw, 200px"
              unoptimized={shouldUnoptimizeImage(work.afterPhoto.url)}
              className="object-cover"
            />
          )}
          <span className="absolute left-1 top-1 rounded bg-indigo-600/90 px-1.5 py-0.5 text-[10px] font-semibold text-white">
            A
          </span>
        </div>
      </div>
      <div className="flex items-start justify-between gap-2 px-1">
        <div className="min-w-0">
          <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-[11px] font-medium text-indigo-700 dark:bg-indigo-950/30 dark:text-indigo-400">
            {label}
          </span>
          <p className="mt-1 truncate text-sm font-medium text-zinc-900 dark:text-zinc-50">
            {work.sizeLabel}
          </p>
        </div>
        <span className="shrink-0 pt-1 text-xs text-zinc-500">
          {formatMMDD(work.completedAt)}
        </span>
      </div>
    </article>
  );
}

export function WorkGallery({ cases }: Props) {
  return (
    <section className="mt-8">
      <div className="mb-3 flex items-baseline justify-between">
        <h2 className="text-base font-bold">Before · After</h2>
        {cases.length > 0 && (
          <span className="text-xs text-zinc-500">최근 {cases.length}건</span>
        )}
      </div>
      {cases.length === 0 ? (
        <EmptySection icon="📷" title="작업 사진" />
      ) : (
        <div className="grid grid-cols-2 gap-2">
          {cases.map((w) => (
            <WorkCard key={w.id} work={w} />
          ))}
        </div>
      )}
    </section>
  );
}
