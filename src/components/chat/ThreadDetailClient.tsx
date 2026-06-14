"use client";

import { useEffect, useRef, useState } from "react";
import {
  collection,
  doc,
  limit,
  onSnapshot,
  orderBy,
  query,
  type DocumentData,
  type Timestamp,
} from "firebase/firestore";
import { clientDb } from "@/lib/firebase/client";
import { markThreadAsRead } from "@/app/actions/chat-actions";
import { MessageBubble } from "./MessageBubble";
import { MessageComposer } from "./MessageComposer";
import type { MessageBubbleDTO } from "@/types/chat";

interface Props {
  threadId: string;
  uid: string;
  bookingId: string | null;
  initialBookingStatus: string | null;
}

const MAX_MESSAGES = 200;

function tsToMs(ts: Timestamp | null | undefined): number {
  if (ts && typeof (ts as Timestamp).toMillis === "function") {
    return (ts as Timestamp).toMillis();
  }
  return Date.now();
}

function toDTO(
  id: string,
  d: DocumentData,
  uid: string,
): MessageBubbleDTO {
  const rawType = d.type;
  const type: MessageBubbleDTO["type"] =
    rawType === "system"
      ? "system"
      : rawType === "paymentRequest"
      ? "paymentRequest"
      : "text";
  return {
    id,
    text: String(d.text ?? ""),
    mine: d.senderUid === uid,
    createdAtMs: tsToMs(d.createdAt as Timestamp | null | undefined),
    type,
    amount: d.amount ? Number(d.amount) : undefined,
    bookingId: d.bookingId ? String(d.bookingId) : undefined,
  };
}

export function ThreadDetailClient({
  threadId,
  uid,
  bookingId,
  initialBookingStatus,
}: Props) {
  const [messages, setMessages] = useState<MessageBubbleDTO[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [bookingStatus, setBookingStatus] = useState<string | null>(initialBookingStatus);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    void markThreadAsRead({ threadId });
  }, [threadId]);

  useEffect(() => {
    if (!bookingId) return;
    const unsub = onSnapshot(doc(clientDb, "bookings", bookingId), (snap) => {
      if (snap.exists()) {
        setBookingStatus(snap.data().status as string);
      }
    });
    return () => unsub();
  }, [bookingId]);

  useEffect(() => {
    const q = query(
      collection(clientDb, `threads/${threadId}/messages`),
      orderBy("createdAt", "asc"),
      limit(MAX_MESSAGES),
    );
    const unsub = onSnapshot(
      q,
      (snap) => {
        const next = snap.docs.map((doc) => toDTO(doc.id, doc.data(), uid));
        setMessages(next);
      },
      (err) => {
        console.warn("[chat] messages onSnapshot error:", err);
        setError("메시지를 불러오지 못했어요");
        setMessages([]);
      },
    );
    return () => unsub();
  }, [threadId, uid]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages?.length]);

  return (
    <div className="flex flex-1 flex-col">
      <div className="flex-1 space-y-2 overflow-y-auto px-3 py-4">
        {messages === null ? (
          <p className="text-center text-xs text-zinc-500">불러오는 중...</p>
        ) : error ? (
          <p className="rounded bg-red-50 px-3 py-2 text-xs text-red-700 dark:bg-red-950/50 dark:text-red-300">
            {error}
          </p>
        ) : messages.length === 0 ? (
          <p className="mt-8 text-center text-xs text-zinc-500">
            아직 주고받은 메시지가 없어요. 먼저 인사를 건네보세요
          </p>
        ) : (
          <>
            {messages.length >= MAX_MESSAGES && (
              <p className="text-center text-[11px] text-zinc-400">
                최신 {MAX_MESSAGES}건만 표시돼요
              </p>
            )}
            {messages.map((m) => (
              <MessageBubble
                key={m.id}
                message={m}
                bookingStatus={bookingStatus}
                threadId={threadId}
              />
            ))}
          </>
        )}
        <div ref={endRef} />
      </div>
      <MessageComposer threadId={threadId} />
    </div>
  );
}
