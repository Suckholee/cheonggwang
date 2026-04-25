export function FeedSkeleton() {
  return (
    <div className="space-y-6 py-5">
      {Array.from({ length: 3 }).map((_, railIdx) => (
        <div key={railIdx}>
          <div className="px-4 sm:px-6">
            <div className="h-5 w-40 animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />
          </div>
          <div className="mt-3 flex gap-3 overflow-hidden px-4 sm:px-6">
            {Array.from({ length: 5 }).map((_, cardIdx) => (
              <div key={cardIdx} className="w-[220px] flex-shrink-0">
                <div className="aspect-[4/3] animate-pulse rounded-lg bg-zinc-200 dark:bg-zinc-800" />
                <div className="mt-2 h-4 w-3/4 animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />
                <div className="mt-1 h-3 w-1/2 animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export function FeedControlsSkeleton() {
  return (
    <div className="sticky top-0 z-20 border-b border-zinc-200 bg-white/95 backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/95">
      <div className="flex items-center gap-3 px-4 py-3 sm:px-6">
        <div className="h-6 w-16 animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />
        <div className="h-9 flex-1 max-w-md animate-pulse rounded-full bg-zinc-200 dark:bg-zinc-800" />
        <div className="h-6 w-14 animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />
      </div>
      <div className="flex items-center gap-2 px-4 pb-3 sm:px-6">
        <div className="h-8 w-32 animate-pulse rounded border border-zinc-200 dark:border-zinc-800" />
        <div className="h-8 w-48 animate-pulse rounded bg-zinc-100 dark:bg-zinc-900" />
      </div>
    </div>
  );
}
