"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";

const DEBOUNCE_MS = 300;

export function SearchInput() {
  const router = useRouter();
  const sp = useSearchParams();
  const pathname = usePathname();
  const initial = sp.get("q") ?? "";
  const [value, setValue] = useState(initial);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // URL query가 외부(뒤로가기 등)로 바뀌면 로컬 상태 동기화
  useEffect(() => {
    setValue(sp.get("q") ?? "");
  }, [sp]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  function handleChange(next: string) {
    setValue(next);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      const params = new URLSearchParams(sp);
      const trimmed = next.trim();
      if (trimmed) params.set("q", trimmed);
      else params.delete("q");
      const qs = params.toString();
      const targetPath = pathname || "/discover";
      router.replace(qs ? `${targetPath}?${qs}` : targetPath);
    }, DEBOUNCE_MS);
  }

  return (
    <div className="relative flex-1 max-w-md">
      <input
        type="search"
        value={value}
        onChange={(e) => handleChange(e.target.value)}
        placeholder="업체명·태그·키워드 검색"
        aria-label="검색"
        className="w-full rounded-[14px] border border-transparent bg-zinc-100 py-2.5 pl-10 pr-4 text-[14px] font-medium outline-none transition-colors focus:bg-zinc-200 dark:bg-zinc-900 dark:focus:bg-zinc-800"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={2.5}
          stroke="currentColor"
          className="h-4 w-4"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z"
          />
        </svg>
      </div>
    </div>
  );
}
