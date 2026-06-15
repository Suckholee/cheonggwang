"use client";

import { useState, useTransition } from "react";
import { setIsAvailable } from "@/app/actions/provider-dashboard-actions";

interface Props {
  initial: boolean;
}

export function AvailabilityToggle({ initial }: Props) {
  const [isAvailable, setState] = useState(initial);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function onToggle() {
    const next = !isAvailable;
    setState(next);
    setError(null);
    startTransition(async () => {
      const result = await setIsAvailable({ available: next });
      if (!result.ok) {
        setState(!next);
        setError(result.message);
      }
    });
  }

  return (
    <div className="relative flex items-center justify-between gap-3 w-full">
      <div className="flex flex-col min-w-0">
        <span className="text-[13px] font-black text-zinc-800 dark:text-zinc-200 leading-tight">
          활동 상태: {isAvailable ? "활동중" : "일시중지"}
        </span>
        <span className="text-[11px] font-bold text-zinc-400 dark:text-zinc-500 leading-none mt-1 truncate">
          {isAvailable ? "신규 요청을 수신할 수 있습니다." : "신규 요청 수신이 일시 중지됩니다."}
        </span>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={isAvailable}
        aria-label="활동중 상태"
        disabled={isPending}
        onClick={onToggle}
        className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${
          isAvailable
            ? "bg-emerald-500"
            : "bg-zinc-300 dark:bg-zinc-700"
        } disabled:opacity-50`}
      >
        <span
          className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
            isAvailable ? "translate-x-5" : "translate-x-0.5"
          }`}
          aria-hidden
        />
      </button>
      {error && (
        <span className="absolute -bottom-4 left-0 text-[10px] font-bold text-red-600 dark:text-red-400">{error}</span>
      )}
    </div>
  );
}
