"use client";

import { useEffect, useState, useTransition } from "react";
import { listTemplatesForPartner } from "@/app/actions/partner-templates-actions";
import { POST_FORMAT_EMOJI, POST_FORMAT_LABELS } from "@/domain/post-format";
import type { PostFormat } from "@/domain/post-format";
import type { PartnerIndustry } from "@/domain/partner-industry";
import type { ContentTemplate } from "@/types/content-template";
import PartnerPromoDraftForm from "./PartnerPromoDraftForm";

/**
 * v1.12 cycle #25 partner-content-formats · §5.6.
 *
 * 3-step Wizard: 형식 선택 → 템플릿 추천 → 키워드/사진 입력.
 * Step 2는 "건너뛰기"로 templateId 없이 진행 가능 (기존 흐름 100% 보존).
 *
 * State persistence (M3 결의): client memory만, 페이지 reload 시 Step1부터.
 */

interface Props {
  industry: PartnerIndustry | null;
  inAutoPublishWindow: boolean;
}

type Step = 1 | 2 | 3;

export default function PartnerPostsNewWizard({
  industry,
  inAutoPublishWindow,
}: Props) {
  const [step, setStep] = useState<Step>(1);
  const [format, setFormat] = useState<PostFormat | null>(null);
  const [selectedTpl, setSelectedTpl] = useState<ContentTemplate | null>(null);

  function backTo(s: Step) {
    setStep(s);
  }

  return (
    <div className="space-y-4">
      <StepIndicator step={step} />

      {step === 1 ? (
        <PostFormatPicker
          onPick={(f) => {
            setFormat(f);
            setStep(2);
          }}
        />
      ) : null}

      {step === 2 && format ? (
        <TemplateRecommendCards
          industry={industry}
          format={format}
          onPick={(tpl) => {
            setSelectedTpl(tpl);
            setStep(3);
          }}
          onSkip={() => {
            setSelectedTpl(null);
            setStep(3);
          }}
          onBack={() => backTo(1)}
        />
      ) : null}

      {step === 3 && format ? (
        <PartnerPromoDraftForm
          inAutoPublishWindow={inAutoPublishWindow}
          format={format}
          templateId={selectedTpl?.id ?? null}
          templateLabel={selectedTpl?.title ?? null}
          onBack={() => backTo(2)}
        />
      ) : null}
    </div>
  );
}

function StepIndicator({ step }: { step: Step }) {
  const items = [
    { n: 1, label: "형식 선택" },
    { n: 2, label: "템플릿" },
    { n: 3, label: "키워드·사진" },
  ];
  return (
    <ol className="flex items-center gap-2 text-xs">
      {items.map((it, i) => (
        <li key={it.n} className="flex items-center gap-2">
          <span
            className={`flex h-6 w-6 items-center justify-center rounded-full font-bold ${
              step === it.n
                ? "bg-blue-600 text-white"
                : step > it.n
                  ? "bg-emerald-500 text-white"
                  : "bg-zinc-200 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400"
            }`}
          >
            {step > it.n ? "✓" : it.n}
          </span>
          <span
            className={
              step === it.n
                ? "font-semibold text-zinc-900 dark:text-zinc-100"
                : "text-zinc-500"
            }
          >
            {it.label}
          </span>
          {i < items.length - 1 ? (
            <span className="text-zinc-300 dark:text-zinc-700">›</span>
          ) : null}
        </li>
      ))}
    </ol>
  );
}

// ─── Step 1 ────────────────────────────────────────────

function PostFormatPicker({
  onPick,
}: {
  onPick: (f: PostFormat) => void;
}) {
  const formats: PostFormat[] = ["blog", "card-news"];
  return (
    <section className="space-y-3">
      <h2 className="text-base font-semibold">어떤 형식으로 만들까요?</h2>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {formats.map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => onPick(f)}
            className="group flex flex-col items-start gap-2 rounded-2xl border-2 border-zinc-200 bg-white p-5 text-left transition-colors hover:border-blue-500 hover:bg-blue-50 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-blue-400 dark:hover:bg-blue-950"
          >
            <span className="text-3xl">{POST_FORMAT_EMOJI[f]}</span>
            <span className="text-base font-bold">
              {POST_FORMAT_LABELS[f]}
            </span>
            <span className="text-xs text-zinc-500">
              {f === "blog"
                ? "긴 호흡의 SEO 친화 블로그 본문 (800~1200자)"
                : "스와이프 슬라이드 6~10장 (각 80~150자, SNS 친화)"}
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}

// ─── Step 2 ────────────────────────────────────────────

function TemplateRecommendCards({
  industry,
  format,
  onPick,
  onSkip,
  onBack,
}: {
  industry: PartnerIndustry | null;
  format: PostFormat;
  onPick: (tpl: ContentTemplate) => void;
  onSkip: () => void;
  onBack: () => void;
}) {
  const [list, setList] = useState<ContentTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [, startTransition] = useTransition();

  useEffect(() => {
    setLoading(true);
    startTransition(() => {
      listTemplatesForPartner({
        industry: industry ?? "other",
        type: format,
      })
        .then((res) => {
          setList(res);
        })
        .catch((e) => {
          console.warn("[Wizard] template fetch failed", e);
          setList([]);
        })
        .finally(() => {
          setLoading(false);
        });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [industry, format]);

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold">
          {POST_FORMAT_EMOJI[format]} {POST_FORMAT_LABELS[format]} 템플릿 추천
        </h2>
        <button
          type="button"
          onClick={onBack}
          className="text-xs text-blue-600 underline dark:text-blue-400"
        >
          ← 형식 다시 고르기
        </button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="h-32 animate-pulse rounded-xl bg-zinc-100 dark:bg-zinc-800"
            />
          ))}
        </div>
      ) : list.length === 0 ? (
        <div className="rounded-xl border border-dashed border-zinc-300 bg-white p-6 text-center text-sm text-zinc-500 dark:border-zinc-700 dark:bg-zinc-900">
          <p className="mb-2">선택 가능한 템플릿이 없어요.</p>
          <p className="text-xs">키워드를 직접 입력해서 만들어보세요.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {list.map((tpl) => (
            <button
              key={tpl.id}
              type="button"
              onClick={() => onPick(tpl)}
              className="group flex flex-col items-start gap-2 rounded-xl border border-zinc-200 bg-white p-4 text-left transition-colors hover:border-blue-500 hover:bg-blue-50 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-blue-400 dark:hover:bg-blue-950"
            >
              <h3 className="text-sm font-bold">{tpl.title}</h3>
              {tpl.scenarios.length > 0 ? (
                <p className="text-xs text-zinc-600 dark:text-zinc-400">
                  {tpl.scenarios.slice(0, 2).join(" / ")}
                </p>
              ) : null}
              <p className="line-clamp-2 text-xs text-zinc-500">
                {tpl.body.slice(0, 80)}…
              </p>
              {tpl.tags.length > 0 ? (
                <div className="mt-1 flex flex-wrap gap-1">
                  {tpl.tags.slice(0, 3).map((t) => (
                    <span
                      key={t}
                      className="rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300"
                    >
                      #{t}
                    </span>
                  ))}
                </div>
              ) : null}
            </button>
          ))}
        </div>
      )}

      <div className="flex justify-end pt-2">
        <button
          type="button"
          onClick={onSkip}
          className="rounded-md border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
        >
          건너뛰기 (직접 입력) →
        </button>
      </div>
    </section>
  );
}

