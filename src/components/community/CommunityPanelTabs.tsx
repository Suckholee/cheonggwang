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
      className="flex gap-5 px-1"
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
              "relative pb-2 text-[14.5px] transition-all duration-200 font-bold",
              isActive
                ? "text-[#2563EB] dark:text-[#5B8DF6] after:absolute after:bottom-0 after:left-0 after:h-[2.5px] after:w-full after:rounded-full after:bg-[#2563EB] dark:after:bg-[#5B8DF6]"
                : "text-zinc-500 hover:text-zinc-850 dark:text-zinc-400 dark:hover:text-zinc-200",
            ].join(" ")}
          >
            {cfg.label}
          </Link>
        );
      })}
    </nav>
  );
}
