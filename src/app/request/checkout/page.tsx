"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { CLEANING_CATEGORIES } from "@/domain/cleaning-data";

export default function CheckoutPage() {
  const router = useRouter();
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [noticeMessage, setNoticeMessage] = useState("");
  
  const [customerName, setCustomerName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");

  useEffect(() => {
    const catId = sessionStorage.getItem("request_category");
    if (!catId) {
      router.replace("/request");
      return;
    }
    setCategoryId(catId);
    const config = CLEANING_CATEGORIES[catId];
    if (config) {
      setNoticeMessage(config.noticeMessage);
    }
  }, [router]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // 1. Gather all data from sessionStorage and local state
    // 2. Call an API to save to Firestore `quotes` collection (Server action or API route)
    // 3. Clear sessionStorage
    // 4. Show success or redirect to success page
    alert("견적 요청이 접수되었습니다! (API 연동 대기 중)");
    sessionStorage.removeItem("request_category");
    sessionStorage.removeItem("request_extra_spaces");
    sessionStorage.removeItem("request_options");
    router.push("/");
  };

  if (!categoryId) return null;

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
        거의 다 되었습니다!
      </h1>
      <p className="text-zinc-500 dark:text-zinc-400 mb-8">
        견적 결과를 받아보실 연락처를 남겨주세요.
      </p>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
          <h2 className="mb-4 text-lg font-bold text-zinc-800 dark:text-zinc-200">연락처 정보</h2>
          
          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                이름
              </label>
              <input
                type="text"
                required
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="홍길동"
                className="w-full rounded-md border border-zinc-300 bg-transparent p-3 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:border-zinc-700"
              />
            </div>
            
            <div>
              <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                연락처
              </label>
              <input
                type="tel"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="010-0000-0000"
                className="w-full rounded-md border border-zinc-300 bg-transparent p-3 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:border-zinc-700"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                주소
              </label>
              <input
                type="text"
                required
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="서울시 송파구 잠실동..."
                className="w-full rounded-md border border-zinc-300 bg-transparent p-3 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:border-zinc-700"
              />
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
          <h2 className="mb-4 text-lg font-bold text-zinc-800 dark:text-zinc-200">현장 사진 첨부 (선택)</h2>
          <div className="flex h-32 cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-zinc-300 bg-zinc-50 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-900/50 dark:hover:bg-zinc-800">
            <svg className="mb-2 h-8 w-8 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span className="text-sm font-medium text-zinc-600 dark:text-zinc-400">사진을 드래그하거나 클릭하여 업로드</span>
          </div>
        </div>

        <div className="rounded-xl bg-blue-50 p-6 dark:bg-blue-900/20">
          <p className="text-sm font-medium text-blue-800 dark:text-blue-300">
            {noticeMessage}
          </p>
        </div>

        <button
          type="submit"
          className="w-full rounded-xl bg-blue-600 px-4 py-4 text-center font-bold text-white transition-colors hover:bg-blue-700"
        >
          무료 견적 신청하기
        </button>
      </form>
    </div>
  );
}
