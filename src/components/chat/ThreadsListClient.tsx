"use client";

import { useEffect, useState } from "react";
import {
  collection,
  onSnapshot,
  orderBy,
  query,
  where,
  type DocumentData,
  type Timestamp,
} from "firebase/firestore";
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
  };
}

export function ThreadsListClient({ uid, role }: Props) {
  const [rows, setRows] = useState<ThreadRowDTO[] | null>(null);
  const [error, setError] = useState<string | null>(null);

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

  return (
    <div role="list" className="space-y-2">
      {rows.map((row) => (
        <ThreadRow key={row.id} thread={row} />
      ))}
    </div>
  );
}
