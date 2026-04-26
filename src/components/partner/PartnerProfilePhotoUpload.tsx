"use client";

import { useState } from "react";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { onAuthStateChanged } from "firebase/auth";
import { useEffect } from "react";
import { clientAuth, clientStorage } from "@/lib/firebase/client";
import { Trash2, Upload } from "lucide-react";

/**
 * v1.11 partner-rag-system · §6.1 — 영구 매장 사진 업로드.
 * Storage path: /partners/{uid}/profile/{filename}
 *  - 사장님이 직접 업로드 (storage rules: owner write).
 *  - downloadURL을 부모로 콜백.
 */

interface Props {
  values: string[];
  onChange: (urls: string[]) => void;
  max?: number;
}

export function PartnerProfilePhotoUpload({
  values,
  onChange,
  max = 10,
}: Props) {
  const [uid, setUid] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    return onAuthStateChanged(clientAuth, (u) => setUid(u?.uid ?? null));
  }, []);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    e.target.value = "";
    if (files.length === 0) return;
    if (!uid) {
      setError("로그인 세션이 만료되었습니다.");
      return;
    }
    if (values.length + files.length > max) {
      setError(`사진은 최대 ${max}장까지 등록할 수 있어요.`);
      return;
    }
    const tooBig = files.find((f) => f.size > 5 * 1024 * 1024);
    if (tooBig) {
      setError(`각 사진은 5MB 이하여야 합니다 (${tooBig.name})`);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const urls = await Promise.all(
        files.map(async (file) => {
          const filename = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, "_")}`;
          const path = `partners/${uid}/profile/${filename}`;
          const r = ref(clientStorage, path);
          await uploadBytes(r, file, { contentType: file.type });
          return getDownloadURL(r);
        }),
      );
      onChange([...values, ...urls]);
    } catch (e) {
      console.error("[profile photo upload]", e);
      setError("업로드 실패. 다시 시도해 주세요.");
    } finally {
      setBusy(false);
    }
  }

  function removeAt(index: number) {
    onChange(values.filter((_, i) => i !== index));
  }

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {values.map((url, i) => (
          <div
            key={`${url}-${i}`}
            className="group relative aspect-square overflow-hidden rounded-md border border-zinc-200 bg-zinc-50"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={url}
              alt={`매장 사진 ${i + 1}`}
              className="h-full w-full object-cover"
            />
            <button
              type="button"
              onClick={() => removeAt(i)}
              className="absolute right-1 top-1 rounded-full bg-black/60 p-1 text-white opacity-0 transition group-hover:opacity-100"
              aria-label="사진 삭제"
            >
              <Trash2 className="h-3 w-3" />
            </button>
          </div>
        ))}
        {values.length < max ? (
          <label className="flex aspect-square cursor-pointer flex-col items-center justify-center gap-1 rounded-md border-2 border-dashed border-zinc-300 text-xs text-zinc-500 hover:bg-zinc-50">
            <Upload className="h-4 w-4" aria-hidden />
            {busy ? "업로드 중…" : "추가"}
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={handleUpload}
              disabled={busy}
              className="hidden"
            />
          </label>
        ) : null}
      </div>
      <p className="text-xs text-zinc-500">
        {values.length}/{max} · 각 5MB 이하
      </p>
      {error ? <p className="text-xs text-red-600">{error}</p> : null}
    </div>
  );
}
