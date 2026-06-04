"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { savePageInputSchema, type SavePageInput } from "@/domain/schemas";
import type { Page, Photo, Sections } from "@/types/page";
import {
  savePage,
  saveSections,
  publishPage,
  unpublishPage,
  deletePage,
} from "@/app/actions/page-actions";
import { CATEGORY_LABELS } from "@/domain/constants";
import { InputForm } from "./InputForm";
import { PhotoUpload } from "./PhotoUpload";
import { SectionEditor } from "./SectionEditor";

export interface EditorFormValues {
  businessName: string;
  address: string;
  phone: string;
  keyPoints: string[];
}

interface Props {
  initialPage: Page;
  isPartner: boolean;
}

export function EditorShell({ initialPage, isPartner }: Props) {
  const router = useRouter();

  const [photos, setPhotos] = useState<Photo[]>(initialPage.photos);
  const [sections, setSections] = useState<Sections>(initialPage.sections);
  const [slug, setSlug] = useState<string | null>(initialPage.slug);
  const [published, setPublished] = useState(initialPage.published);
  const [status, setStatus] = useState<null | { kind: "ok" | "error"; msg: string }>(
    null
  );
  const [pending, startTransition] = useTransition();

  const form = useForm<EditorFormValues>({
    resolver: zodResolver(
      savePageInputSchema.pick({
        businessName: true,
        address: true,
        phone: true,
        keyPoints: true,
      })
    ),
    defaultValues: {
      businessName: initialPage.businessName,
      address: initialPage.address,
      phone: initialPage.phone,
      keyPoints: initialPage.keyPoints,
    },
  });

  async function handleSaveBasics() {
    const values = form.getValues();
    const valid = await form.trigger();
    if (!valid) {
      setStatus({ kind: "error", msg: "입력값을 확인해주세요" });
      return;
    }
    if (photos.length === 0) {
      setStatus({ kind: "error", msg: "사진을 1장 이상 업로드해주세요" });
      return;
    }

    startTransition(async () => {
      const input: SavePageInput = {
        pageId: initialPage.id,
        category: initialPage.category,
        businessName: values.businessName,
        address: values.address,
        phone: values.phone,
        keyPoints: values.keyPoints,
        photos,
      };
      const result = await savePage(input);
      if (!result.ok) {
        setStatus({ kind: "error", msg: result.message });
        return;
      }
      setStatus({ kind: "ok", msg: "기본 정보 저장됨" });
      router.refresh();
    });
  }

  function handleSaveSections() {
    startTransition(async () => {
      const result = await saveSections(initialPage.id, sections);
      if (!result.ok) {
        setStatus({ kind: "error", msg: result.message });
        return;
      }
      setStatus({ kind: "ok", msg: "섹션 저장됨" });
      router.refresh();
    });
  }

  function handlePublish() {
    startTransition(async () => {
      const result = await publishPage(initialPage.id);
      if (!result.ok) {
        setStatus({ kind: "error", msg: result.message });
        return;
      }
      setSlug(result.data.slug);
      setPublished(true);
      setStatus({
        kind: "ok",
        msg: `발행됨: /p/${result.data.slug}`,
      });
      router.refresh();
    });
  }

  function handleUnpublish() {
    startTransition(async () => {
      const result = await unpublishPage(initialPage.id);
      if (!result.ok) {
        setStatus({ kind: "error", msg: result.message });
        return;
      }
      setPublished(false);
      setStatus({ kind: "ok", msg: "발행 취소됨" });
      router.refresh();
    });
  }

  function handleDelete() {
    if (!confirm("정말 삭제할까요? 되돌릴 수 없습니다.")) return;
    startTransition(async () => {
      const result = await deletePage(initialPage.id);
      if (!result.ok) {
        setStatus({ kind: "error", msg: result.message });
        return;
      }
      router.push("/dashboard");
    });
  }

  function handleGenerate() {
    startTransition(async () => {
      setStatus({ kind: "ok", msg: "AI가 섹션을 생성 중... (10~20초)" });
      try {
        const res = await fetch("/api/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ pageId: initialPage.id }),
        });
        const data: { sections?: Sections; error?: { message: string } } =
          await res.json();
        if (!res.ok || !data.sections) {
          setStatus({
            kind: "error",
            msg: data.error?.message ?? `생성 실패 (${res.status})`,
          });
          return;
        }
        setSections(data.sections);
        setStatus({ kind: "ok", msg: "AI 섹션 생성 완료" });
        router.refresh();
      } catch (e) {
        setStatus({
          kind: "error",
          msg: e instanceof Error ? e.message : "네트워크 오류",
        });
      }
    });
  }

  return (
    <div className="mx-auto max-w-6xl p-6">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-200 pb-4 dark:border-zinc-800">
        <div>
          <Link
            href="/dashboard"
            className="text-xs text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
          >
            ← 내 페이지
          </Link>
          <h1 className="mt-0.5 text-xl font-bold tracking-tight">
            {(CATEGORY_LABELS as Record<string, string>)[initialPage.category] || initialPage.category} · {published ? "발행됨" : "초안"}
          </h1>
          {published && slug && (
            <Link
              href={`/p/${slug}`}
              target="_blank"
              className="text-xs text-emerald-600 hover:underline dark:text-emerald-400"
            >
              /p/{slug} ↗
            </Link>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={handleGenerate}
            disabled={pending}
            className="rounded bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            🤖 AI 생성
          </button>
          {published ? (
            <button
              type="button"
              onClick={handleUnpublish}
              disabled={pending}
              className="rounded border border-zinc-300 px-3 py-1.5 text-sm dark:border-zinc-700"
            >
              발행 취소
            </button>
          ) : (
            <button
              type="button"
              onClick={handlePublish}
              disabled={pending}
              className="rounded bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
            >
              발행
            </button>
          )}
          <button
            type="button"
            onClick={handleDelete}
            disabled={pending}
            className="rounded border border-red-300 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 dark:border-red-900 dark:hover:bg-red-950"
          >
            삭제
          </button>
        </div>
      </div>

      {status && (
        <p
          className={`mt-4 rounded px-3 py-2 text-sm ${
            status.kind === "ok"
              ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
              : "bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300"
          }`}
        >
          {status.msg}
        </p>
      )}

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <section className="flex flex-col gap-6">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold">기본 정보</h2>
            <button
              type="button"
              onClick={handleSaveBasics}
              disabled={pending}
              className="rounded bg-zinc-900 px-3 py-1.5 text-sm text-white hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
            >
              {pending ? "저장 중..." : "기본 정보 저장"}
            </button>
          </div>
          <InputForm
            register={form.register}
            control={form.control}
            errors={form.formState.errors}
            category={initialPage.category}
          />
          <hr className="border-zinc-200 dark:border-zinc-800" />
          <PhotoUpload
            pageId={initialPage.id}
            photos={photos}
            onChange={setPhotos}
          />
        </section>

        <section className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold">콘텐츠 섹션</h2>
            <button
              type="button"
              onClick={handleSaveSections}
              disabled={pending}
              className="rounded bg-zinc-900 px-3 py-1.5 text-sm text-white hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
            >
              섹션 저장
            </button>
          </div>
          <SectionEditor
            sections={sections}
            isPartner={isPartner}
            onChange={setSections}
            disabled={pending}
          />
        </section>
      </div>
    </div>
  );
}
