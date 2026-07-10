"use client";

import React from "react";
import Link from "next/link";

export default function DashboardPage() {
  return (
    <div className="mx-auto max-w-5xl p-6">
      <h1 className="mb-8 text-2xl font-bold text-zinc-900 dark:text-zinc-50">
        사장님, 안녕하세요! 👋
      </h1>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* 새 견적 요청 카드 */}
        <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-zinc-500 dark:text-zinc-400">새로운 견적 요청</h2>
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-sm font-bold text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
              3
            </span>
          </div>
          <p className="mb-4 text-3xl font-extrabold text-zinc-900 dark:text-zinc-50">
            3건
          </p>
          <button className="w-full rounded-lg bg-zinc-100 py-2 text-sm font-medium text-zinc-900 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700">
            요청 확인하기
          </button>
        </div>

        {/* 금전출납부 요약 */}
        <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-zinc-500 dark:text-zinc-400">이번 달 수입</h2>
            <Link href="/cashbook" className="text-xs text-blue-600 hover:underline dark:text-blue-400">
              장부 가기
            </Link>
          </div>
          <p className="mb-4 text-3xl font-extrabold text-zinc-900 dark:text-zinc-50">
            ₩ 1,250,000
          </p>
          <div className="flex items-center text-sm text-green-600 dark:text-green-400">
            <svg className="mr-1 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
            <span>지난달 대비 15% 증가</span>
          </div>
        </div>

        {/* 간편 견적서 발급 바로가기 */}
        <div className="flex flex-col justify-center rounded-2xl border border-dashed border-zinc-300 bg-zinc-50 p-6 shadow-sm dark:border-zinc-700 dark:bg-zinc-900/50">
          <h2 className="mb-2 text-center text-sm font-semibold text-zinc-700 dark:text-zinc-300">
            빠른 견적서 발급이 필요하신가요?
          </h2>
          <Link
            href="/quotation"
            className="mt-2 inline-flex items-center justify-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            + 새 견적서 작성
          </Link>
        </div>
      </div>
    </div>
  );
}
