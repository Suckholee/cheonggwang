"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { QUOTE_CATEGORIES, QUOTE_CATEGORY_LABELS } from "@/domain/quote-category";

/**
 * v1.8 admin-console · §5.4 — partner 발급 폼.
 *  Step 1: 이메일 → /api/admin/users/lookup → uid 자동 수집
 *  Step 2: 추가 필드
 *  Step 3: POST /api/admin/partners → 상세 페이지로 redirect
 */

interface Looked {
  uid: string;
  displayName: string;
  email: string;
}

export default function PartnerIssueForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [looked, setLooked] = useState<Looked | null>(null);
  const [businessName, setBusinessName] = useState("");
  const [regionLabel, setRegionLabel] = useState("");
  const [category, setCategory] = useState<string>("");
  const [logoUrl, setLogoUrl] = useState("");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState<"lookup" | "issue" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function lookup() {
    if (busy) return;
    setBusy("lookup");
    setError(null);
    try {
      const res = await fetch(
        `/api/admin/users/lookup?email=${encodeURIComponent(email)}`,
      );
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(json.message ?? "사용자 조회 실패");
        setLooked(null);
        return;
      }
      setLooked({
        uid: json.uid,
        displayName: json.displayName ?? "",
        email: json.email ?? email,
      });
    } finally {
      setBusy(null);
    }
  }

  async function issue() {
    if (!looked || busy) return;
    if (!businessName.trim()) {
      setError("매장명을 입력하세요");
      return;
    }
    setBusy("issue");
    setError(null);
    try {
      const res = await fetch("/api/admin/partners", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          uid: looked.uid,
          businessName: businessName.trim(),
          regionLabel: regionLabel.trim() || undefined,
          category: category || undefined,
          logoUrl: logoUrl.trim() || undefined,
          notes: notes.trim() || undefined,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(json.message ?? "발급 실패");
        return;
      }
      router.push(json.redirectTo ?? "/admin/partners");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-6">
      <section className="space-y-2">
        <h2 className="text-sm font-semibold">Step 1 · Firebase Auth 사용자 조회</h2>
        <div className="flex gap-2">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="user@example.com"
            className="flex-1 rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
          />
          <button
            onClick={lookup}
            disabled={!email.trim() || busy !== null}
            className="rounded-md bg-zinc-200 px-4 py-2 text-sm hover:bg-zinc-300 disabled:opacity-50 dark:bg-zinc-700 dark:hover:bg-zinc-600"
          >
            {busy === "lookup" ? "조회 중…" : "조회"}
          </button>
        </div>
        {looked ? (
          <div className="rounded-md border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm text-emerald-800 dark:border-emerald-700 dark:bg-emerald-950 dark:text-emerald-200">
            ✓ uid: <code>{looked.uid}</code> · {looked.displayName || "(이름 없음)"} ({looked.email})
          </div>
        ) : null}
      </section>

      {looked ? (
        <section className="space-y-4">
          <h2 className="text-sm font-semibold">Step 2 · 매장 정보</h2>
          <div>
            <label className="mb-1 block text-sm font-medium">매장명*</label>
            <input
              type="text"
              value={businessName}
              maxLength={40}
              onChange={(e) => setBusinessName(e.target.value)}
              className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-sm font-medium">지역</label>
              <input
                type="text"
                value={regionLabel}
                maxLength={60}
                onChange={(e) => setRegionLabel(e.target.value)}
                placeholder="서울 강남구"
                className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">카테고리</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
              >
                <option value="">(미지정)</option>
                {QUOTE_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {QUOTE_CATEGORY_LABELS[c]}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">로고 URL</label>
            <input
              type="url"
              value={logoUrl}
              onChange={(e) => setLogoUrl(e.target.value)}
              className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">메모</label>
            <textarea
              value={notes}
              maxLength={500}
              rows={3}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
            />
          </div>
        </section>
      ) : null}

      {error ? (
        <div className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-200">
          {error}
        </div>
      ) : null}

      <div className="flex justify-end gap-2">
        <button
          onClick={() => router.push("/admin/partners")}
          disabled={busy !== null}
          className="rounded-md border border-zinc-300 px-4 py-2 text-sm hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
        >
          취소
        </button>
        <button
          onClick={issue}
          disabled={!looked || !businessName.trim() || busy !== null}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {busy === "issue" ? "발급 중…" : "✨ 발급"}
        </button>
      </div>
    </div>
  );
}
