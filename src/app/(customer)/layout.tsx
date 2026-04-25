import { Suspense } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  SESSION_COOKIE_NAME,
  tryVerifySessionCookie,
} from "@/lib/firebase/auth-admin";
import { LogoutButton } from "@/components/ui/LogoutButton";

export default function CustomerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="flex items-center justify-between border-b border-zinc-200 bg-white px-6 py-3 dark:border-zinc-800 dark:bg-zinc-950">
        <a href="/dashboard" className="text-sm font-semibold">
          청광
        </a>
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
