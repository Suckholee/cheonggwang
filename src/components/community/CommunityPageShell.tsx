import { BrandLogo } from "@/components/ui/BrandLogo";
import { CommunityPanelTabs } from "./CommunityPanelTabs";
import type { PanelSlug } from "@/lib/feed/panel-config";

interface Props {
  active: PanelSlug;
  title: string;
  tagline: string;
  children: React.ReactNode;
}

export function CommunityPageShell({
  active,
  title,
  tagline,
  children,
}: Props) {
  return (
    <div className="mx-auto min-h-screen max-w-2xl bg-[linear-gradient(180deg,#f4f9ff_0%,#ffffff_18%,#ffffff_100%)] pt-2 pb-24 dark:bg-zinc-950">
      <header className="sticky top-0 z-50 mb-4 border-b border-white/70 bg-[#f4f9ff]/90 px-4 py-3 backdrop-blur dark:border-zinc-800/70 dark:bg-zinc-950/90">
        <div className="flex items-center justify-between">
          <BrandLogo />
          <span className="rounded-full border border-[#d8e6ff] bg-white/80 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.16em] text-[#2563EB]/80 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400">
            Community
          </span>
        </div>
        <div className="mt-2.5">
          <CommunityPanelTabs active={active} />
        </div>
      </header>
      <div className="px-4">
        <div className="mb-4 rounded-2xl border border-[#dbe8fb] bg-[linear-gradient(135deg,#ffffff_0%,#eef6ff_46%,#dcebff_100%)] px-4.5 py-4 shadow-[0_12px_30px_rgba(43,102,246,0.06)] dark:border-zinc-850 dark:bg-gradient-to-br dark:from-zinc-900 dark:to-zinc-950">
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#2563EB]/70 dark:text-zinc-450">
            Curated Feed
          </p>
          <h1 className="mt-0.5 text-[20px] font-black tracking-tight text-zinc-950 dark:text-zinc-50">
            {title}
          </h1>
          <p className="mt-1 text-[12.5px] leading-relaxed text-zinc-600 dark:text-zinc-400">
            {tagline}
          </p>
        </div>
        {children}
      </div>
    </div>
  );
}
