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
      <body className="flex min-h-full flex-col items-center justify-center font-sans text-zinc-900 bg-zinc-100 dark:bg-black dark:text-zinc-50">
        <div className="w-full max-w-[480px] bg-[#f5f6f8] dark:bg-zinc-950 min-h-screen relative flex flex-col shadow-[0_0_20px_rgba(0,0,0,0.05)] overflow-hidden">
          <main className="flex-1 overflow-y-auto pb-[calc(var(--bottom-nav-height)+20px)] [&::-webkit-scrollbar]:hidden">
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
