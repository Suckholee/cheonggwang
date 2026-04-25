import Link from "next/link";

export const metadata = {
  title: "서비스 이용약관 · 청광",
};

export default function TermsPage() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-12">
      <Link
        href="/"
        className="text-sm text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
      >
        ← 홈
      </Link>
      <h1 className="mb-4 mt-6 text-2xl font-bold">서비스 이용약관</h1>
      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        현재 약관 문서를 준비 중입니다. 문의는{" "}
        <a
          className="text-indigo-600 underline dark:text-indigo-400"
          href="mailto:peter15975345@gmail.com"
        >
          peter15975345@gmail.com
        </a>
        으로 주세요.
      </p>
    </main>
  );
}
