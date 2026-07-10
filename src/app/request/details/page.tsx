"use client";

import React, { Suspense, useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CLEANING_CATEGORIES } from "@/domain/cleaning-data";

function DetailsForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const categoryId = searchParams.get("category");

  const categoryConfig = categoryId ? CLEANING_CATEGORIES[categoryId] : null;

  // We should redirect to the first step if category is invalid
  useEffect(() => {
    if (!categoryConfig) {
      router.replace("/request");
    }
  }, [categoryConfig, router]);

  const [extraSpaces, setExtraSpaces] = useState<Record<string, any>>({});
  const [options, setOptions] = useState<Record<string, any>>({});

  if (!categoryConfig) return null;

  const handleExtraSpaceChange = (id: string, value: any) => {
    setExtraSpaces((prev) => ({ ...prev, [id]: value }));
  };

  const handleOptionChange = (id: string, value: any) => {
    setOptions((prev) => ({ ...prev, [id]: value }));
  };

  const handleNext = () => {
    // In a real app we would use a context or state manager (Zustand, jotai)
    // Here we encode it to sessionStorage for simplicity across funnel
    sessionStorage.setItem("request_category", categoryId!);
    sessionStorage.setItem("request_extra_spaces", JSON.stringify(extraSpaces));
    sessionStorage.setItem("request_options", JSON.stringify(options));
    router.push("/request/checkout");
  };

  const renderInput = (item: any, value: any, onChange: (v: any) => void) => {
    if (item.type === "check") {
      return (
        <label className="flex items-center space-x-3 rounded-lg border border-zinc-200 p-4 transition-colors hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-900/50 cursor-pointer">
          <input
            type="checkbox"
            checked={!!value}
            onChange={(e) => onChange(e.target.checked)}
            className="h-5 w-5 rounded border-zinc-300 text-blue-600 focus:ring-blue-600 dark:border-zinc-700 dark:bg-zinc-900"
          />
          <span className="font-medium text-zinc-900 dark:text-zinc-100">{item.label}</span>
        </label>
      );
    }
    if (item.type === "quantity") {
      return (
        <div className="flex items-center justify-between rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
          <span className="font-medium text-zinc-900 dark:text-zinc-100">{item.label}</span>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => onChange(Math.max(0, (value || 0) - 1))}
              className="flex h-8 w-8 items-center justify-center rounded-md bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700"
            >
              -
            </button>
            <span className="w-8 text-center font-medium">{value || 0}</span>
            <button
              onClick={() => onChange((value || 0) + 1)}
              className="flex h-8 w-8 items-center justify-center rounded-md bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700"
            >
              +
            </button>
          </div>
        </div>
      );
    }
    if (item.type === "select") {
      return (
        <div className="flex flex-col space-y-2 rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
          <span className="font-medium text-zinc-900 dark:text-zinc-100">{item.label}</span>
          <select
            value={value || ""}
            onChange={(e) => onChange(e.target.value)}
            className="rounded-md border border-zinc-300 bg-white p-2 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:border-zinc-700 dark:bg-zinc-900"
          >
            <option value="">선택 안함</option>
            {item.selectOptions?.map((opt: string) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="mb-6">
        <button
          onClick={() => router.back()}
          className="text-sm font-medium text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
        >
          ← 이전 단계로
        </button>
      </div>

      <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50 mb-2">
        상세 정보를 알려주세요
      </h1>
      <p className="text-zinc-500 dark:text-zinc-400 mb-8">
        선택하신 <strong className="text-blue-600 dark:text-blue-400">{categoryConfig.label}</strong>에 맞는 세부 항목입니다.
      </p>

      {categoryConfig.extraSpaces.length > 0 && (
        <div className="mb-8">
          <h2 className="mb-4 text-lg font-bold text-zinc-800 dark:text-zinc-200">추가 공간</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {categoryConfig.extraSpaces.map((item) => (
              <div key={item.id}>
                {renderInput(item, extraSpaces[item.id], (val) => handleExtraSpaceChange(item.id, val))}
              </div>
            ))}
          </div>
        </div>
      )}

      {categoryConfig.options.length > 0 && (
        <div className="mb-8">
          <h2 className="mb-4 text-lg font-bold text-zinc-800 dark:text-zinc-200">추가 옵션</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {categoryConfig.options.map((item) => (
              <div key={item.id}>
                {renderInput(item, options[item.id], (val) => handleOptionChange(item.id, val))}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mt-8">
        <button
          onClick={handleNext}
          className="w-full rounded-xl bg-blue-600 px-4 py-4 text-center font-bold text-white transition-colors hover:bg-blue-700"
        >
          다음 단계로
        </button>
      </div>
    </div>
  );
}

export default function RequestDetailsPage() {
  return (
    <Suspense fallback={<div className="h-32 animate-pulse rounded-xl bg-zinc-200 dark:bg-zinc-800" />}>
      <DetailsForm />
    </Suspense>
  );
}
