"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

/**
 * v1.12 cycle #25 partner-content-formats · §5.3 (H1·L4 결의).
 *
 * 카드뉴스 슬라이드 client paginator.
 *  - server에서 미리 sanitize된 HTML 배열을 prop으로 받음
 *  - CSS scroll-snap-x mandatory + scroll event로 idx 동기화
 *  - 모바일: 자연 swipe / 데스크탑: 좌우 화살표 + dots indicator + ArrowLeft/Right 키보드
 */
interface Props {
  slideHtmls: string[];
}

export function CardNewsPaginator({ slideHtmls }: Props) {
  const [idx, setIdx] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const total = slideHtmls.length;

  function goto(i: number) {
    const next = Math.max(0, Math.min(total - 1, i));
    setIdx(next);
    const child = containerRef.current?.children[next] as
      | HTMLElement
      | undefined;
    child?.scrollIntoView({ behavior: "smooth", inline: "start", block: "nearest" });
  }

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        goto(idx - 1);
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        goto(idx + 1);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idx, total]);

  function onScroll(e: React.UIEvent<HTMLDivElement>) {
    const w = e.currentTarget.clientWidth;
    if (w === 0) return;
    const next = Math.round(e.currentTarget.scrollLeft / w);
    if (next !== idx) setIdx(next);
  }

  return (
    <div className="relative">
      {/* 슬라이드 컨테이너 */}
      <div
        ref={containerRef}
        onScroll={onScroll}
        className="flex snap-x snap-mandatory overflow-x-auto rounded-2xl bg-zinc-50 dark:bg-zinc-900"
        style={{ scrollbarWidth: "none" }}
      >
        {slideHtmls.map((html, i) => (
          <article
            key={i}
            aria-roledescription="slide"
            aria-label={`${i + 1} / ${total}`}
            className="prose-promo snap-start min-w-full px-6 py-10 text-[15px] leading-7 text-zinc-800 dark:text-zinc-200"
            // eslint-disable-next-line react/no-danger -- server에서 sanitize됨
            dangerouslySetInnerHTML={{ __html: html }}
          />
        ))}
      </div>

      {/* 좌우 화살표 (데스크탑) */}
      {total > 1 ? (
        <>
          <button
            type="button"
            onClick={() => goto(idx - 1)}
            disabled={idx === 0}
            aria-label="이전 슬라이드"
            className="absolute left-2 top-1/2 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white shadow-md disabled:opacity-30 sm:flex dark:bg-zinc-800"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={() => goto(idx + 1)}
            disabled={idx === total - 1}
            aria-label="다음 슬라이드"
            className="absolute right-2 top-1/2 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white shadow-md disabled:opacity-30 sm:flex dark:bg-zinc-800"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </>
      ) : null}

      {/* dots indicator */}
      {total > 1 ? (
        <div className="mt-4 flex items-center justify-center gap-2">
          {slideHtmls.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => goto(i)}
              aria-label={`${i + 1}/${total} 슬라이드로 이동`}
              aria-current={i === idx ? "true" : undefined}
              className={`h-2 rounded-full transition-all ${
                i === idx
                  ? "w-8 bg-blue-600 dark:bg-blue-400"
                  : "w-2 bg-zinc-300 dark:bg-zinc-700"
              }`}
            />
          ))}
        </div>
      ) : null}

      {/* 슬라이드 카운터 텍스트 */}
      <p className="mt-2 text-center text-xs text-zinc-500">
        {idx + 1} / {total}
      </p>
    </div>
  );
}
