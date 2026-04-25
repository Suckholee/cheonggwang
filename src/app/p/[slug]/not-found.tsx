import Link from "next/link";

export default function PromoNotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-zinc-50 px-6 dark:bg-black">
      <div className="flex max-w-md flex-col items-center gap-4 text-center">
        <p className="text-6xl">🔍</p>
        <h1 className="text-2xl font-bold">페이지를 찾을 수 없어요</h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          링크가 잘못되었거나 페이지가 아직 발행되지 않았을 수 있어요.
        </p>
        <Link
          href="/"
          className="mt-4 rounded-full bg-zinc-900 px-5 py-2.5 text-sm font-medium text-white dark:bg-zinc-100 dark:text-zinc-900"
        >
          홈으로
        </Link>
      </div>
    </main>
  );
}
