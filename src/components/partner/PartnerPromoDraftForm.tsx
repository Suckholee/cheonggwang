"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

/**
 * v1.7 partner-promo · §7.2 — 초고 생성 폼.
 * 사진 1~5 + 키워드(0~5) + 슬로건(선택) + brandTone → POST /api/partner/posts
 */

interface Props {
  inAutoPublishWindow: boolean;
}

const TONE_LABEL: Record<string, string> = {
  friendly: "친근",
  professional: "전문",
  playful: "발랄",
};

export default function PartnerPromoDraftForm({
  inAutoPublishWindow,
}: Props) {
  const router = useRouter();
  const [files, setFiles] = useState<File[]>([]);
  const [keywords, setKeywords] = useState<string[]>([]);
  const [keywordInput, setKeywordInput] = useState("");
  const [slogan, setSlogan] = useState("");
  const [brandTone, setBrandTone] = useState<
    "friendly" | "professional" | "playful"
  >("friendly");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const list = Array.from(e.target.files ?? []);
    if (list.length > 5) {
      setError("사진은 최대 5장까지 올릴 수 있어요");
      return;
    }
    const tooBig = list.find((f) => f.size > 5 * 1024 * 1024);
    if (tooBig) {
      setError(`각 사진은 5MB 이하여야 합니다 (${tooBig.name})`);
      return;
    }
    setError(null);
    setFiles(list);
  }

  function addKeyword() {
    const v = keywordInput.trim();
    if (!v) return;
    if (keywords.length >= 5) {
      setError("키워드는 최대 5개까지 입력할 수 있어요");
      return;
    }
    if (v.length > 30) {
      setError("키워드는 30자 이내로 입력해 주세요");
      return;
    }
    setKeywords([...keywords, v]);
    setKeywordInput("");
    setError(null);
  }

  function removeKeyword(idx: number) {
    setKeywords(keywords.filter((_, i) => i !== idx));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;
    if (files.length === 0) {
      setError("사진을 1장 이상 올려주세요");
      return;
    }
    setSubmitting(true);
    setError(null);

    try {
      const fd = new FormData();
      for (const f of files) fd.append("photos", f);
      if (keywords.length > 0) {
        fd.append("keywords", JSON.stringify(keywords));
      }
      if (slogan.trim()) fd.append("slogan", slogan.trim());
      fd.append("brandTone", brandTone);

      const res = await fetch("/api/partner/posts", {
        method: "POST",
        body: fd,
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.message || "초고 생성 실패");
        setSubmitting(false);
        return;
      }
      // status: 'draft' | 'published'
      router.push(json.url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "네트워크 오류");
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <div>
        <label className="mb-1 block text-sm font-medium">
          사진 (1~5장, 각 5MB 이하)
        </label>
        <input
          type="file"
          multiple
          accept="image/jpeg,image/png,image/webp"
          onChange={handleFileChange}
          className="block w-full text-sm"
        />
        {files.length > 0 ? (
          <p className="mt-1 text-xs text-zinc-500">
            선택된 사진: {files.length}장 (총{" "}
            {(
              files.reduce((s, f) => s + f.size, 0) /
              (1024 * 1024)
            ).toFixed(1)}{" "}
            MB)
          </p>
        ) : null}
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium">
          키워드 (선택, 5개 이하, 각 30자)
        </label>
        <div className="flex gap-2">
          <input
            type="text"
            value={keywordInput}
            onChange={(e) => setKeywordInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addKeyword();
              }
            }}
            placeholder="예: 신선한 재료"
            className="flex-1 rounded-md border border-zinc-300 px-3 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-900"
          />
          <button
            type="button"
            onClick={addKeyword}
            className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
          >
            추가
          </button>
        </div>
        {keywords.length > 0 ? (
          <ul className="mt-2 flex flex-wrap gap-2">
            {keywords.map((k, i) => (
              <li
                key={i}
                className="flex items-center gap-1 rounded-full bg-zinc-100 px-3 py-1 text-xs dark:bg-zinc-800"
              >
                {k}
                <button
                  type="button"
                  onClick={() => removeKeyword(i)}
                  className="text-zinc-400 hover:text-zinc-700"
                  aria-label={`${k} 제거`}
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium">
          슬로건 (선택, 40자 이내)
        </label>
        <input
          type="text"
          value={slogan}
          onChange={(e) => setSlogan(e.target.value.slice(0, 40))}
          placeholder="예: 오늘도 정성껏"
          className="w-full rounded-md border border-zinc-300 px-3 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-900"
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium">브랜드 톤</label>
        <div className="flex gap-3">
          {(["friendly", "professional", "playful"] as const).map((t) => (
            <label
              key={t}
              className="flex items-center gap-1.5 text-sm"
            >
              <input
                type="radio"
                name="brandTone"
                value={t}
                checked={brandTone === t}
                onChange={() => setBrandTone(t)}
              />
              {TONE_LABEL[t]}
            </label>
          ))}
        </div>
      </div>

      {inAutoPublishWindow ? (
        <div className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-200">
          ⚡ 지금이 자동발행 윈도우입니다. 초고가 hygiene 통과하면 즉시
          공개됩니다.
        </div>
      ) : null}

      {error ? (
        <div
          role="alert"
          className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-200"
        >
          {error}
        </div>
      ) : null}

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={submitting || files.length === 0}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {submitting ? "생성 중…" : "✨ 초고 생성"}
        </button>
      </div>
    </form>
  );
}
