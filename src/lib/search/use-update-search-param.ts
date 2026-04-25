"use client";

import { useRouter, useSearchParams } from "next/navigation";

/**
 * v1.2 #2 provider-search — FilterBar 하위 Client 컨트롤 공용 URL 갱신 hook.
 * `router.replace({ scroll: false })`로 스크롤 위치 보존.
 */
export function useUpdateSearchParam() {
  const router = useRouter();
  const sp = useSearchParams();

  return (key: string, value: string | null) => {
    const next = new URLSearchParams(sp.toString());
    if (value === null || value === "") next.delete(key);
    else next.set(key, value);
    const qs = next.toString();
    router.replace(qs ? `/search?${qs}` : "/search", { scroll: false });
  };
}
