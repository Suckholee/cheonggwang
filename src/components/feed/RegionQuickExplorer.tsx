"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { REGION_PRESETS } from "@/domain/region-presets";

// Emoji mapping for popular regions to make them visually premium and distinctive
const REGION_EMOJIS: Record<string, string> = {
  "전국": "🌍",
  "서울 강남구": "🏢",
  "서울 서초구": "💼",
  "서울 마포구": "🎨",
  "서울 종로구": "🏛️",
  "서울 용산구": "🗼",
  "서울 성동구": "🌳",
  "부산 해운대구": "🌊",
  "부산 수영구": "Bridge", // Fallback text or bridge icon
  "대구 중구": "🌆",
  "인천 연수구": "🚢",
  "경기 성남시 분당구": "🏠",
  "경기 수원시": "🏰",
  "경기 용인시": "🎡",
};

export function RegionQuickExplorer() {
  const router = useRouter();
  const sp = useSearchParams();
  const pathname = usePathname();
  const currentRegionParam = sp.get("region") ?? "";

  function handleRegionClick(value: string) {
    const params = new URLSearchParams(sp);
    if (value) {
      params.set("region", value);
    } else {
      params.delete("region");
    }
    const qs = params.toString();
    const targetPath = pathname || "/discover";
    router.replace(qs ? `${targetPath}?${qs}` : targetPath);
  }

  // Get active region label
  const activePreset = REGION_PRESETS.find((p) => p.value === currentRegionParam);
  const activeLabel = activePreset?.label ?? "전국";

  return (
    <section className="py-4 border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-950/20">
      <div className="px-4 sm:px-6 mb-3">
        <div className="flex items-center gap-2">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#2563EB]/10 text-[#2563EB] dark:bg-[#3B82F6]/10 dark:text-[#3B82F6]">
            📍
          </span>
          <h2 className="text-sm font-extrabold tracking-tight text-zinc-900 dark:text-zinc-50">
            지역 기반 피드 둘러보기
          </h2>
        </div>
        <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
          {currentRegionParam ? (
            <span>
              현재 <strong className="text-[#2563EB] dark:text-[#3B82F6]">{activeLabel}</strong>의 소식을 보고 있어요. 다른 지역도 선택해보세요!
            </span>
          ) : (
            "가까운 우리 동네의 업체를 찾고 생생한 홍보와 청소 팁을 구경해보세요."
          )}
        </p>
      </div>

      <div className="flex gap-2.5 overflow-x-auto px-4 pb-2.5 sm:px-6 no-scrollbar snap-x snap-mandatory">
        {REGION_PRESETS.map((p) => {
          const isAll = p.value === "";
          const isActive = currentRegionParam === p.value;
          const emoji = REGION_EMOJIS[p.label] || (isAll ? "🌍" : "📍");
          
          return (
            <button
              key={p.label}
              onClick={() => handleRegionClick(p.value)}
              className={`snap-start shrink-0 flex flex-col items-center justify-center w-24 p-3 rounded-2xl transition-all duration-200 focus:outline-none ${
                isActive
                  ? "bg-gradient-to-b from-[#3B82F6] to-[#2563EB] text-white font-extrabold border-b-4 border-[#1D4ED8] shadow-[0_8px_16px_rgba(37,99,235,0.25)] scale-[1.02]"
                  : "bg-white text-zinc-700 font-bold border border-zinc-200 border-b-4 border-b-zinc-300 shadow-sm hover:border-[#2563EB]/30 hover:scale-[1.02] active:scale-[0.96] active:translate-y-[2px] dark:bg-zinc-900 dark:text-zinc-300 dark:border-zinc-800 dark:border-b-zinc-950"
              }`}
            >
              <span className={`text-2xl mb-1.5 transition-transform ${isActive ? "animate-bounce" : "group-hover:scale-110"}`}>
                {emoji === "Bridge" ? "🌉" : emoji}
              </span>
              <span className="text-[11px] leading-tight tracking-tight text-center break-keep line-clamp-2">
                {isAll ? "전체 지역" : p.label.replace("서울 ", "").replace("경기 ", "").replace("부산 ", "")}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
