"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import AutoPublishSettings from "@/components/partner/AutoPublishSettings";
import type { Partner, PartnerStatus } from "@/types/partner";

/**
 * v1.8 admin-console · §5.5 — partner 상세 편집.
 *  - status 토글 (active ↔ suspended)
 *  - autoPublish: AutoPublishSettings 재활용 (endpoint·onSaved props로 admin 모드 주입, R1·C1)
 */

interface Props {
  partner: Partner;
}

export default function PartnerEditor({ partner }: Props) {
  const router = useRouter();
  const [status, setStatus] = useState<PartnerStatus>(partner.status);
  const [busy, setBusy] = useState(false);
  const [info, setInfo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const endpoint = `/api/admin/partners/${partner.id}`;

  async function toggleStatus() {
    if (busy) return;
    const next: PartnerStatus = status === "active" ? "suspended" : "active";
    if (
      !confirm(
        next === "suspended"
          ? "이 partner를 정지(suspended)로 변경합니다. 향후 작성·발행이 차단됩니다."
          : "이 partner를 활성(active)로 변경합니다.",
      )
    )
      return;
    setBusy(true);
    setError(null);
    setInfo(null);
    try {
      const res = await fetch(endpoint, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ status: next }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(json.message ?? "변경 실패");
        return;
      }
      setStatus(next);
      setInfo(`status: ${next}로 변경됨`);
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <section className="rounded-lg border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
        <h2 className="mb-3 text-sm font-semibold">기본 정보</h2>
        <dl className="grid grid-cols-[100px_1fr] gap-y-2 text-sm">
          <dt className="text-zinc-500">partnerId</dt>
          <dd className="font-mono">{partner.id}</dd>
          <dt className="text-zinc-500">매장명</dt>
          <dd>{partner.businessName}</dd>
          <dt className="text-zinc-500">ownerUid</dt>
          <dd className="break-all font-mono text-xs">{partner.ownerUid}</dd>
          <dt className="text-zinc-500">지역</dt>
          <dd>{partner.regionLabel ?? "(미지정)"}</dd>
          <dt className="text-zinc-500">카테고리</dt>
          <dd>{partner.category ?? "(미지정)"}</dd>
          <dt className="text-zinc-500">발급</dt>
          <dd>
            {partner.issuedAt.toLocaleString("ko-KR", { timeZone: "Asia/Seoul" })} · by{" "}
            {partner.issuedBy}
          </dd>
        </dl>
      </section>

      <section className="rounded-lg border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
        <h2 className="mb-3 text-sm font-semibold">Status</h2>
        <p className="mb-3 text-sm">
          현재:{" "}
          <span
            className={
              status === "active"
                ? "font-medium text-emerald-600"
                : status === "suspended"
                  ? "font-medium text-amber-600"
                  : "font-medium text-zinc-700"
            }
          >
            {status === "active" ? "✅ active" : status === "suspended" ? "🚫 suspended" : "✉ invited"}
          </span>
        </p>
        <button
          onClick={toggleStatus}
          disabled={busy || status === "invited"}
          className="rounded-md border border-zinc-300 px-4 py-2 text-sm hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
        >
          {busy
            ? "변경 중…"
            : status === "active"
              ? "🚫 suspended로 변경"
              : "✅ active로 복귀"}
        </button>
        {info ? (
          <p className="mt-2 text-xs text-emerald-600">{info}</p>
        ) : null}
        {error ? (
          <p className="mt-2 text-xs text-red-600">{error}</p>
        ) : null}
      </section>

      <section className="rounded-lg border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
        <h2 className="mb-3 text-sm font-semibold">자동발행 (운영자 강제)</h2>
        <p className="mb-3 text-xs text-zinc-500">
          ⓘ 이 설정을 변경하면 partner 본인이 변경한 것과 동일하게 적용됩니다.
        </p>
        <AutoPublishSettings
          initial={partner.autoPublish}
          endpoint={endpoint}
          onSaved={() => router.refresh()}
        />
      </section>
    </div>
  );
}
