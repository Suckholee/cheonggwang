import { Suspense } from "react";
import AdminLoginForm from "@/components/admin/AdminLoginForm";

export const metadata = {
  title: "운영자 로그인 · 청광",
  robots: { index: false, follow: false },
};

export default function AdminLoginPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-zinc-50 px-5 py-8 dark:bg-zinc-950">
      <div className="mb-8 text-center">
        <h1 className="text-2xl font-extrabold tracking-tight text-[#2B66F6] dark:text-[#5B8DF6]">
          청광 운영 콘솔
        </h1>
        <p className="mt-2 text-sm text-zinc-500">운영자 전용</p>
      </div>
      <Suspense fallback={null}>
        <AdminLoginForm />
      </Suspense>
    </main>
  );
}
