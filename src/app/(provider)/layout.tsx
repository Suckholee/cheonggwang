import { Suspense } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  SESSION_COOKIE_NAME,
  tryVerifySessionCookie,
} from "@/lib/firebase/auth-admin";
import { LogoutButton } from "@/components/ui/LogoutButton";
import Link from "next/link";

export default function ProviderLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col bg-zinc-50 dark:bg-zinc-950">
      <header className="flex h-14 items-center justify-between border-b border-zinc-200 bg-white px-6 dark:border-zinc-800 dark:bg-zinc-950">
        <div className="flex items-center space-x-6">
          <Link href="/dashboard" className="text-sm font-bold text-blue-600 dark:text-blue-400">
            청광 파트너
          </Link>
          <nav className="hidden space-x-4 md:flex">
            <Link href="/dashboard" className="text-sm font-medium text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100">
              대시보드
            </Link>
            <Link href="/cashbook" className="text-sm font-medium text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100">
              금전출납부
            </Link>
            <Link href="/quotation" className="text-sm font-medium text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100">
              견적서 발급
            </Link>
          </nav>
        </div>
        <LogoutButton className="text-sm text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100" />
      </header>
      <main className="flex-1">
        <Suspense fallback={<AuthLoadingShell />}>
          <AuthGuard>{children}</AuthGuard>
        </Suspense>
      </main>
    </div>
  );
}

async function AuthGuard({ children }: { children: React.ReactNode }) {
  const jar = await cookies();
  const uid = await tryVerifySessionCookie(jar.get(SESSION_COOKIE_NAME)?.value);
  if (!uid) redirect("/login");
  
  // To-do: In a real app we might want to check the user's role in Firestore 
  // to ensure they are actually a 'provider', but for now we let any auth pass.
  
  return <>{children}</>;
}

function AuthLoadingShell() {
  return (
    <div className="mx-auto max-w-5xl p-6">
      <div className="h-8 w-48 animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />
      <div className="mt-8 h-32 animate-pulse rounded bg-zinc-100 dark:bg-zinc-900" />
    </div>
  );
}
