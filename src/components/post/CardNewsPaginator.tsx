"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { shouldUnoptimizeImage } from "@/lib/image/should-unoptimize";

/**
 * v1.12 cycle #25 partner-content-formats · §5.3 (디자인 보완 v0.3).
 *
 * 카드뉴스 슬라이드 client paginator — 핀터레스트·인스타 카드뉴스 패턴.
 *
 * 디자인:
 *  - 4:5 종횡비 (모바일 풀폭, 데스크탑 max-w-md 카루셀)
 *  - 슬라이드별 배경 이미지 (photoPool 라운드 로빈) + 어두운 그라디언트 오버레이
 *  - 흰색 큰 타이포 (prose-cardnews 클래스)
 *  - 좌상단 시리얼 "01 / 06" + 우상단 매장명 워터마크
 *  - 첫·마지막 슬라이드 강조 마커
 *  - 좌우 스와이프 (CSS scroll-snap) + 화살표 + dots + 키보드
 */
interface Props {
  slideHtmls: string[];
  photoPool: string[];
  companyName: string;
}

export function CardNewsPaginator({
  slideHtmls,
  photoPool,
  companyName,
}: Props) {
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

  function bgFor(i: number): string | null {
    if (photoPool.length === 0) return null;
    return photoPool[i % photoPool.length];
  }

  function gradientFor(i: number): string {
    // 사진 없는 슬라이드용 폴백 그라디언트 — 슬라이드별 색조 변주
    const palettes = [
      "from-blue-600 via-blue-700 to-indigo-900",
      "from-purple-600 via-pink-600 to-rose-700",
      "from-emerald-600 via-teal-700 to-cyan-800",
      "from-amber-500 via-orange-600 to-red-700",
      "from-slate-700 via-zinc-800 to-black",
      "from-fuchsia-600 via-purple-700 to-violet-900",
    ];
    return palettes[i % palettes.length];
  }

  function slideMarker(i: number): string | null {
    if (i === 0) return "👀 시작";
    if (i === total - 1) return "🎯 CTA";
    return null;
  }

  return (
    <div className="mx-auto w-full max-w-md">
      {/* 슬라이드 컨테이너 — 4:5 aspect */}
      <div
        ref={containerRef}
        onScroll={onScroll}
        role="region"
        aria-label="카드뉴스 슬라이드"
        className="flex snap-x snap-mandatory overflow-x-auto rounded-2xl shadow-lg"
        style={{ scrollbarWidth: "none" }}
      >
        {slideHtmls.map((html, i) => {
          const bg = bgFor(i);
          return (
            <article
              key={i}
              aria-roledescription="slide"
              aria-label={`${i + 1} / ${total}`}
              className={`relative aspect-[4/5] min-w-full snap-start overflow-hidden ${
                bg
                  ? "bg-zinc-900"
                  : `bg-gradient-to-br ${gradientFor(i)}`
              }`}
            >
              {/* 배경 이미지 */}
              {bg ? (
                <Image
                  src={bg}
                  alt=""
                  fill
                  sizes="(max-width: 640px) 100vw, 448px"
                  unoptimized={shouldUnoptimizeImage(bg)}
                  className="object-cover"
                  priority={i === 0}
                />
              ) : null}

              {/* 그라디언트 오버레이 (가독성) */}
              <div
                className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-black/30"
                aria-hidden
              />

              {/* 좌상단 시리얼 + 마커 */}
              <div className="absolute left-4 top-4 flex items-center gap-2 text-[11px] font-bold tracking-widest text-white/90">
                <span className="rounded-full bg-white/20 px-2 py-0.5 backdrop-blur-sm">
                  {String(i + 1).padStart(2, "0")} / {String(total).padStart(2, "0")}
                </span>
                {slideMarker(i) ? (
                  <span className="rounded-full bg-white/20 px-2 py-0.5 backdrop-blur-sm">
                    {slideMarker(i)}
                  </span>
                ) : null}
              </div>

              {/* 우상단 매장명 워터마크 */}
              <div className="absolute right-4 top-4 max-w-[60%] truncate text-right text-[11px] font-semibold text-white/80">
                {companyName}
              </div>

              {/* 본문 — 하단 정렬, 흰색 큰 타이포 */}
              <div
                className="prose-cardnews absolute inset-x-0 bottom-0 px-6 pb-10 pt-8 text-white"
                // eslint-disable-next-line react/no-danger -- server에서 sanitize됨
                dangerouslySetInnerHTML={{ __html: html }}
              />
            </article>
          );
        })}
      </div>

      {/* 좌우 화살표 */}
      {total > 1 ? (
        <>
          <button
            type="button"
            onClick={() => goto(idx - 1)}
            disabled={idx === 0}
            aria-label="이전 슬라이드"
            className="absolute left-2 top-1/2 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-zinc-700 shadow-md backdrop-blur-sm hover:bg-white disabled:opacity-30 sm:flex"
            style={{ marginLeft: "-1.5rem" }}
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={() => goto(idx + 1)}
            disabled={idx === total - 1}
            aria-label="다음 슬라이드"
            className="absolute right-2 top-1/2 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-zinc-700 shadow-md backdrop-blur-sm hover:bg-white disabled:opacity-30 sm:flex"
            style={{ marginRight: "-1.5rem" }}
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </>
      ) : null}

      {/* dots indicator + 카운터 */}
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
                  ? "w-8 bg-zinc-900 dark:bg-zinc-100"
                  : "w-2 bg-zinc-300 dark:bg-zinc-700"
              }`}
            />
          ))}
        </div>
      ) : null}

      {total > 1 ? (
        <p className="mt-2 text-center text-xs text-zinc-500">
          {idx + 1} / {total}
        </p>
      ) : null}
    </div>
  );
}
