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
import { markThreadAsRead, sendMessage } from "@/app/actions/chat-actions";
import { MessageBubble } from "./MessageBubble";
import { MessageComposer } from "./MessageComposer";
import { ThreadActionButtons } from "./ThreadActionButtons";
import type { MessageBubbleDTO } from "@/types/chat";

interface Props {
  threadId: string;
  uid: string;
  role: "client" | "provider";
  bookingId: string | null;
  initialBookingStatus: string | null;
  bookingAmount: number | null;
  canConfirmBooking: boolean;
  requestId?: string;
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
  role,
  bookingId,
  initialBookingStatus,
  bookingAmount,
  canConfirmBooking,
  requestId,
}: Props) {
  const [messages, setMessages] = useState<MessageBubbleDTO[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [bookingStatus, setBookingStatus] = useState<string | null>(initialBookingStatus);
  const [sendingPreset, setSendingPreset] = useState(false);
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

  const handleSendPreset = async (presetText: string) => {
    if (sendingPreset) return;
    setSendingPreset(true);
    try {
      const result = await sendMessage({ threadId, text: presetText });
      if (!result.ok) {
        console.error("[chat] send preset failed:", result.message);
      }
    } catch (err) {
      console.error("[chat] send preset error:", err);
    } finally {
      setSendingPreset(false);
    }
  };

  return (
    <div className="flex flex-1 flex-col min-h-0 bg-zinc-50 dark:bg-black">
      {/* Dynamic CTA Actions Toolbar */}
      <div className="mt-3">
        <ThreadActionButtons
          threadId={threadId}
          role={role}
          bookingId={bookingId}
          bookingStatus={bookingStatus as any}
          bookingAmount={bookingAmount}
          canConfirmBooking={canConfirmBooking}
          hasMessages={messages !== null && messages.length > 0}
        />
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 min-h-0 flex flex-col">
        {messages === null ? (
          <p className="text-center text-xs text-zinc-500 my-auto">불러오는 중...</p>
        ) : error ? (
          <p className="rounded bg-red-50 px-3 py-2 text-xs text-red-700 dark:bg-red-950/50 dark:text-red-300">
            {error}
          </p>
        ) : messages.length === 0 ? (
          <div className="mx-auto my-auto max-w-sm px-4 py-8 text-center flex flex-col items-center justify-center">
            {/* Illustrative clean circle badge */}
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-[#2563EB] mb-5 dark:bg-zinc-900 dark:text-blue-400 border border-blue-100/30 dark:border-zinc-800 shadow-[0_4px_12px_rgba(37,99,235,0.08)]">
              <span className="text-2xl animate-pulse">🧹</span>
            </div>
            
            <h3 className="text-[15px] font-extrabold text-zinc-950 dark:text-zinc-50">
              아직 대화가 시작되지 않았어요
            </h3>
            <p className="mt-2 text-[11px] font-bold text-zinc-400 dark:text-zinc-500 leading-relaxed max-w-xs">
              견적 조건과 일정을 확인해보세요. 아래 추천 문구를 탭하면 즉시 첫 대화를 시작할 수 있습니다.
            </p>

            {/* Clickable Template Message Chips */}
            <div className="mt-6 w-full space-y-2 max-w-[280px]">
              {role === "client" ? (
                <>
                  <button
                    onClick={() => handleSendPreset("안녕하세요. 견적 확인했습니다.")}
                    disabled={sendingPreset}
                    className="w-full text-left rounded-xl border border-zinc-200 border-b-[3px] border-b-zinc-300 bg-white px-3.5 py-2.5 text-[11.5px] font-extrabold text-zinc-700 shadow-xs hover:border-blue-400 active:scale-[0.98] active:translate-y-[1px] active:border-b-2 transition-all dark:border-zinc-800 dark:border-b-zinc-950 dark:bg-zinc-900 dark:text-zinc-350 dark:hover:border-zinc-700"
                  >
                    💬 안녕하세요. 견적 확인했습니다.
                  </button>
                  <button
                    onClick={() => handleSendPreset("가능한 날짜를 알려주세요.")}
                    disabled={sendingPreset}
                    className="w-full text-left rounded-xl border border-zinc-200 border-b-[3px] border-b-zinc-300 bg-white px-3.5 py-2.5 text-[11.5px] font-extrabold text-zinc-700 shadow-xs hover:border-blue-400 active:scale-[0.98] active:translate-y-[1px] active:border-b-2 transition-all dark:border-zinc-800 dark:border-b-zinc-950 dark:bg-zinc-900 dark:text-zinc-350 dark:hover:border-zinc-700"
                  >
                    📅 가능한 날짜를 알려주세요.
                  </button>
                  <button
                    onClick={() => handleSendPreset("추가 비용이 발생할 수 있는 부분이 있나요?")}
                    disabled={sendingPreset}
                    className="w-full text-left rounded-xl border border-zinc-200 border-b-[3px] border-b-zinc-300 bg-white px-3.5 py-2.5 text-[11.5px] font-extrabold text-zinc-700 shadow-xs hover:border-blue-400 active:scale-[0.98] active:translate-y-[1px] active:border-b-2 transition-all dark:border-zinc-800 dark:border-b-zinc-950 dark:bg-zinc-900 dark:text-zinc-350 dark:hover:border-zinc-700"
                  >
                    ❓ 추가 비용이 발생할 수 있는 부분이 있나요?
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => handleSendPreset("안녕하세요. 제안해드린 견적 관련하여 문의사항이 있으실까요?")}
                    disabled={sendingPreset}
                    className="w-full text-left rounded-xl border border-zinc-200 border-b-[3px] border-b-zinc-300 bg-white px-3.5 py-2.5 text-[11.5px] font-extrabold text-zinc-700 shadow-xs hover:border-blue-400 active:scale-[0.98] active:translate-y-[1px] active:border-b-2 transition-all dark:border-zinc-800 dark:border-b-zinc-950 dark:bg-zinc-900 dark:text-zinc-350 dark:hover:border-zinc-700"
                  >
                    💬 안녕하세요. 문의사항이 있으실까요?
                  </button>
                  <button
                    onClick={() => handleSendPreset("청소 희망하시는 날짜와 시간대를 말씀해주세요.")}
                    disabled={sendingPreset}
                    className="w-full text-left rounded-xl border border-zinc-200 border-b-[3px] border-b-zinc-300 bg-white px-3.5 py-2.5 text-[11.5px] font-extrabold text-zinc-700 shadow-xs hover:border-blue-400 active:scale-[0.98] active:translate-y-[1px] active:border-b-2 transition-all dark:border-zinc-800 dark:border-b-zinc-950 dark:bg-zinc-900 dark:text-zinc-350 dark:hover:border-zinc-700"
                  >
                    📅 희망 청소 날짜를 알려주세요.
                  </button>
                  <button
                    onClick={() => handleSendPreset("오염도나 특이사항이 있다면 미리 말씀해주세요.")}
                    disabled={sendingPreset}
                    className="w-full text-left rounded-xl border border-zinc-200 border-b-[3px] border-b-zinc-300 bg-white px-3.5 py-2.5 text-[11.5px] font-extrabold text-zinc-700 shadow-xs hover:border-blue-400 active:scale-[0.98] active:translate-y-[1px] active:border-b-2 transition-all dark:border-zinc-800 dark:border-b-zinc-950 dark:bg-zinc-900 dark:text-zinc-350 dark:hover:border-zinc-700"
                  >
                    ⚠️ 오염도나 특이사항이 있으신가요?
                  </button>
                </>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-2 flex-1">
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
          </div>
        )}
        <div ref={endRef} />
      </div>
      <MessageComposer threadId={threadId} role={role} requestId={requestId} />
    </div>
  );
}
