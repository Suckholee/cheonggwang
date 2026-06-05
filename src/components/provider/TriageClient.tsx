"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { X, MessageCircle, Check, Inbox } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
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
        <div className="mx-auto flex max-w-[480px] items-center justify-between gap-3 px-5 py-4">
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
      className={`flex flex-1 flex-col items-center gap-1.5 rounded-2xl py-3 px-2 text-xs font-extrabold transition-all duration-200 shadow-xs border ${
        isPrimary
          ? "bg-indigo-650 text-white border-indigo-700 border-b-[4px] border-b-indigo-800 hover:bg-indigo-500 hover:scale-[1.03] active:scale-[0.97] active:translate-y-[2px] active:border-b-[2px] disabled:opacity-50 disabled:pointer-events-none"
          : "bg-white text-zinc-750 border-zinc-200 border-b-[4px] border-b-zinc-300 hover:border-zinc-300 hover:scale-[1.03] active:scale-[0.97] active:translate-y-[2px] active:border-b-[2px] disabled:opacity-30 disabled:pointer-events-none dark:bg-zinc-900 dark:text-zinc-300 dark:border-zinc-800 dark:border-b-zinc-950"
      }`}
    >
      <span className={`flex h-10 w-10 items-center justify-center rounded-full ${
        isPrimary ? "bg-white/10" : "bg-zinc-50 dark:bg-zinc-950"
      }`}>
        {icon}
      </span>
      <span>{label}</span>
    </button>
  );
}

function EmptyQueue() {
  return (
    <div className="overflow-hidden flex flex-col items-center rounded-[24px] border border-zinc-200 bg-white shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:bg-zinc-900 dark:border-zinc-800">
      <div className="relative h-44 w-full bg-zinc-100 dark:bg-zinc-950">
        <Image
          src="/images/clean_office_cafe.png"
          alt="받은 요청 없음"
          fill
          sizes="(max-width: 640px) 100vw, 400px"
          className="object-cover"
        />
        {/* Soft mask overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-white via-white/40 to-transparent dark:from-zinc-900 dark:via-zinc-900/40" />

        {/* Floating icon badge */}
        <div className="absolute left-1/2 bottom-0 -translate-x-1/2 translate-y-1/2 flex h-14 w-14 items-center justify-center rounded-2xl border-4 border-white bg-[#2563EB] text-white shadow-md dark:border-zinc-900 dark:bg-[#3B82F6]">
          <Inbox className="h-6 w-6" strokeWidth={2.5} />
        </div>
      </div>

      <div className="px-5 pb-6 pt-10 text-center flex flex-col items-center">
        <h2 className="text-[16px] font-extrabold text-zinc-900 dark:text-zinc-50">
          모든 요청을 확인했어요!
        </h2>
        <p className="mt-1.5 max-w-xs text-xs font-bold text-zinc-400 dark:text-zinc-500 leading-normal">
          주변 지역에 새로운 청소 견적 요청이 등록되면 가장 먼저 알려드릴게요.
        </p>

        <Link
          href="/provider/home"
          className="mt-6 inline-flex w-full min-w-[200px] items-center justify-center gap-1.5 rounded-xl bg-white text-zinc-750 font-extrabold border border-zinc-200 border-b-[3px] border-b-zinc-300 px-4 py-2.5 text-xs shadow-xs hover:border-[#2563EB]/40 hover:scale-[1.02] active:scale-[0.96] active:translate-y-[1px] transition-all dark:bg-zinc-900 dark:text-zinc-300 dark:border-zinc-800 dark:border-b-zinc-950"
        >
          대시보드로 돌아가기
        </Link>
      </div>
    </div>
  );
}

