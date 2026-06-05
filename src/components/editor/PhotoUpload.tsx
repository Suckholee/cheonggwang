"use client";

import { useState, useRef } from "react";
import Image from "next/image";
import { ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import { clientAuth, clientStorage } from "@/lib/firebase/client";
import { customAlphabet } from "nanoid";
import { MAX_PHOTOS, MAX_PHOTO_SIZE_BYTES } from "@/domain/constants";
import type { Photo } from "@/types/page";

const nanoFile = customAlphabet("0123456789abcdefghijklmnopqrstuvwxyz", 10);
const ACCEPTED = ["image/jpeg", "image/png", "image/webp"];

interface Props {
  pageId: string;
  photos: Photo[];
  onChange: (photos: Photo[]) => void;
  /** Storage path root (default `photos`). quote-request는 `quote-photos` 사용. */
  pathPrefix?: string;
  /** v1.1b #3 provider-profile-editor — 단일 이미지 필드용 override. 기본 MAX_PHOTOS (3) */
  maxPhotos?: number;
}

export function PhotoUpload({
  pageId,
  photos,
  onChange,
  pathPrefix = "photos",
  maxPhotos = MAX_PHOTOS,
}: Props) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setError(null);

    const user = clientAuth.currentUser;
    if (!user) {
      setError("세션이 만료되었습니다. 다시 로그인 해주세요.");
      return;
    }

    const available = maxPhotos - photos.length;
    const toUpload = Array.from(files).slice(0, available);
    if (toUpload.length === 0) return;

    for (const file of toUpload) {
      if (!ACCEPTED.includes(file.type)) {
        setError(`${file.name}: 지원되지 않는 형식 (JPEG/PNG/WebP만)`);
        return;
      }
      if (file.size >= MAX_PHOTO_SIZE_BYTES) {
        setError(`${file.name}: 5MB 초과`);
        return;
      }
    }

    setUploading(true);
    try {
      const uploaded: Photo[] = [];
      for (let i = 0; i < toUpload.length; i++) {
        const file = toUpload[i];
        const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
        const path = `${pathPrefix}/${user.uid}/${pageId}/${Date.now()}-${nanoFile()}.${ext}`;
        const storageRef = ref(clientStorage, path);
        await uploadBytes(storageRef, file, { contentType: file.type });
        const url = await getDownloadURL(storageRef);
        uploaded.push({
          url,
          path,
          order: photos.length + i,
        });
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
    if (!photo.path || photo.path === "placeholder") {
      onChange(
        photos.filter((p) => p !== photo).map((p, i) => ({ ...p, order: i }))
      );
      return;
    }
    try {
      await deleteObject(ref(clientStorage, photo.path));
    } catch {
      // 이미 없는 오브젝트면 무시하고 목록만 정리
    }
    onChange(
      photos.filter((p) => p.path !== photo.path).map((p, i) => ({ ...p, order: i }))
    );
  }

  const canAdd = photos.length < maxPhotos;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <label className="text-[13px] font-extrabold text-zinc-700 dark:text-zinc-300">
          업로드된 사진 <span className="text-xs font-medium text-zinc-450">({photos.length} / {maxPhotos})</span>
        </label>
        <button
          type="button"
          disabled={!canAdd || uploading}
          onClick={() => inputRef.current?.click()}
          className="shrink-0 flex items-center justify-center gap-1 rounded-xl bg-white text-zinc-700 font-extrabold border border-zinc-200 border-b-[3px] border-b-zinc-300 px-3.5 py-1.5 text-xs shadow-xs hover:border-[#2563EB]/40 hover:scale-[1.02] active:scale-[0.96] active:translate-y-[1px] disabled:opacity-50 transition-all dark:bg-zinc-900 dark:text-zinc-300 dark:border-zinc-800 dark:border-b-zinc-950"
        >
          {uploading ? "업로드 중..." : "사진 추가"}
        </button>
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED.join(",")}
          multiple
          hidden
          onChange={(e) => handleFiles(e.target.files)}
        />
      </div>
      {error && (
        <p className="rounded-xl bg-red-50 border border-red-100 px-3 py-2 text-xs font-semibold text-red-700 dark:bg-red-950/20 dark:border-red-900/50 dark:text-red-300">
          ⚠️ {error}
        </p>
      )}
      {photos.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-zinc-200 bg-zinc-50/50 p-8 text-center text-xs font-bold text-zinc-400 dark:border-zinc-800 dark:bg-zinc-900/30">
          📸 아직 업로드된 사진이 없어요
        </div>
      ) : (
        <ul className="grid grid-cols-3 gap-2">
          {photos.map((photo) => {
            const isPlaceholder = photo.path === "placeholder";
            return (
              <li
                key={photo.path + photo.order}
                className="relative aspect-square overflow-hidden rounded-xl border border-zinc-200/60 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900"
              >
                {isPlaceholder ? (
                  <div className="flex h-full items-center justify-center text-[10px] text-zinc-400">
                    placeholder
                  </div>
                ) : (
                  <Image
                    src={photo.url}
                    alt={`사진 ${photo.order + 1}`}
                    fill
                    sizes="(max-width: 640px) 33vw, 200px"
                    className="object-cover"
                  />
                )}
                <button
                  type="button"
                  onClick={() => handleRemove(photo)}
                  className="absolute right-1.5 top-1.5 rounded-lg bg-black/60 hover:bg-black px-2 py-1 text-[10px] font-bold text-white backdrop-blur-xs transition-colors"
                >
                  삭제
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
