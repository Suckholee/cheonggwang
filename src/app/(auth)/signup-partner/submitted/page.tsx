import Link from "next/link";
import PartnerApplicationStatus from "@/components/auth/PartnerApplicationStatus";

export const metadata = {
  title: "신청 진행 상태 · 청광",
  robots: { index: false, follow: false },
};

export default function PartnerApplicationSubmittedPage() {
  return (
    <main className="flex min-h-screen flex-1 items-center justify-center bg-zinc-50 p-6 dark:bg-black">
      <div className="flex w-full max-w-md flex-col items-center gap-6">
        <div className="flex w-full items-center">
          <Link
            href="/"
            className="text-sm text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
          >
            ← 홈으로
          </Link>
        </div>
        <div className="text-center">
          <h1 className="text-xl font-bold tracking-tight">
            의뢰업체 등록 신청
          </h1>
        </div>
        <div className="w-full">
          <PartnerApplicationStatus />
        </div>
      </div>
    </main>
  );
}
