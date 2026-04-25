"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { X, MessageCircle, Check } from "lucide-react";
import { RequestCard } from "./RequestCard";
import { passRequest } from "@/app/actions/quote-response-actions";
import type { QuoteRequest } from "@/types/quote-request";
import type { Provider } from "@/types/provider";

interface Props {
  initialRequests: QuoteRequest[];
  provider: Provider;
}

export function TriageClient({ initialRequests, provider }: Props) {
  const router = useRouter();
  const [requests, setRequests] = useState<QuoteRequest[]>(initialRequests);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPending, startTransition] = useTransition();
  const [toast, setToast] = useState<string | null>(null);

  const total = requests.length;
  const current = requests[currentIndex];

  const regionLabel =
    provider.regions[0]?.district ?? provider.regions[0]?.city ?? "전국";

  if (total === 0 || currentIndex >= total) {
    return <EmptyQueue />;
  }

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 2000);
  }

  function handlePass() {
    if (!current) return;
    const requestId = current.id;
    startTransition(async () => {
      const result = await passRequest({ requestId });
      if (result.ok) {
        setRequests((prev) => prev.filter((r) => r.id !== requestId));
        // currentIndex는 필터링 후 동일 index가 다음 항목을 가리킴
      } else {
        showToast(result.message);
      }
    });
  }

  function handleAsk() {
    showToast("문의 기능은 v1.2에 추가됩니다");
  }

  function handlePropose() {
    if (!current) return;
    router.push(`/provider/requests/${current.id}/propose`);
  }

  return (
    <div className="relative flex flex-col gap-4 pb-32">
      <div className="flex items-baseline justify-between">
        <h1 className="text-xl font-bold">받은 요청</h1>
        <span className="text-sm text-zinc-500">
          {currentIndex + 1} / {total} · {regionLabel} 주변
        </span>
      </div>

      <RequestCard request={current} provider={provider} />

      {/* Bottom fixed action bar — BottomTabNav(64px) 위로 올림 */}
      <div
        className="fixed inset-x-0 z-30 border-t border-zinc-200 bg-white/95 backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/95"
        style={{ bottom: "var(--bottom-nav-height)" }}
      >
        <div className="mx-auto flex max-w-xl items-center justify-around px-4 py-3">
          <ActionButton
            icon={<X className="h-5 w-5" />}
            label="관심없음"
            onClick={handlePass}
            disabled={isPending}
            tone="neutral"
          />
          <ActionButton
            icon={<MessageCircle className="h-5 w-5" />}
            label="문의"
            onClick={handleAsk}
            disabled
            tone="neutral"
          />
          <ActionButton
            icon={<Check className="h-5 w-5" />}
            label="제안하기"
            onClick={handlePropose}
            disabled={isPending}
            tone="primary"
          />
        </div>
      </div>

      {toast && (
        <div
          className="fixed left-1/2 z-40 -translate-x-1/2 rounded-full bg-zinc-900 px-4 py-2 text-sm text-white shadow-lg dark:bg-zinc-100 dark:text-zinc-900"
          style={{ bottom: "calc(var(--bottom-nav-height) + 5.5rem)" }}
        >
          {toast}
        </div>
      )}
    </div>
  );
}

function ActionButton({
  icon,
  label,
  onClick,
  disabled,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  tone: "primary" | "neutral";
}) {
  const isPrimary = tone === "primary";
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`flex flex-1 flex-col items-center gap-1 rounded-xl py-2 text-xs font-semibold transition-colors ${
        isPrimary
          ? "bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50"
          : "text-zinc-700 hover:bg-zinc-100 disabled:opacity-40 dark:text-zinc-300 dark:hover:bg-zinc-900"
      }`}
    >
      <span className="flex h-10 w-10 items-center justify-center rounded-full border border-current">
        {icon}
      </span>
      <span>{label}</span>
    </button>
  );
}

function EmptyQueue() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
      <span className="text-5xl" aria-hidden>
        🎉
      </span>
      <h2 className="text-lg font-bold">모두 확인했어요!</h2>
      <p className="text-sm text-zinc-500">
        새 요청이 도착하면 알려드릴게요
      </p>
    </div>
  );
}
