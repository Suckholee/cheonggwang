"use client";

import { useRouter } from "next/navigation";
import { useState, useRef, useCallback } from "react";
import Image from "next/image";
import { X, ImagePlus } from "lucide-react";
import { StoryGeneratingState } from "./StoryGeneratingState";

const MAX_PHOTOS = 5;
const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED_MIME = /^image\/(jpeg|png|webp)$/;

interface UploadResponse {
  itemId?: string;
  storyId?: string;
  status?: string;
  message?: string;
  error?: { code: string; message: string };
}

export function StoryUploadForm() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [caption, setCaption] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const onPick = useCallback(() => fileInputRef.current?.click(), []);

  const onFilesChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setErrorMsg(null);
      const selected = Array.from(e.target.files ?? []);
      if (selected.length === 0) return;
      const combined = [...files, ...selected].slice(0, MAX_PHOTOS);
      for (const f of selected) {
        if (!ALLOWED_MIME.test(f.type)) {
          setErrorMsg("JPG · PNG · WebP 형식만 지원해요");
          return;
        }
        if (f.size > MAX_BYTES) {
          setErrorMsg("사진은 5MB 이하로 올려주세요");
          return;
        }
      }
      setFiles(combined);
      // 새로 추가된 파일만 preview 생성
      const newPreviews = combined
        .slice(previews.length)
        .map((f) => URL.createObjectURL(f));
      setPreviews((prev) => [...prev, ...newPreviews].slice(0, MAX_PHOTOS));
      // reset input so the same file can be re-picked after removal
      if (fileInputRef.current) fileInputRef.current.value = "";
    },
    [files, previews.length],
  );

  const removeAt = useCallback((idx: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== idx));
    setPreviews((prev) => {
      const next = prev.filter((_, i) => i !== idx);
      if (prev[idx]) URL.revokeObjectURL(prev[idx]);
      return next;
    });
  }, []);

  const onSubmit = useCallback(
    async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      if (files.length === 0) {
        setErrorMsg("사진을 1장 이상 올려주세요");
        return;
      }
      setErrorMsg(null);
      setSubmitting(true);
      try {
        const form = new FormData();
        for (const f of files) form.append("photos", f);
        if (caption.trim()) form.append("memo", caption.trim());
        const res = await fetch("/api/stories/scrapbook", {
          method: "POST",
          body: form,
        });
        const json = (await res.json()) as UploadResponse;
        if (!res.ok || !json.itemId) {
          setSubmitting(false);
          setErrorMsg(json.error?.message ?? "업로드에 실패했어요");
          return;
        }
        // Success — 스크랩북 리스트로 이동 (배치 처리 대기 상태)
        router.push("/stories?uploaded=1");
      } catch (err) {
        setSubmitting(false);
        const msg = err instanceof Error ? err.message : "네트워크 오류가 발생했어요";
        setErrorMsg(msg);
      }
    },
    [files, caption, router],
  );

  if (submitting) {
    return <StoryGeneratingState />;
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-2">
        {previews.map((src, idx) => (
          <div
            key={src}
            className="relative h-20 w-20 overflow-hidden rounded-lg border border-zinc-200 dark:border-zinc-800"
          >
            <Image
              src={src}
              alt={`사진 ${idx + 1}`}
              fill
              sizes="80px"
              unoptimized
              className="object-cover"
            />
            <button
              type="button"
              onClick={() => removeAt(idx)}
              aria-label={`사진 ${idx + 1} 제거`}
              className="absolute right-0.5 top-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80"
            >
              <X className="h-3 w-3" aria-hidden />
            </button>
          </div>
        ))}
        {files.length < MAX_PHOTOS && (
          <button
            type="button"
            onClick={onPick}
            className="flex h-20 w-20 flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-zinc-300 text-xs text-zinc-500 hover:border-indigo-400 hover:text-indigo-600 dark:border-zinc-700"
          >
            <ImagePlus className="h-5 w-5" aria-hidden />
            <span>사진 추가</span>
          </button>
        )}
      </div>
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/jpeg,image/png,image/webp"
        onChange={onFilesChange}
        className="sr-only"
      />

      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium text-zinc-800 dark:text-zinc-200">
          한 줄 메모 (선택)
        </span>
        <textarea
          value={caption}
          onChange={(e) => setCaption(e.target.value.slice(0, 200))}
          rows={3}
          placeholder="예) 오랜만에 청소하고 찍은 거실이에요"
          className="resize-none rounded-lg border border-zinc-200 bg-white p-3 text-sm outline-none focus:border-indigo-400 dark:border-zinc-800 dark:bg-zinc-900"
        />
        <span className="self-end text-xs text-zinc-400">{caption.length}/200</span>
      </label>

      {errorMsg && (
        <p
          role="alert"
          className="rounded-md bg-rose-50 p-2 text-xs text-rose-700 dark:bg-rose-950/30 dark:text-rose-300"
        >
          {errorMsg}
        </p>
      )}

      <div className="flex items-center justify-between">
        <p className="text-xs text-zinc-500">
          최대 {MAX_PHOTOS}장 · 5MB 이하 · 하루 3번까지
        </p>
        <button
          type="submit"
          disabled={files.length === 0}
          className="rounded-full bg-indigo-600 px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-zinc-300 dark:disabled:bg-zinc-700"
        >
          AI 블로그 만들기
        </button>
      </div>
    </form>
  );
}
