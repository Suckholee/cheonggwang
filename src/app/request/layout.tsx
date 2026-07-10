import React from "react";

export default function RequestLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col bg-zinc-50 dark:bg-zinc-950">
      <header className="flex h-14 items-center border-b border-zinc-200 bg-white px-4 dark:border-zinc-800 dark:bg-zinc-950">
        <a href="/" className="text-lg font-bold text-blue-600 dark:text-blue-400">
          청광
        </a>
      </header>
      <main className="flex-1">
        <div className="mx-auto max-w-2xl px-4 py-8">
          {children}
        </div>
      </main>
    </div>
  );
}
