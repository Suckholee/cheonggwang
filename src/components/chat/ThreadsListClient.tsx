"use client";

import { useEffect, useState } from "react";
import {
  collection,
  onSnapshot,
  orderBy,
  query,
  where,
  doc,
  getDoc,
  type DocumentData,
  type Timestamp,
} from "firebase/firestore";
import Link from "next/link";
import { clientDb } from "@/lib/firebase/client";
import { ThreadRow } from "./ThreadRow";
import { EmptyThreadsHint } from "./EmptyThreadsHint";
import type { ThreadRole, ThreadRowDTO } from "@/types/chat";

interface Props {
  uid: string;
  role: ThreadRole;
}

function tsToMs(ts: Timestamp | null | undefined): number | null {
  if (!ts) return null;
  if (typeof (ts as Timestamp).toMillis === "function") {
    return (ts as Timestamp).toMillis();
  }
  return null;
}

function toRowDTO(id: string, d: DocumentData, role: ThreadRole): ThreadRowDTO {
  const lastMessageAt = tsToMs(d.lastMessageAt as Timestamp | null | undefined);
  const counterpartName =
    role === "client"
      ? String(d.companyName ?? "청명")
      : String(d.clientDisplayName ?? "고객");
  const unreadKey = role === "client" ? "unreadByClient" : "unreadByProvider";
  const unreadCount =
    typeof d[unreadKey] === "number" ? (d[unreadKey] as number) : 0;
  return {
    id,
    counterpartName,
    lastMessagePreview:
      (d.lastMessagePreview as string | null | undefined) ?? null,
    lastMessageAtMs: lastMessageAt,
    unreadCount,
    quoteAmount: null,
    isNew: lastMessageAt == null,
    requestId: String(d.requestId ?? ""),
  };
}

const FILTER_STATUSES = [
  { key: "all", label: "전체" },
  { key: "submitted", label: "새 견적" },
  { key: "quoted", label: "조율중" },
  { key: "booked", label: "예약확정" },
  { key: "completed", label: "완료" },
] as const;

export function ThreadsListClient({ uid, role }: Props) {
  const [rows, setRows] = useState<ThreadRowDTO[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reqDetails, setReqDetails] = useState<Record<string, { category: string; status: string }>>({});
  const [activeFilter, setActiveFilter] = useState<string>("all");

  useEffect(() => {
    const field = role === "client" ? "clientUid" : "providerOwnerUid";
    const q = query(
      collection(clientDb, "threads"),
      where(field, "==", uid),
      orderBy("lastMessageAt", "desc"),
    );
    const unsub = onSnapshot(
      q,
      (snap) => {
        const next = snap.docs.map((doc) => toRowDTO(doc.id, doc.data(), role));
        setRows(next);
      },
      (err) => {
        console.warn("[chat] threads onSnapshot error:", err);
        setError("목록을 불러오지 못했어요");
        setRows([]);
      },
    );
    return () => unsub();
  }, [uid, role]);

  // Fetch Category and Status from quoteRequests dynamically
  useEffect(() => {
    if (!rows) return;
    rows.forEach(async (row) => {
      if (!row.requestId || reqDetails[row.requestId]) return;
      try {
        const snap = await getDoc(doc(clientDb, "quoteRequests", row.requestId));
        if (snap.exists()) {
          const data = snap.data();
          setReqDetails((prev) => ({
            ...prev,
            [row.requestId!]: {
              category: String(data.category ?? "regular"),
              status: String(data.status ?? "submitted"),
            },
          }));
        }
      } catch (err) {
        console.warn("[chat] fetch quoteRequest detail failed:", err);
      }
    });
  }, [rows, reqDetails]);

  if (rows === null) {
    return (
      <div className="space-y-2" aria-label="채팅 로딩 중">
        <div className="h-14 animate-pulse rounded-xl bg-zinc-100 dark:bg-zinc-900" />
        <div className="h-14 animate-pulse rounded-xl bg-zinc-100 dark:bg-zinc-900" />
      </div>
    );
  }

  if (error) {
    return (
      <p className="rounded bg-red-50 px-3 py-2 text-xs text-red-700 dark:bg-red-950/50 dark:text-red-300">
        {error}
      </p>
    );
  }

  if (rows.length === 0) {
    return <EmptyThreadsHint role={role} />;
  }

  const filteredRows = rows.filter((row) => {
    if (activeFilter === "all") return true;
    const detail = row.requestId ? reqDetails[row.requestId] : undefined;
    const status = detail?.status ?? "submitted";
    return status === activeFilter;
  });

  const chipCls =
    "inline-flex items-center rounded-full border px-3 py-1.5 text-xs font-semibold transition-all duration-200 shrink-0 cursor-pointer";
  const activeCls =
    "border-[#2563EB] bg-[#edf4ff] text-[#2563EB] dark:border-indigo-400 dark:bg-indigo-950/40 dark:text-indigo-200 shadow-sm scale-102";
  const idleCls =
    "border-zinc-200 bg-white text-zinc-600 hover:border-zinc-300 hover:text-zinc-800 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200";

  return (
    <div className="space-y-4">
      {/* 4. Filter chips */}
      <nav
        role="tablist"
        aria-label="채팅방 상태 필터"
        className="flex flex-row flex-nowrap overflow-x-auto gap-2 pb-1 scrollbar-none -mx-4 px-4"
      >
        {FILTER_STATUSES.map((filter) => {
          const isActive = activeFilter === filter.key;
          return (
            <button
              key={filter.key}
              role="tab"
              aria-selected={isActive}
              onClick={() => setActiveFilter(filter.key)}
              className={`${chipCls} ${isActive ? activeCls : idleCls}`}
            >
              {filter.label}
            </button>
          );
        })}
      </nav>

      {/* Threads List */}
      {filteredRows.length === 0 ? (
        <div className="py-12 text-center rounded-2xl border border-dashed border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900/40">
          <p className="text-sm font-bold text-zinc-400 dark:text-zinc-500">
            해당 상태의 채팅방이 없습니다
          </p>
        </div>
      ) : (
        <div role="list" className="space-y-3">
          {filteredRows.map((row) => {
            const detail = row.requestId ? reqDetails[row.requestId] : undefined;
            return (
              <ThreadRow
                key={row.id}
                thread={row}
                category={detail?.category}
                status={detail?.status}
              />
            );
          })}
        </div>
      )}

      {/* 5. Bottom Request CTA (Only for client role) */}
      {role === "client" && (
        <div className="mt-6.5 rounded-2xl border border-zinc-200 border-dashed p-5 text-center bg-zinc-50/50 dark:border-zinc-800 dark:bg-zinc-950/20">
          <p className="text-xs font-bold text-zinc-700 dark:text-zinc-400">다른 청소도 필요하신가요?</p>
          <p className="mt-1 text-[11px] text-zinc-450 dark:text-zinc-500 leading-normal">
            입주청소, 정기청소, 사무실청소 견적을 무료로 받아보세요.
          </p>
          <Link
            href="/quote/new"
            className="mt-4 inline-flex items-center justify-center rounded-xl bg-white border border-zinc-200 border-b-[3px] border-b-zinc-300 px-4 py-2.5 text-xs font-extrabold text-zinc-750 shadow-xs hover:border-[#2563EB]/40 active:scale-[0.98] active:translate-y-[1px] active:border-b-2 transition-all dark:bg-zinc-900 dark:text-zinc-300 dark:border-zinc-800 dark:border-b-zinc-950"
          >
            새 요청 등록하기 →
          </Link>
        </div>
      )}
    </div>
  );
}
