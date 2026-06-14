import Link from "next/link";
import { AlertCircle, ArrowLeft } from "lucide-react";

export const metadata = {
  title: "결제 실패 · 청광",
  robots: { index: false, follow: false },
};

interface PageProps {
  searchParams: Promise<{
    code?: string;
    message?: string;
    bookingId?: string;
    threadId?: string;
  }>;
}

export default async function PaymentFailPage(props: PageProps) {
  const { code, message, threadId } = await props.searchParams;

  return (
    <div className="mx-auto flex min-h-screen max-w-md items-center justify-center bg-zinc-50 px-4 dark:bg-black">
      <div className="flex flex-col items-center gap-4 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-400">
          <AlertCircle className="h-6 w-6" />
        </div>
        <div>
          <h1 className="text-lg font-bold text-zinc-950 dark:text-zinc-50">결제를 완료하지 못했습니다</h1>
          <p className="mt-1 text-xs text-zinc-500">
            {message || "사용자가 결제를 취소했거나 승인이 거절되었습니다."}
          </p>
          {code && (
            <p className="mt-2 text-[10px] font-mono text-zinc-400">
              에러 코드: {code}
            </p>
          )}
        </div>
        <div className="mt-6 flex w-full flex-col gap-2">
          {threadId ? (
            <Link
              href={`/chat/${threadId}`}
              className="flex items-center justify-center gap-1.5 rounded-2xl bg-blue-600 py-3 text-sm font-bold text-white shadow-md hover:bg-blue-700"
            >
              채팅방으로 복귀
            </Link>
          ) : (
            <Link
              href="/"
              className="flex items-center justify-center gap-1.5 rounded-2xl bg-blue-600 py-3 text-sm font-bold text-white shadow-md hover:bg-blue-700"
            >
              홈으로 이동
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
