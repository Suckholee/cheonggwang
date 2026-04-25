import { Suspense } from "react";
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { BottomTabNavServer } from "@/components/nav/BottomTabNav";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "청광",
  description: "청소 견적 마켓플레이스",
};

/**
 * cacheComponents:true 환경에서 RootLayout을 async + headers()로 만들면
 * 모든 페이지가 dynamic이 되어 /signup-partner/submitted 같은 SSG 페이지
 * prerender가 깨진다 (Uncached data outside of <Suspense>).
 *
 * 대신 CSS `:has([data-admin-shell])` 셀렉터로 admin path 분기:
 *   - admin/layout.tsx 최상위 div에 data-admin-shell 속성
 *   - root wrap이 자식에 admin shell이 있으면 자동으로 max-w + overflow + bg 풀림
 * BottomTabNav는 client component에서 이미 /admin 숨김 (cycle #22).
 */
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ko"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased bg-zinc-100 dark:bg-black`}
    >
      <body className="flex min-h-full flex-col items-center justify-center font-sans text-zinc-900 bg-zinc-100 dark:bg-black dark:text-zinc-50 has-[[data-admin-shell]]:bg-zinc-50 has-[[data-admin-shell]]:dark:bg-zinc-950">
        <div className="w-full max-w-[480px] bg-[#f5f6f8] dark:bg-zinc-950 min-h-screen relative flex flex-col shadow-[0_0_20px_rgba(0,0,0,0.05)] overflow-hidden has-[[data-admin-shell]]:max-w-none has-[[data-admin-shell]]:bg-transparent has-[[data-admin-shell]]:shadow-none has-[[data-admin-shell]]:overflow-visible">
          <main className="flex-1 overflow-y-auto pb-[calc(var(--bottom-nav-height)+20px)] [&::-webkit-scrollbar]:hidden has-[[data-admin-shell]]:overflow-visible has-[[data-admin-shell]]:pb-0">
            {children}
          </main>
          <Suspense fallback={null}>
            <BottomTabNavServer />
          </Suspense>
        </div>
      </body>
    </html>
  );
}
