"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { Provider } from "@/types/provider";

/**
 * v1.8 admin-console · §5.6 — providers 목록 + verified·insured 토글.
 *  - 낙관적 UI (즉시 토글, 실패 시 롤백)
 */

interface Props {
  providers: Provider[];
}

export default function ProvidersList({ providers: initial }: Props) {
  const router = useRouter();
  const [providers, setProviders] = useState(initial);
  const [busy, setBusy] = useState<string | null>(null);
  const [_, startTransition] = useTransition();

  async function toggle(
    id: string,
    field: "verified" | "insured",
    next: boolean,
  ) {
    if (busy) return;
    setBusy(`${id}-${field}`);
    // 낙관적 업데이트
    setProviders((curr) =>
      curr.map((p) => (p.id === id ? { ...p, [field]: next } : p)),
    );
    try {
      const res = await fetch(`/api/admin/providers/${id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ [field]: next }),
      });
      if (!res.ok) {
        // 롤백
        setProviders((curr) =>
          curr.map((p) => (p.id === id ? { ...p, [field]: !next } : p)),
        );
        const json = await res.json().catch(() => ({}));
        alert(json.message ?? "변경 실패");
        return;
      }
      startTransition(() => router.refresh());
    } finally {
      setBusy(null);
    }
  }

  if (providers.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-zinc-300 p-8 text-center text-zinc-500 dark:border-zinc-700">
        등록된 청명이 없습니다.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
      <table className="w-full text-sm">
        <thead className="bg-zinc-50 text-left text-xs text-zinc-500 dark:bg-zinc-800">
          <tr>
            <th className="px-3 py-2">매장명</th>
            <th className="px-3 py-2">카테고리</th>
            <th className="px-3 py-2">지역</th>
            <th className="px-3 py-2 text-center">verified</th>
            <th className="px-3 py-2 text-center">insured</th>
            <th className="px-3 py-2 text-right">평가</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
          {providers.map((p) => (
            <tr key={p.id}>
              <td className="px-3 py-2 font-medium">{p.companyName}</td>
              <td className="px-3 py-2 text-zinc-500">
                {p.categories.slice(0, 3).join(", ")}
                {p.categories.length > 3 ? " ..." : ""}
              </td>
              <td className="px-3 py-2 text-zinc-500">
                {p.regions.slice(0, 2).join(", ") || "-"}
              </td>
              <td className="px-3 py-2 text-center">
                <input
                  type="checkbox"
                  checked={p.verified === true}
                  disabled={busy === `${p.id}-verified`}
                  onChange={(e) => toggle(p.id, "verified", e.target.checked)}
                  className="h-4 w-4 cursor-pointer"
                />
              </td>
              <td className="px-3 py-2 text-center">
                <input
                  type="checkbox"
                  checked={p.insured === true}
                  disabled={busy === `${p.id}-insured`}
                  onChange={(e) => toggle(p.id, "insured", e.target.checked)}
                  className="h-4 w-4 cursor-pointer"
                />
              </td>
              <td className="px-3 py-2 text-right text-xs text-zinc-500">
                ★{(p.rating ?? 0).toFixed(1)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
