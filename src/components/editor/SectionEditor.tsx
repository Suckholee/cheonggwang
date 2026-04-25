"use client";

import type { Sections } from "@/types/page";
import { SECTION_MAX_LENGTHS } from "@/domain/constants";

interface Props {
  sections: Sections;
  isPartner: boolean;
  onChange: (sections: Sections) => void;
  disabled?: boolean;
}

export function SectionEditor({ sections, isPartner, onChange, disabled }: Props) {
  const isEmpty =
    !sections.hero.title &&
    !sections.hero.subtitle &&
    !sections.intro.body &&
    sections.highlights.items.length === 0;

  function update<K extends keyof Sections>(key: K, value: Sections[K]) {
    onChange({ ...sections, [key]: value });
  }

  return (
    <div className="flex flex-col gap-5">
      {isEmpty && (
        <div className="rounded bg-amber-50 px-4 py-3 text-xs text-amber-800 dark:bg-amber-950 dark:text-amber-200">
          아직 AI 생성 전이에요. <b>[AI 생성]</b> 버튼(스텝 7에서 활성화)을
          눌러 문구를 받아보거나 직접 입력해도 됩니다.
        </div>
      )}

      <SectionBlock title="히어로 (대표 문구)">
        <TextInput
          label="제목"
          value={sections.hero.title}
          maxLength={SECTION_MAX_LENGTHS.heroTitle}
          disabled={disabled}
          onChange={(v) => update("hero", { ...sections.hero, title: v })}
        />
        <TextInput
          label="서브 제목"
          value={sections.hero.subtitle}
          maxLength={SECTION_MAX_LENGTHS.heroSubtitle}
          disabled={disabled}
          onChange={(v) => update("hero", { ...sections.hero, subtitle: v })}
        />
      </SectionBlock>

      <SectionBlock title="소개">
        <TextArea
          value={sections.intro.body}
          maxLength={SECTION_MAX_LENGTHS.introBody}
          disabled={disabled}
          rows={4}
          onChange={(v) => update("intro", { body: v })}
        />
      </SectionBlock>

      <SectionBlock title="특징 (Highlights)">
        <HighlightsEditor
          items={sections.highlights.items}
          disabled={disabled}
          onChange={(items) => update("highlights", { items })}
        />
      </SectionBlock>

      {isPartner && (
        <SectionBlock
          title="위생 안심"
          hint="청광 파트너 전용 섹션 — 청결 관련 어휘는 여기에만 노출"
        >
          <TextArea
            value={sections.hygiene?.body ?? ""}
            maxLength={SECTION_MAX_LENGTHS.hygieneBody}
            disabled={disabled}
            rows={3}
            onChange={(v) =>
              update("hygiene", v ? { body: v } : null)
            }
          />
        </SectionBlock>
      )}

      <SectionBlock title="CTA (행동 유도)">
        <TextInput
          label="버튼 문구"
          value={sections.cta.label}
          maxLength={SECTION_MAX_LENGTHS.ctaLabel}
          disabled={disabled}
          onChange={(v) => update("cta", { ...sections.cta, label: v })}
        />
        <TextInput
          label="링크 (URL 또는 tel:...)"
          value={sections.cta.link}
          disabled={disabled}
          onChange={(v) => update("cta", { ...sections.cta, link: v })}
        />
      </SectionBlock>
    </div>
  );
}

function SectionBlock({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
      <h3 className="text-sm font-semibold">{title}</h3>
      {hint && <p className="mt-1 text-xs text-zinc-500">{hint}</p>}
      <div className="mt-3 flex flex-col gap-3">{children}</div>
    </div>
  );
}

function TextInput({
  label,
  value,
  maxLength,
  disabled,
  onChange,
}: {
  label: string;
  value: string;
  maxLength?: number;
  disabled?: boolean;
  onChange: (v: string) => void;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-xs text-zinc-500">{label}</span>
      <input
        type="text"
        value={value}
        maxLength={maxLength}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        className="rounded border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-zinc-500 disabled:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-900 dark:disabled:bg-zinc-800"
      />
      {maxLength && (
        <span className="text-right text-[10px] text-zinc-400">
          {value.length} / {maxLength}
        </span>
      )}
    </label>
  );
}

function TextArea({
  value,
  maxLength,
  rows = 3,
  disabled,
  onChange,
}: {
  value: string;
  maxLength?: number;
  rows?: number;
  disabled?: boolean;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex flex-col gap-1">
      <textarea
        value={value}
        maxLength={maxLength}
        rows={rows}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-zinc-500 disabled:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-900 dark:disabled:bg-zinc-800"
      />
      {maxLength && (
        <span className="text-right text-[10px] text-zinc-400">
          {value.length} / {maxLength}
        </span>
      )}
    </div>
  );
}

function HighlightsEditor({
  items,
  disabled,
  onChange,
}: {
  items: string[];
  disabled?: boolean;
  onChange: (items: string[]) => void;
}) {
  const MAX = 5;
  function setAt(idx: number, value: string) {
    const next = [...items];
    next[idx] = value;
    onChange(next);
  }
  return (
    <div className="flex flex-col gap-2">
      {items.map((item, idx) => (
        <div key={idx} className="flex items-start gap-2">
          <TextInput
            label={`${idx + 1}.`}
            value={item}
            maxLength={SECTION_MAX_LENGTHS.highlightItem}
            disabled={disabled}
            onChange={(v) => setAt(idx, v)}
          />
          <button
            type="button"
            onClick={() => onChange(items.filter((_, i) => i !== idx))}
            disabled={disabled}
            className="mt-5 rounded border border-zinc-300 px-2 py-1 text-xs dark:border-zinc-700"
          >
            삭제
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={() => onChange([...items, ""])}
        disabled={disabled || items.length >= MAX}
        className="self-start rounded border border-zinc-300 px-3 py-1.5 text-xs disabled:opacity-50 dark:border-zinc-700"
      >
        항목 추가
      </button>
    </div>
  );
}
