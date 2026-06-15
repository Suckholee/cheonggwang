"use client";

import { useState, useTransition, useRef } from "react";
import { Send, Plus, Camera, Calendar, FileText, Clipboard } from "lucide-react";
import { useRouter } from "next/navigation";
import { sendMessage } from "@/app/actions/chat-actions";
import { BookingConfirmModal } from "@/components/booking/BookingConfirmModal";

interface Props {
  threadId: string;
  role: "client" | "provider";
  requestId?: string;
}

const MAX_LEN = 2000;

export function MessageComposer({ threadId, role, requestId }: Props) {
  const [text, setText] = useState("");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [showActions, setShowActions] = useState(false);
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isComposingRef = useRef(false);
  const router = useRouter();

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
    if (isComposingRef.current) return;
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  const handlePhotoClick = () => {
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setError("사진 전송 기능은 서비스 준비 중입니다.");
    }
  };

  const handleScheduleClick = () => {
    setError(null);
    if (role === "provider") {
      setConfirmModalOpen(true);
    } else {
      setText((prev) => {
        const textToAppend = "📅 청소 가능한 일정을 제안해 주세요.";
        return prev ? `${prev}\n${textToAppend}` : textToAppend;
      });
      textareaRef.current?.focus();
    }
  };

  const handleQuoteClick = () => {
    setError(null);
    if (!requestId) return;
    const href =
      role === "client"
        ? `/received/${requestId}`
        : `/provider/requests/${requestId}/propose`;
    router.push(href);
  };

  const handleRequestClick = () => {
    setError(null);
    if (!requestId) return;
    const href =
      role === "client"
        ? `/received/${requestId}`
        : `/provider/requests/${requestId}/propose`;
    router.push(href);
  };

  return (
    <div className="border-t border-zinc-200 bg-white p-3.5 dark:border-zinc-800 dark:bg-zinc-950">
      {error && (
        <p className="mb-2.5 rounded-lg bg-red-50 px-3 py-2 text-xs font-bold text-red-700 dark:bg-red-950/20 dark:text-red-400">
          {error}
        </p>
      )}

      {/* Hidden file input */}
      <input
        type="file"
        accept="image/*"
        ref={fileInputRef}
        onChange={handleFileChange}
        className="hidden"
      />

      {/* Collapsible Quick Actions Menu */}
      {showActions && (
        <div className="mb-3 flex flex-row gap-2 overflow-x-auto pb-1 scrollbar-none -mx-3.5 px-3.5">
          <button
            type="button"
            onClick={handlePhotoClick}
            className="shrink-0 whitespace-nowrap flex items-center gap-1.5 rounded-full border border-zinc-200 bg-white px-3 py-1.5 text-[11px] font-extrabold text-zinc-700 shadow-xs hover:border-blue-400 hover:text-blue-600 transition-all active:scale-95 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-350 dark:hover:border-zinc-700"
          >
            <Camera className="h-3.5 w-3.5 text-zinc-400" />
            📷 사진 첨부
          </button>
          
          <button
            type="button"
            onClick={handleScheduleClick}
            className="shrink-0 whitespace-nowrap flex items-center gap-1.5 rounded-full border border-zinc-200 bg-white px-3 py-1.5 text-[11px] font-extrabold text-zinc-700 shadow-xs hover:border-blue-400 hover:text-blue-600 transition-all active:scale-95 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-350 dark:hover:border-zinc-700"
          >
            <Calendar className="h-3.5 w-3.5 text-zinc-400" />
            📅 일정 제안
          </button>
 
          {requestId && (
            <>
              <button
                type="button"
                onClick={handleQuoteClick}
                className="shrink-0 whitespace-nowrap flex items-center gap-1.5 rounded-full border border-zinc-200 bg-white px-3 py-1.5 text-[11px] font-extrabold text-zinc-700 shadow-xs hover:border-blue-400 hover:text-blue-600 transition-all active:scale-95 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-350 dark:hover:border-zinc-700"
              >
                <FileText className="h-3.5 w-3.5 text-zinc-400" />
                📄 견적 보기
              </button>
 
              <button
                type="button"
                onClick={handleRequestClick}
                className="shrink-0 whitespace-nowrap flex items-center gap-1.5 rounded-full border border-zinc-200 bg-white px-3 py-1.5 text-[11px] font-extrabold text-zinc-700 shadow-xs hover:border-blue-400 hover:text-blue-600 transition-all active:scale-95 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-350 dark:hover:border-zinc-700"
              >
                <Clipboard className="h-3.5 w-3.5 text-zinc-400" />
                📋 요청서 보기
              </button>
            </>
          )}
        </div>
      )}

      {/* Main Composer Bar */}
      <div className="flex items-end gap-2.5">
        <button
          type="button"
          onClick={() => setShowActions(!showActions)}
          aria-label="퀵 메뉴 열기"
          className={`shrink-0 flex h-9 w-9 items-center justify-center rounded-full transition-all border ${
            showActions
              ? "bg-zinc-150 border-zinc-300 text-zinc-800 rotate-45 dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-200"
              : "text-zinc-400 bg-white border-zinc-250 hover:text-zinc-650 hover:bg-zinc-50 dark:bg-zinc-900 dark:border-zinc-800 dark:hover:bg-zinc-850"
          }`}
        >
          <Plus className="h-5 w-5" strokeWidth={2.5} />
        </button>

        <textarea
          ref={textareaRef}
          rows={1}
          value={text}
          onChange={(e) => setText(e.target.value.slice(0, MAX_LEN))}
          onKeyDown={handleKey}
          onCompositionStart={() => {
            isComposingRef.current = true;
          }}
          onCompositionEnd={(e) => {
            isComposingRef.current = false;
            setText(e.currentTarget.value.slice(0, MAX_LEN));
          }}
          aria-label="메시지 입력"
          placeholder="메시지를 입력하세요"
          className="max-h-32 min-h-10 flex-1 resize-none rounded-2xl border border-zinc-250 bg-white px-3.5 py-2 text-sm outline-none focus:border-blue-500 dark:border-zinc-800 dark:bg-zinc-950"
        />

        <button
          type="button"
          disabled={!canSend}
          onClick={handleSend}
          aria-label="메시지 전송"
          className="shrink-0 flex h-9 w-9 items-center justify-center rounded-full bg-[#2563EB] text-white transition-colors hover:bg-blue-700 disabled:opacity-40 shadow-xs"
        >
          <Send className="h-4 w-4" aria-hidden />
        </button>
      </div>

      {text.length > MAX_LEN - 200 && (
        <p className="mt-1 text-right text-[11px] text-zinc-500">
          {text.length} / {MAX_LEN}
        </p>
      )}

      {/* Booking confirmation modal inline for providers */}
      {confirmModalOpen && (
        <BookingConfirmModal
          threadId={threadId}
          open={confirmModalOpen}
          onClose={() => setConfirmModalOpen(false)}
        />
      )}
    </div>
  );
}
