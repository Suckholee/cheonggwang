/**
 * v1.6 — 고객 스크랩북(/stories/new) 업로드 후 처리 중 스피너.
 * v1.7 P8: 패널 customer-story는 제거되었지만 스크랩북 업로드 흐름은 v2 정리 대상으로 보존.
 */
export function StoryGeneratingState() {
  return (
    <div
      role="status"
      className="flex flex-col items-center justify-center gap-3 py-12 text-center"
    >
      <div
        className="h-10 w-10 animate-spin rounded-full border-4 border-zinc-200 border-t-blue-600 dark:border-zinc-700 dark:border-t-blue-400"
        aria-hidden
      />
      <p className="text-sm text-zinc-700 dark:text-zinc-300">
        사진을 저장하고 있어요…
      </p>
      <p className="text-xs text-zinc-500">
        업로드된 사진은 스크랩북에 보관됩니다.
      </p>
    </div>
  );
}
