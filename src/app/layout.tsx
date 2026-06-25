import { Suspense } from "react";
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import NextTopLoader from "nextjs-toploader";
import "./globals.css";
import { BottomTabNavServer } from "@/components/nav/BottomTabNav";
import { PageTransitionWrapper } from "@/components/nav/PageTransitionWrapper";
import { JsonLdScript } from "@/components/seo/JsonLdScript";
import { buildOrganizationJsonLd } from "@/lib/seo/organization-jsonld";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// v1.15 cycle #28 partner-aeo-boost · §3.3 (H3, G5).
// metadataBase: og:image 절대 URL 보장. Vercel preview에서도 절대 URL 자동 생성.
const BASE_URL = (
  process.env.NEXT_PUBLIC_BASE_URL?.trim() || "https://www.cheonggwang.kr"
).replace(/\/$/, "");

export const metadata: Metadata = {
  title: "청광",
  description: "청소 견적 마켓플레이스",
  metadataBase: new URL(BASE_URL),
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
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased bg-[#F9FAFB] dark:bg-black`}
    >
      <body className="flex min-h-full flex-col items-center justify-center font-sans text-[#111827] bg-[#F9FAFB] dark:bg-black dark:text-zinc-50 has-[[data-admin-shell]]:bg-[#F9FAFB] has-[[data-admin-shell]]:dark:bg-zinc-950">
        <NextTopLoader
          color="#2563EB"
          initialPosition={0.08}
          crawlSpeed={200}
          height={3}
          crawl={true}
          showSpinner={false}
          easing="ease"
          speed={200}
          shadow="0 0 10px #2563EB,0 0 5px #2563EB"
        />
        <div className="w-full max-w-[480px] bg-[#F9FAFB] dark:bg-zinc-950 h-screen h-[100dvh] relative flex flex-col shadow-[0_0_40px_rgba(0,0,0,0.03)] overflow-hidden md:max-w-none md:w-full md:h-screen md:flex md:flex-row md:overflow-hidden md:shadow-none md:bg-white dark:md:bg-zinc-900 has-[[data-admin-shell]]:max-w-none has-[[data-admin-shell]]:bg-transparent has-[[data-admin-shell]]:shadow-none has-[[data-admin-shell]]:overflow-visible has-[[data-admin-shell]]:h-auto">
          <main className="flex-1 overflow-y-auto overflow-x-hidden pb-[calc(var(--bottom-nav-height)+20px)] [&::-webkit-scrollbar]:hidden md:order-2 md:flex-1 md:overflow-y-auto md:h-screen md:pb-0 md:bg-zinc-50 dark:md:bg-zinc-950 has-[[data-admin-shell]]:overflow-visible has-[[data-admin-shell]]:pb-0 has-[[data-chat-room]]:overflow-hidden has-[[data-chat-room]]:pb-0 has-[[data-chat-room]]:h-full has-[[data-chat-room]]:flex has-[[data-chat-room]]:flex-col">
            <div className="flex-1 flex flex-col w-full md:max-w-6xl md:mx-auto md:px-8 md:py-6 has-[[data-admin-shell]]:max-w-none has-[[data-admin-shell]]:p-0 has-[[data-chat-room]]:max-w-none has-[[data-chat-room]]:h-full has-[[data-chat-room]]:p-0">
              <Suspense fallback={null}>
                <PageTransitionWrapper>
                  {children}
                </PageTransitionWrapper>
              </Suspense>
            </div>
          </main>
          <Suspense fallback={null}>
            <div className="md:order-1 shrink-0">
              <BottomTabNavServer />
            </div>
          </Suspense>
        </div>
        <JsonLdScript data={buildOrganizationJsonLd()} />
      </body>
    </html>
  );
}
