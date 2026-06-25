"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";

/**
 * v1.8 admin-console · §5.2 — sticky 상단 nav.
 *  - 현재 path에 따라 active 표시
 *  - 로그아웃: POST /api/admin/logout → /admin/login으로 이동
 */
const TABS: { href: string; label: string; matcher: (p: string) => boolean }[] = [
  { href: "/admin", label: "홈", matcher: (p) => p === "/admin" },
  { href: "/admin/partners", label: "의뢰업체", matcher: (p) => p.startsWith("/admin/partners") },
  { href: "/admin/providers", label: "청명", matcher: (p) => p.startsWith("/admin/providers") },
  { href: "/admin/posts", label: "게시글", matcher: (p) => p.startsWith("/admin/posts") },
  // v1.11 cycle #24
  { href: "/admin/rag-review", label: "RAG 검토", matcher: (p) => p.startsWith("/admin/rag-review") },
  { href: "/admin/content-templates", label: "템플릿", matcher: (p) => p.startsWith("/admin/content-templates") },
  // v1.13 cycle #26
  { href: "/admin/auto-series", label: "자동 시리즈", matcher: (p) => p.startsWith("/admin/auto-series") },
  // v1.17 cycle #30 cleaning-tips-content
  { href: "/admin/tips", label: "청소 노하우", matcher: (p) => p.startsWith("/admin/tips") },
  { href: "/admin/requests", label: "접수/예약 관리", matcher: (p) => p.startsWith("/admin/requests") },
];

export default function AdminNav() {
  const pathname = usePathname() ?? "/admin";
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function logout() {
    if (busy) return;
    setBusy(true);
    try {
      await fetch("/api/admin/logout", { method: "POST" });
    } finally {
      router.push("/admin/login");
      router.refresh();
    }
  }

  return (
    <header className="sticky top-0 z-10 border-b border-zinc-200 bg-white px-4 py-3 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="mx-auto flex max-w-6xl items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            href="/admin"
            className="text-sm font-bold tracking-tight text-[#2563EB]"
          >
            청광 운영 콘솔
          </Link>
          <nav className="flex items-center gap-1 text-sm">
            {TABS.map((tab) => {
              const active = tab.matcher(pathname);
              return (
                <Link
                  key={tab.href}
                  href={tab.href}
                  className={`rounded-md px-3 py-1.5 transition ${
                    active
                      ? "bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-200"
                      : "text-zinc-700 hover:bg-zinc-50 dark:text-zinc-300 dark:hover:bg-zinc-800"
                  }`}
                >
                  {tab.label}
                </Link>
              );
            })}
          </nav>
        </div>
        <div className="flex items-center gap-3 text-xs text-zinc-500">
          <span>관리자</span>
          <button
            onClick={logout}
            disabled={busy}
            className="rounded-md border border-zinc-300 px-3 py-1.5 hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
          >
            로그아웃
          </button>
        </div>
      </div>
    </header>
  );
}
