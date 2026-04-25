"use client";

import { useState, useTransition, useRef } from "react";
import { Send, Image as ImageIcon } from "lucide-react";
import { sendMessage } from "@/app/actions/chat-actions";

interface Props {
  threadId: string;
}

const MAX_LEN = 2000;

export function MessageComposer({ threadId }: Props) {
  const [text, setText] = useState("");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const trimmed = text.trim();
  const canSend = trimmed.length > 0 && trimmed.length <= MAX_LEN && !isPending;

  function handleSend() {
    if (!canSend) return;
    setError(null);
    const toSend = trimmed;
    setText("");
    startTransition(async () => {
      const result = await sendMessage({ threadId, text: toSend });
      if (!result.ok) {
        setError(result.message);
        setText(toSend);
      }
    });
  }

  function handleKey(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  return (
    <div className="border-t border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-950">
      {error && (
        <p className="mb-2 rounded bg-red-50 px-2 py-1 text-xs text-red-700 dark:bg-red-950/50 dark:text-red-300">
          {error}
        </p>
      )}
      <div className="flex items-end gap-2">
        <button
          type="button"
          disabled
          aria-label="이미지 첨부 (v1.2b 예정)"
          title="이미지 첨부는 곧 추가됩니다"
          className="shrink-0 rounded-lg p-2 text-zinc-400 disabled:opacity-50"
        >
          <ImageIcon className="h-5 w-5" aria-hidden />
        </button>
        <textarea
          ref={textareaRef}
          rows={1}
          value={text}
          onChange={(e) => setText(e.target.value.slice(0, MAX_LEN))}
          onKeyDown={handleKey}
          aria-label="메시지 입력"
          placeholder="메시지를 입력하세요"
          className="max-h-32 min-h-10 flex-1 resize-none rounded-2xl border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-500 dark:border-zinc-700 dark:bg-zinc-950"
        />
        <button
          type="button"
          disabled={!canSend}
          onClick={handleSend}
          aria-label="메시지 전송"
          className="shrink-0 rounded-full bg-indigo-600 p-2.5 text-white transition-colors hover:bg-indigo-700 disabled:opacity-40"
        >
          <Send className="h-4 w-4" aria-hidden />
        </button>
      </div>
      {text.length > MAX_LEN - 200 && (
        <p className="mt-1 text-right text-[11px] text-zinc-500">
          {text.length} / {MAX_LEN}
        </p>
      )}
    </div>
  );
}
