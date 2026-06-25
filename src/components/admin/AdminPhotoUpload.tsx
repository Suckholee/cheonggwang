"use client";

import { useState, useRef } from "react";
import Image from "next/image";
import { uploadAdminPhoto, deleteAdminPhoto } from "@/app/actions/admin-quote-actions";
import type { Photo } from "@/types/page";

interface Props {
  requestId: string;
  photos: Photo[];
  onChange: (photos: Photo[]) => void;
  maxPhotos?: number;
  label: string;
}

export function AdminPhotoUpload({
  requestId,
  photos,
  onChange,
  maxPhotos = 3,
  label,
}: Props) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setError(null);

    const available = maxPhotos - photos.length;
    const toUpload = Array.from(files).slice(0, available);
    if (toUpload.length === 0) return;

    // Validate size and mime types
    const ACCEPTED = ["image/jpeg", "image/png", "image/webp"];
    const MAX_SIZE = 5 * 1024 * 1024;
    for (const file of toUpload) {
      if (!ACCEPTED.includes(file.type)) {
        setError(`${file.name}: 지원되지 않는 형식 (JPEG/PNG/WebP만 가능)`);
        return;
      }
      if (file.size >= MAX_SIZE) {
        setError(`${file.name}: 5MB를 초과하는 파일입니다.`);
        return;
      }
    }

    setUploading(true);
    try {
      const uploaded: Photo[] = [];
      for (let i = 0; i < toUpload.length; i++) {
        const file = toUpload[i];
        const formData = new FormData();
        formData.append("file", file);

        const res = await uploadAdminPhoto(requestId, formData);
        if (!res.ok) {
          throw new Error(res.message ?? "업로드 중 오류가 발생했습니다.");
        }
        if (res.data) {
          uploaded.push({
            ...res.data.photo,
            order: photos.length + i,
          });
        }
      }
      onChange([...photos, ...uploaded]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "업로드 실패");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  async function handleRemove(photo: Photo) {
    try {
      if (photo.path) {
        await deleteAdminPhoto(photo.path);
      }
    } catch (e) {
      console.warn("Storage deletion failed:", e);
    }
    const filtered = photos
      .filter((p) => p.path !== photo.path)
      .map((p, i) => ({ ...p, order: i }));
    onChange(filtered);
  }

  const canAdd = photos.length < maxPhotos;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <label className="text-xs font-black text-zinc-700 dark:text-zinc-350">
          {label} <span className="text-[10px] font-bold text-zinc-400">({photos.length} / {maxPhotos}장)</span>
        </label>
        <button
          type="button"
          disabled={!canAdd || uploading}
          onClick={() => inputRef.current?.click()}
          className="shrink-0 flex items-center justify-center gap-1 rounded-xl bg-white text-zinc-700 font-extrabold border border-zinc-200 border-b-[3px] border-b-zinc-300 px-3.5 py-1.5 text-[11px] shadow-xs hover:border-[#2563EB]/40 hover:scale-[1.02] active:scale-[0.96] active:translate-y-[1px] disabled:opacity-50 transition-all dark:bg-zinc-900 dark:text-zinc-300 dark:border-zinc-800 dark:border-b-zinc-950"
        >
          {uploading ? "업로드 중..." : "사진 추가"}
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          hidden
          onChange={(e) => handleFiles(e.target.files)}
        />
      </div>

      {error && (
        <p className="rounded-xl bg-red-50 border border-red-100 px-3 py-1.5 text-[10px] font-bold text-red-600 dark:bg-red-950/20 dark:border-red-900/50 dark:text-red-400">
          ⚠️ {error}
        </p>
      )}

      {photos.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-zinc-200 bg-zinc-50/50 p-6 text-center text-[10px] font-black text-zinc-400 dark:border-zinc-800 dark:bg-zinc-900/30">
          📸 업로드된 사진이 없습니다.
        </div>
      ) : (
        <ul className="grid grid-cols-3 gap-2">
          {photos.map((photo) => (
            <li
              key={photo.path + photo.order}
              className="relative aspect-square overflow-hidden rounded-xl border border-zinc-200/60 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900"
            >
              <Image
                src={photo.url}
                alt="작업 사진"
                fill
                sizes="(max-width: 640px) 33vw, 200px"
                className="object-cover"
              />
              <button
                type="button"
                onClick={() => handleRemove(photo)}
                className="absolute right-1.5 top-1.5 rounded-lg bg-black/60 hover:bg-black px-2 py-1 text-[9px] font-bold text-white backdrop-blur-xs transition-colors"
              >
                삭제
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
