import Link from "next/link";
import { PANEL_ORDER, PANELS, type PanelSlug } from "@/lib/feed/panel-config";

interface Props {
  active: PanelSlug;
}

/**
 * v1.6 Phase 2: 3패널 sticky 탭. 간단 버전 — Phase 3에서 애니메이션/검색/서브필터와 결합 예정.
 */
export function CommunityPanelTabs({ active }: Props) {
  return (
    <nav
      role="tablist"
      aria-label="커뮤니티 패널"
      className="flex gap-2 rounded-[22px] border border-[#dbe8fb] bg-white/80 p-1 shadow-[0_8px_20px_rgba(43,102,246,0.05)] dark:border-zinc-800 dark:bg-zinc-900"
    >
      {PANEL_ORDER.map((slug) => {
        const cfg = PANELS[slug];
        const isActive = slug === active;
        return (
          <Link
            key={slug}
            href={`/community/${slug}`}
            role="tab"
            aria-selected={isActive}
            aria-current={isActive ? "page" : undefined}
            className={[
              "relative flex-1 rounded-[18px] px-3 py-2.5 text-center text-sm font-semibold transition-colors",
              isActive
                ? "bg-[#edf4ff] text-[#2563EB] shadow-sm dark:bg-zinc-800 dark:text-zinc-50"
                : "text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200",
            ].join(" ")}
          >
            {cfg.label}
          </Link>
        );
      })}
    </nav>
  );
}
