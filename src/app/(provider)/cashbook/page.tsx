"use client";

import React, { useState } from "react";
import type { CashbookEntry } from "@/types/cashbook";

// 임시 목업 데이터
const MOCK_DATA: CashbookEntry[] = [
  {
    id: "1",
    providerUid: "prov1",
    date: new Date("2026-07-09T10:00:00"),
    type: "income",
    category: "입주청소 매출",
    amount: 350000,
    description: "잠실동 32평 아파트 입주청소",
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "2",
    providerUid: "prov1",
    date: new Date("2026-07-09T17:00:00"),
    type: "expense",
    category: "약품비",
    amount: 50000,
    description: "친환경 세제 2통 구매",
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

export default function CashbookPage() {
  const [entries, setEntries] = useState<CashbookEntry[]>(MOCK_DATA);
  const [isAdding, setIsAdding] = useState(false);
  
  // 새 항목 폼 상태
  const [newType, setNewType] = useState<"income" | "expense">("income");
  const [newCategory, setNewCategory] = useState("");
  const [newAmount, setNewAmount] = useState("");
  const [newDesc, setNewDesc] = useState("");

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategory || !newAmount) return;

    const newEntry: CashbookEntry = {
      id: Math.random().toString(),
      providerUid: "prov1",
      date: new Date(),
      type: newType,
      category: newCategory,
      amount: Number(newAmount),
      description: newDesc,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    setEntries([newEntry, ...entries]);
    setIsAdding(false);
    setNewCategory("");
    setNewAmount("");
    setNewDesc("");
  };

  const totalIncome = entries.filter((e) => e.type === "income").reduce((acc, curr) => acc + curr.amount, 0);
  const totalExpense = entries.filter((e) => e.type === "expense").reduce((acc, curr) => acc + curr.amount, 0);

  return (
    <div className="mx-auto max-w-5xl p-6">
      <div className="mb-8 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">금전출납부</h1>
        <button
          onClick={() => setIsAdding(!isAdding)}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          {isAdding ? "취소" : "+ 내역 추가"}
        </button>
      </div>

      <div className="mb-8 grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
          <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">총 수입</p>
          <p className="mt-2 text-2xl font-bold text-green-600 dark:text-green-400">
            ₩ {totalIncome.toLocaleString()}
          </p>
        </div>
        <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
          <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">총 지출</p>
          <p className="mt-2 text-2xl font-bold text-red-600 dark:text-red-400">
            ₩ {totalExpense.toLocaleString()}
          </p>
        </div>
        <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 dark:border-blue-900/50 dark:bg-blue-900/20">
          <p className="text-sm font-medium text-blue-600 dark:text-blue-400">순 수익</p>
          <p className="mt-2 text-2xl font-bold text-blue-700 dark:text-blue-300">
            ₩ {(totalIncome - totalExpense).toLocaleString()}
          </p>
        </div>
      </div>

      {isAdding && (
        <form onSubmit={handleAdd} className="mb-8 rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <h2 className="mb-4 text-lg font-bold">내역 입력</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">분류</label>
              <select
                value={newType}
                onChange={(e) => setNewType(e.target.value as "income" | "expense")}
                className="w-full rounded-md border border-zinc-300 bg-transparent p-2 outline-none dark:border-zinc-700"
              >
                <option value="income">수입</option>
                <option value="expense">지출</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">카테고리</label>
              <input
                type="text"
                required
                placeholder={newType === "income" ? "ex) 입주청소" : "ex) 식비, 약품비"}
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                className="w-full rounded-md border border-zinc-300 bg-transparent p-2 outline-none dark:border-zinc-700"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">금액</label>
              <input
                type="number"
                required
                placeholder="0"
                value={newAmount}
                onChange={(e) => setNewAmount(e.target.value)}
                className="w-full rounded-md border border-zinc-300 bg-transparent p-2 outline-none dark:border-zinc-700"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">상세 설명</label>
              <input
                type="text"
                placeholder="상세 내역 입력"
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
                className="w-full rounded-md border border-zinc-300 bg-transparent p-2 outline-none dark:border-zinc-700"
              />
            </div>
          </div>
          <div className="mt-4 flex justify-end">
            <button type="submit" className="rounded-lg bg-zinc-900 px-4 py-2 text-sm text-white dark:bg-zinc-100 dark:text-zinc-900">
              저장하기
            </button>
          </div>
        </form>
      )}

      <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        <table className="w-full text-left text-sm text-zinc-600 dark:text-zinc-400">
          <thead className="bg-zinc-50 text-zinc-700 dark:bg-zinc-900/50 dark:text-zinc-300">
            <tr>
              <th className="px-6 py-3 font-semibold">날짜</th>
              <th className="px-6 py-3 font-semibold">분류</th>
              <th className="px-6 py-3 font-semibold">카테고리</th>
              <th className="px-6 py-3 font-semibold">상세 내용</th>
              <th className="px-6 py-3 text-right font-semibold">금액</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
            {entries.map((entry) => (
              <tr key={entry.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-900/50">
                <td className="px-6 py-4">{entry.date.toLocaleDateString()}</td>
                <td className="px-6 py-4">
                  <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                    entry.type === 'income' 
                      ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' 
                      : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                  }`}>
                    {entry.type === 'income' ? '수입' : '지출'}
                  </span>
                </td>
                <td className="px-6 py-4 font-medium text-zinc-900 dark:text-zinc-100">{entry.category}</td>
                <td className="px-6 py-4">{entry.description}</td>
                <td className={`px-6 py-4 text-right font-bold ${
                  entry.type === 'income' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                }`}>
                  {entry.type === 'income' ? '+' : '-'}₩ {entry.amount.toLocaleString()}
                </td>
              </tr>
            ))}
            {entries.length === 0 && (
              <tr>
                <td colSpan={5} className="px-6 py-8 text-center text-zinc-500">
                  등록된 내역이 없습니다.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
