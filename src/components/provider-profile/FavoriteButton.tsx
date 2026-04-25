"use client";

import { useEffect, useState } from "react";
import { Heart } from "lucide-react";

const STORAGE_KEY = "cheonggwang:favorites";

function readFavorites(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

function writeFavorites(list: string[]): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  } catch {
    // quota exceeded or disabled — 무시
  }
}

export function FavoriteButton({ providerId }: { providerId: string }) {
  const [active, setActive] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setActive(readFavorites().includes(providerId));
    setHydrated(true);
  }, [providerId]);

  function toggle() {
    const list = readFavorites();
    const next = active
      ? list.filter((id) => id !== providerId)
      : [...list, providerId];
    writeFavorites(next);
    setActive(!active);
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={active}
      aria-label={active ? "즐겨찾기 해제" : "즐겨찾기 추가"}
      className="flex h-10 w-10 items-center justify-center rounded-full bg-white/90 shadow-md backdrop-blur transition-colors hover:bg-white dark:bg-zinc-900/90 dark:hover:bg-zinc-900"
    >
      <Heart
        className={`h-5 w-5 transition-colors ${
          hydrated && active
            ? "fill-rose-500 text-rose-500"
            : "text-zinc-700 dark:text-zinc-300"
        }`}
        aria-hidden
      />
    </button>
  );
}
