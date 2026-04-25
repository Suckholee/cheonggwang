"use client";

import { formatRelativeTime } from "@/lib/format/relative-time";
import type { MessageBubbleDTO } from "@/types/chat";

interface Props {
  message: MessageBubbleDTO;
}

export function MessageBubble({ message }: Props) {
  const { text, mine, createdAtMs, type } = message;

  // v1.3 #1 booking — 시스템 메시지: 중앙 정렬 · gray bg · icon prefix · avatar 없음
  if (type === "system") {
    return (
      <div className="flex justify-center">
        <div className="max-w-[85%] rounded-xl bg-zinc-100 px-3 py-2 text-center text-xs whitespace-pre-wrap text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200">
          <p>{text}</p>
          <p className="mt-1 text-[10px] text-zinc-500">
            {formatRelativeTime(createdAtMs)}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex ${mine ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[75%] rounded-2xl px-3 py-2 text-sm whitespace-pre-wrap break-words ${
          mine
            ? "bg-indigo-600 text-white"
            : "bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-50"
        }`}
      >
        <p>{text}</p>
        <p
          className={`mt-1 text-[10px] ${
            mine ? "text-indigo-100" : "text-zinc-500"
          }`}
        >
          {formatRelativeTime(createdAtMs)}
        </p>
      </div>
    </div>
  );
}
