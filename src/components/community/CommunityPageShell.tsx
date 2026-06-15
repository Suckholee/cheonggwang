"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Search, Plus } from "lucide-react";
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
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 30);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <div className="mx-auto min-h-screen max-w-2xl bg-[linear-gradient(180deg,#f4f9ff_0%,#ffffff_18%,#ffffff_100%)] pt-2 pb-24 dark:bg-zinc-950">
      <header className={`sticky top-0 z-50 mb-3 border-b border-zinc-200/40 bg-[#f4f9ff]/95 px-4 backdrop-blur dark:border-zinc-850 dark:bg-zinc-950/95 transition-all duration-300 ${
        scrolled ? "py-2.5 shadow-[0_4px_12px_rgba(43,102,246,0.02)]" : "py-3.5"
      }`}>
        <div className="flex flex-col gap-2.5">
          {/* Row 1: Logo & Actions (collapsible on scroll) */}
          <div className={`flex items-center justify-between transition-all duration-300 origin-top ${
            scrolled ? "max-h-0 opacity-0 overflow-hidden scale-y-95" : "max-h-10 opacity-100"
          }`}>
            <BrandLogo />
            <div className="flex items-center gap-2.5">
              <Link
                href="/search"
                className="flex h-8 w-8 items-center justify-center rounded-xl bg-white border border-zinc-200 text-zinc-600 hover:text-zinc-900 shadow-sm transition-all hover:scale-105 active:scale-95 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200"
                aria-label="검색"
              >
                <Search className="h-4.5 w-4.5" strokeWidth={2.3} />
              </Link>
              <Link
                href="/partner/posts/new"
                className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#2563EB] text-white shadow-sm transition-all hover:scale-105 hover:bg-[#1d4ed8] active:scale-95 dark:bg-[#3b82f6] dark:hover:bg-[#2563eb]"
                aria-label="글쓰기"
              >
                <Plus className="h-5 w-5" strokeWidth={2.5} />
              </Link>
            </div>
          </div>

          {/* Row 2: Tabs + Scrolled Actions */}
          <div className="flex items-center justify-between gap-3">
            <div className="flex-1 min-w-0">
              <CommunityPanelTabs active={active} />
            </div>
            
            {/* Small actions on the right of tabs (only visible when scrolled) */}
            <div className={`flex items-center gap-1.5 transition-all duration-300 ${
              scrolled ? "max-w-xs opacity-100 translate-x-0" : "max-w-0 opacity-0 translate-x-2 overflow-hidden"
            }`}>
              <Link
                href="/search"
                className="flex h-7.5 w-7.5 items-center justify-center rounded-lg text-zinc-650 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200"
                aria-label="검색"
              >
                <Search className="h-4.5 w-4.5" strokeWidth={2.5} />
              </Link>
              <Link
                href="/partner/posts/new"
                className="flex h-7.5 w-7.5 items-center justify-center rounded-lg bg-[#2563EB] text-white transition-all hover:bg-[#1d4ed8] active:scale-95 dark:bg-[#3b82f6]"
                aria-label="글쓰기"
              >
                <Plus className="h-4.5 w-4.5" strokeWidth={2.8} />
              </Link>
            </div>
          </div>
        </div>
      </header>
      <div className="px-4">
        <div className="mb-4.5 px-0.5 pt-0.5">
          <h1 className="text-[20px] font-black tracking-tight text-zinc-950 dark:text-zinc-50">
            {title}
          </h1>
          <p className="mt-1 text-[13px] leading-relaxed text-zinc-500 dark:text-zinc-400">
            {tagline}
          </p>
        </div>
        {children}
      </div>
    </div>
  );
}
