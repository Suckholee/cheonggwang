"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, X } from "lucide-react";
import {
  PARTNER_INDUSTRIES,
  PARTNER_INDUSTRY_LABELS,
  type PartnerIndustry,
} from "@/domain/partner-industry";
import {
  CONTENT_TEMPLATE_TYPES,
  CONTENT_TEMPLATE_TYPE_LABELS,
  type ContentTemplate,
  type ContentTemplateType,
} from "@/types/content-template";
import {
  saveContentTemplate,
  deleteContentTemplate,
} from "@/app/actions/content-template-actions";

/**
 * v1.11 partner-rag-system · §6.3 — admin 컨텐츠 템플릿 신규/편집 모달.
 */

interface Props {
  initial?: ContentTemplate;
  onClose: () => void;
}

export function ContentTemplateEditor({ initial, onClose }: Props) {
  const router = useRouter();
  const [type, setType] = useState<ContentTemplateType>(initial?.type ?? "blog");
  const [industry, setIndustry] = useState<PartnerIndustry>(
    initial?.industry ?? "cafe",
  );
  const [title, setTitle] = useState(initial?.title ?? "");
  const [body, setBody] = useState(initial?.body ?? "");
  const [tags, setTags] = useState<string[]>(initial?.tags ?? []);
  const [tagDraft, setTagDraft] = useState("");
  const [scenarios, setScenarios] = useState<string[]>(initial?.scenarios ?? []);
  const [scenarioDraft, setScenarioDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function addTag() {
    const v = tagDraft.trim();
    if (!v || tags.length >= 10) return;
    setTags([...tags, v.slice(0, 30)]);
    setTagDraft("");
  }
  function addScenario() {
    const v = scenarioDraft.trim();
    if (!v || scenarios.length >= 10) return;
    setScenarios([...scenarios, v.slice(0, 100)]);
    setScenarioDraft("");
  }

  async function submit() {
    setError(null);
    setBusy(true);
    try {
      const res = await saveContentTemplate({
        id: initial?.id,
        type,
        industry,
        title: title.trim(),
        body: body.trim(),
        tags,
        scenarios,
      });
      if (!res.ok) {
        setError(res.message ?? "저장 실패");
        return;
      }
      router.refresh();
      onClose();
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!initial?.id) return;
    if (!confirm(`"${initial.title}" 템플릿을 삭제할까요?`)) return;
    setBusy(true);
    setError(null);
    try {
      const res = await deleteContentTemplate(initial.id);
      if (!res.ok) {
        setError(res.message ?? "삭제 실패");
        return;
      }
      router.refresh();
      onClose();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        className="w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-lg bg-white p-5 shadow-xl dark:bg-zinc-900"
      >
        <header className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-semibold">
            {initial ? "템플릿 편집" : "새 템플릿"}
          </h2>
          <button
            onClick={onClose}
            disabled={busy}
            className="rounded p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700"
            aria-label="닫기"
          >
            <X className="h-4 w-4" aria-hidden />
          </button>
        </header>

        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <label className="block text-sm">
              <span className="block text-xs text-zinc-500">타입 *</span>
              <select
                value={type}
                onChange={(e) =>
                  setType(e.target.value as ContentTemplateType)
                }
                className="mt-1 w-full rounded-md border border-zinc-300 px-2 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-800"
              >
                {CONTENT_TEMPLATE_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {CONTENT_TEMPLATE_TYPE_LABELS[t]}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm">
              <span className="block text-xs text-zinc-500">업종 *</span>
              <select
                value={industry}
                onChange={(e) => setIndustry(e.target.value as PartnerIndustry)}
                className="mt-1 w-full rounded-md border border-zinc-300 px-2 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-800"
              >
                {PARTNER_INDUSTRIES.map((i) => (
                  <option key={i} value={i}>
                    {PARTNER_INDUSTRY_LABELS[i]}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <label className="block text-sm">
            <span className="block text-xs text-zinc-500">제목 * (≤100자)</span>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value.slice(0, 100))}
              className="mt-1 w-full rounded-md border border-zinc-300 px-2 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-800"
            />
          </label>

          <label className="block text-sm">
            <span className="block text-xs text-zinc-500">
              본문 * (50-10000자, RAG context로 사용)
            </span>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value.slice(0, 10000))}
              rows={10}
              className="mt-1 w-full rounded-md border border-zinc-300 p-2 text-sm dark:border-zinc-700 dark:bg-zinc-800"
            />
            <p className="mt-1 text-right text-[11px] text-zinc-500">
              {body.length} / 10000
            </p>
          </label>

          <ChipInput
            label="태그 (최대 10개)"
            placeholder="opening · seasonal · review-event"
            value={tagDraft}
            onChange={setTagDraft}
            onAdd={addTag}
            chips={tags}
            onRemove={(i) => setTags(tags.filter((_, j) => j !== i))}
          />

          <ChipInput
            label="시나리오 (최대 10개)"
            placeholder="신규 오픈 안내 · 시즌 한정 메뉴"
            value={scenarioDraft}
            onChange={setScenarioDraft}
            onAdd={addScenario}
            chips={scenarios}
            onRemove={(i) => setScenarios(scenarios.filter((_, j) => j !== i))}
          />

          {error ? (
            <p className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-xs text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-200">
              {error}
            </p>
          ) : null}
        </div>

        <footer className="mt-4 flex items-center justify-between">
          {initial ? (
            <button
              onClick={remove}
              disabled={busy}
              className="rounded-md border border-red-300 px-3 py-1.5 text-sm text-red-700 hover:bg-red-50 disabled:opacity-50 dark:border-red-800 dark:text-red-300"
            >
              삭제
            </button>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <button
              onClick={onClose}
              disabled={busy}
              className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-700"
            >
              취소
            </button>
            <button
              onClick={submit}
              disabled={busy || !title.trim() || body.trim().length < 50}
              className="rounded-md bg-blue-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {busy ? "저장 중…" : "저장"}
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}

function ChipInput({
  label,
  placeholder,
  value,
  onChange,
  onAdd,
  chips,
  onRemove,
}: {
  label: string;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
  onAdd: () => void;
  chips: string[];
  onRemove: (i: number) => void;
}) {
  return (
    <div>
      <p className="block text-xs text-zinc-500">{label}</p>
      <div className="mt-1 flex gap-2">
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="flex-1 rounded-md border border-zinc-300 px-2 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-800"
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              onAdd();
            }
          }}
        />
        <button
          type="button"
          onClick={onAdd}
          className="rounded-md border border-zinc-300 px-3 text-sm hover:bg-zinc-50 dark:border-zinc-700"
        >
          <Plus className="h-3 w-3" />
        </button>
      </div>
      {chips.length > 0 ? (
        <ul className="mt-1 flex flex-wrap gap-1">
          {chips.map((c, i) => (
            <li
              key={`${c}-${i}`}
              className="inline-flex items-center gap-1 rounded-full bg-zinc-100 px-2 py-0.5 text-xs dark:bg-zinc-800"
            >
              {c}
              <button
                type="button"
                onClick={() => onRemove(i)}
                aria-label="삭제"
              >
                <X className="h-3 w-3 text-zinc-400 hover:text-zinc-700" />
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
