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
    <div className="flex items-center gap-3">
      <button
        type="button"
        role="switch"
        aria-checked={isAvailable}
        aria-label="활동중 상태"
        disabled={isPending}
        onClick={onToggle}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
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
      <span className="text-xs text-zinc-600 dark:text-zinc-400">
        {isAvailable ? "활동중" : "일시중지"}
      </span>
      {error && (
        <span className="text-xs text-red-600 dark:text-red-400">{error}</span>
      )}
    </div>
  );
}
