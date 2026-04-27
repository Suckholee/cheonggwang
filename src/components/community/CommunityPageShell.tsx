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
    <div className="mx-auto min-h-screen max-w-2xl bg-[linear-gradient(180deg,#f4f9ff_0%,#ffffff_18%,#ffffff_100%)] pt-2 pb-24">
      <header className="sticky top-0 z-50 mb-4 border-b border-white/70 bg-[#f4f9ff]/90 px-4 py-3 backdrop-blur dark:bg-zinc-950/90 dark:border-zinc-900">
        <div className="flex items-center justify-between">
          <BrandLogo />
          <span className="rounded-full border border-[#d8e6ff] bg-white/80 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#2563EB]/80">
            Community
          </span>
        </div>
        <div className="mt-4 rounded-[28px] border border-[#dbe8fb] bg-[linear-gradient(135deg,#ffffff_0%,#eef6ff_46%,#dcebff_100%)] px-5 py-5 shadow-[0_14px_34px_rgba(43,102,246,0.08)]">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#2563EB]/70">
            Curated Feed
          </p>
          <h1 className="mt-1 text-[26px] font-black tracking-tight text-zinc-950 dark:text-zinc-50">
            {title}
          </h1>
          <p className="mt-2 text-[13px] leading-5 text-zinc-600 dark:text-zinc-400">
            {tagline}
          </p>
          <div className="mt-4">
            <CommunityPanelTabs active={active} />
          </div>
        </div>
      </header>
      <div className="px-4">{children}</div>
    </div>
  );
}
