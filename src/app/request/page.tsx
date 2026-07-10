"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { CLEANING_CATEGORIES } from "@/domain/cleaning-data";

export default function RequestPage() {
  const router = useRouter();

  const handleSelectCategory = (categoryId: string) => {
    router.push(`/request/details?category=${categoryId}`);
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      <h1 className="text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-50 mb-2">
        어떤 청소가 필요하신가요?
      </h1>
      <p className="text-zinc-500 dark:text-zinc-400 mb-8">
        무료로 빠르고 정확한 견적을 받아보세요.
      </p>

      <div className="grid gap-4 sm:grid-cols-2">
        {Object.values(CLEANING_CATEGORIES).map((cat) => (
          <button
            key={cat.id}
            onClick={() => handleSelectCategory(cat.id)}
            className="group relative flex flex-col items-center justify-center rounded-2xl border border-zinc-200 bg-white p-8 text-center shadow-sm transition-all hover:border-blue-500 hover:shadow-md hover:shadow-blue-500/10 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-blue-500"
          >
            <div className="mb-4 rounded-full bg-blue-50 p-4 text-blue-600 transition-colors group-hover:bg-blue-600 group-hover:text-white dark:bg-blue-900/20 dark:group-hover:bg-blue-600">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="32"
                height="32"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="m3 11 18-5v12L3 14v-3z" />
                <path d="M11.6 16.8a3 3 0 1 1-5.8-1.6" />
              </svg>
            </div>
            <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">
              {cat.label}
            </h3>
            <div className="absolute inset-0 rounded-2xl ring-1 ring-inset ring-transparent transition-all group-hover:ring-blue-500" />
          </button>
        ))}
      </div>
    </div>
  );
}
