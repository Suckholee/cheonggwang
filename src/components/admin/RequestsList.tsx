"use client";

import { useState } from "react";
import Link from "next/link";
import type { QuoteRequest } from "@/types/quote-request";
import { QUOTE_CATEGORY_LABELS, QUOTE_CATEGORY_EMOJIS } from "@/domain/quote-category";
import { QUOTE_STATUS_LABELS } from "@/domain/quote-status";

interface Props {
  requests: QuoteRequest[];
}

export default function RequestsList({ requests }: Props) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedStatus, setSelectedStatus] = useState("all");

  const filtered = requests.filter((r) => {
    const matchesSearch =
      r.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.subService.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.region.district.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.id.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesCategory = selectedCategory === "all" || r.category === selectedCategory;
    const matchesStatus = selectedStatus === "all" || r.status === selectedStatus;

    return matchesSearch && matchesCategory && matchesStatus;
  });

  const categories = Array.from(new Set(requests.map((r) => r.category)));
  const statuses = Array.from(new Set(requests.map((r) => r.status)));

  const statusColors: Record<string, string> = {
    submitted: "bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200",
    estimating: "bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-350",
    quoted: "bg-blue-100 text-blue-800 dark:bg-blue-950/40 dark:text-blue-350",
    consulted: "bg-indigo-100 text-indigo-800 dark:bg-indigo-950/40 dark:text-indigo-350",
    booked: "bg-violet-100 text-violet-800 dark:bg-violet-950/40 dark:text-violet-350",
    assigned: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-350",
    working: "bg-orange-100 text-orange-850 dark:bg-orange-950/40 dark:text-orange-355",
    completed: "bg-teal-100 text-teal-800 dark:bg-teal-950/40 dark:text-teal-350",
    settled: "bg-purple-100 text-purple-800 dark:bg-purple-950/40 dark:text-purple-350",
    cancelled: "bg-red-100 text-red-800 dark:bg-red-950/40 dark:text-red-350",
  };

  const formatDate = (date: Date | undefined) => {
    if (!date) return "-";
    const d = new Date(date);
    return `${d.getFullYear().toString().slice(2)}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  };

  return (
    <div className="space-y-4">
      {/* 검색 및 필터 패널 */}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <input
          type="text"
          placeholder="의뢰자명, 서비스명, 지역, 접수번호 검색..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="rounded-xl border border-zinc-200 bg-white px-3.5 py-2 text-xs font-semibold outline-none focus:border-blue-500 dark:border-zinc-800 dark:bg-zinc-900"
        />

        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="rounded-xl border border-zinc-200 bg-white px-3.5 py-2 text-xs font-semibold outline-none focus:border-blue-500 dark:border-zinc-800 dark:bg-zinc-900"
        >
          <option value="all">모든 카테고리</option>
          {categories.map((cat) => (
            <option key={cat} value={cat}>
              {QUOTE_CATEGORY_LABELS[cat] || cat}
            </option>
          ))}
        </select>

        <select
          value={selectedStatus}
          onChange={(e) => setSelectedStatus(e.target.value)}
          className="rounded-xl border border-zinc-200 bg-white px-3.5 py-2 text-xs font-semibold outline-none focus:border-blue-500 dark:border-zinc-800 dark:bg-zinc-900"
        >
          <option value="all">모든 상태</option>
          {statuses.map((stat) => (
            <option key={stat} value={stat}>
              {QUOTE_STATUS_LABELS[stat] || stat}
            </option>
          ))}
        </select>
      </div>

      {/* 목록 테이블 */}
      <div className="overflow-x-auto rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900 shadow-xs">
        {filtered.length === 0 ? (
          <div className="p-8 text-center text-xs font-bold text-zinc-400">
            검색 조건에 맞는 접수 건이 없습니다.
          </div>
        ) : (
          <table className="w-full min-w-[960px] text-xs">
            <thead className="bg-zinc-50 border-b border-zinc-100 text-left font-black text-zinc-500 dark:bg-zinc-850 dark:border-zinc-800/80">
              <tr>
                <th className="px-4 py-3">접수 일시 / ID</th>
                <th className="px-4 py-3">의뢰인 정보</th>
                <th className="px-4 py-3">서비스 정보</th>
                <th className="px-4 py-3">희망 작업 지역 / 일정</th>
                <th className="px-4 py-3 text-right">총 금액</th>
                <th className="px-4 py-3 text-center">진행 상태</th>
                <th className="px-4 py-3 text-right">작업</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/60 font-semibold text-zinc-700 dark:text-zinc-300">
              {filtered.map((r) => {
                const catLabel = QUOTE_CATEGORY_LABELS[r.category] || r.category;
                const emoji = QUOTE_CATEGORY_EMOJIS[r.category] || "🧹";
                const total = r.totalAmount;

                return (
                  <tr key={r.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-900/30">
                    <td className="px-4 py-3">
                      <div className="text-zinc-400 text-[10px]">{formatDate(r.createdAt)}</div>
                      <div className="font-extrabold text-[10px] font-mono text-zinc-500 dark:text-zinc-400 mt-0.5">{r.id}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-extrabold text-zinc-900 dark:text-zinc-100">{r.clientName}</div>
                      <div className="text-[10px] text-zinc-450 mt-0.5">{r.contactPhone}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <span>{emoji}</span>
                        <span className="font-extrabold text-zinc-800 dark:text-zinc-200">{catLabel}</span>
                      </div>
                      <div className="text-[10px] text-zinc-450 mt-0.5">{r.subService} {r.size ? `(${r.size}평)` : ""}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-bold">{r.region.city} {r.region.district}</div>
                      <div className="text-[10px] text-blue-600 dark:text-blue-400 font-bold mt-0.5">
                        {r.preferredDate ? formatDate(r.preferredDate).split(" ")[0] : "일정 미지정"} · {r.preferredTime || "시간 미지정"}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {total !== undefined ? (
                        <div className="font-extrabold text-zinc-900 dark:text-zinc-100">{total.toLocaleString()}원</div>
                      ) : (
                        <div className="text-zinc-400 italic">실측후 확정</div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-extrabold ${statusColors[r.status]}`}>
                        {QUOTE_STATUS_LABELS[r.status] || r.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/admin/requests/${r.id}`}
                        className="inline-flex h-7 items-center justify-center rounded-xl bg-blue-50 text-[#2563EB] font-extrabold border border-blue-100 border-b-2 border-b-blue-200 px-3 hover:bg-blue-100 hover:scale-[1.02] active:scale-[0.98] transition dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-900/60 dark:border-b-blue-950"
                      >
                        상세보기
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
