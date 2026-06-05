"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm, useFieldArray, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Trash2, MapPin, Home, Shield, Sparkles, Check, Calendar, Clock } from "lucide-react";
import {
  proposalFormSchema,
  type ProposalFormInput,
} from "@/domain/quote-proposal-schema";
import {
  QUOTE_CATEGORY_LABELS,
  type QuoteCategory,
} from "@/domain/quote-category";
import { submitQuote } from "@/app/actions/quote-response-actions";
import { buildThreadId } from "@/domain/chat-schemas";
import type { QuoteRequest } from "@/types/quote-request";

interface Props {
  request: QuoteRequest;
  providerId: string;
}

export function QuoteProposalForm({ request, providerId }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [submitError, setSubmitError] = useState<string | null>(null);

  const defaultLabel = `기본 ${QUOTE_CATEGORY_LABELS[request.category]}`;

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    formState: { errors },
  } = useForm<ProposalFormInput>({
    resolver: zodResolver(proposalFormSchema),
    defaultValues: {
      items: [{ label: defaultLabel, price: 0, note: null }],
      scheduledAtDate: "",
      scheduledAtTime: "",
      estimatedWorkHours: null,
      insured: false,
      insuranceAmount: null,
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "items",
  });

  const items = watch("items");
  const totalAmount = items.reduce(
    (sum, i) => sum + (Number(i.price) || 0),
    0,
  );
  const insured = watch("insured");

  // 스마트 견적 계산기용 State
  const [pyeongSize, setPyeongSize] = useState<number>(request.size || 30);
  const [pricePerPyeong, setPricePerPyeong] = useState<number>(10000);
  const [workerCount, setWorkerCount] = useState<number>(0);
  const [useSteam, setUseSteam] = useState<boolean>(false);
  const [usePhytoncide, setUsePhytoncide] = useState<boolean>(false);
  const [isCalcOpen, setIsCalcOpen] = useState<boolean>(true);

  // 실시간 예상 계산 금액
  const cleaningBasePrice = pyeongSize * pricePerPyeong;
  const workerPrice = workerCount * 100000; // 명당 10만원
  const steamPrice = useSteam ? 50000 : 0;
  const phytoncidePrice = usePhytoncide ? 30000 : 0;
  const calcTotal = cleaningBasePrice + workerPrice + steamPrice + phytoncidePrice;

  const applyCalculatedPrice = () => {
    setValue("items.0.price", calcTotal);
  };

  function onSubmit(data: ProposalFormInput) {
    setSubmitError(null);

    // scheduledAt 조합
    let scheduledAt: string | null = null;
    if (data.scheduledAtDate && data.scheduledAtTime) {
      const iso = new Date(
        `${data.scheduledAtDate}T${data.scheduledAtTime}:00`,
      ).toISOString();
      scheduledAt = iso;
    }

    startTransition(async () => {
      const result = await submitQuote({
        requestId: request.id,
        items: data.items.map((i) => ({
          label: i.label,
          price: i.price,
          note: i.note ?? null,
        })),
        scheduledAt,
        estimatedWorkHours: data.estimatedWorkHours,
        insured: data.insured,
        insuranceAmount: data.insured ? data.insuranceAmount ?? null : null,
      });

      if (result.ok) {
        // v1.2 #1 chat — submit 성공 → 생성된 thread로 이동 (의뢰인과 협의 시작)
        const threadId = buildThreadId(request.id, providerId);
        router.replace(`/chat/${threadId}`);
        router.refresh();
      } else {
        setSubmitError(result.message);
      }
    });
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-6">
      {/* Summary bar - Premium Glassmorphism Tag List */}
      <div className="flex flex-wrap gap-2.5 rounded-[22px] border border-[#dbe8fb] bg-[linear-gradient(135deg,rgba(255,255,255,0.85)_0%,rgba(238,246,255,0.75)_100%)] p-4 shadow-[0_8px_30px_rgba(43,102,246,0.03)] backdrop-blur-xs dark:border-zinc-800 dark:bg-zinc-900/40">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-[#2563EB]/10 px-3 py-1 text-[11px] font-bold text-[#2563EB] dark:bg-zinc-800/80 dark:text-zinc-350">
          <Sparkles className="h-3.5 w-3.5" />
          {QUOTE_CATEGORY_LABELS[request.category as QuoteCategory]}
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-zinc-100 px-3 py-1 text-[11px] font-semibold text-zinc-600 dark:bg-zinc-800/80 dark:text-zinc-400">
          <MapPin className="h-3.5 w-3.5 text-zinc-400" />
          {request.region.district}
        </span>
        {request.size && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-zinc-100 px-3 py-1 text-[11px] font-semibold text-zinc-600 dark:bg-zinc-800/80 dark:text-zinc-400">
            <Home className="h-3.5 w-3.5 text-zinc-400" />
            {request.size}평 {request.roomType ? `(${request.roomType})` : ""}
          </span>
        )}
      </div>

      {/* Smart Estimate Calculator Panel */}
      <div className="rounded-[24px] border border-blue-100 bg-blue-50/20 p-5 dark:border-zinc-800 dark:bg-zinc-900/30">
        <button
          type="button"
          onClick={() => setIsCalcOpen(!isCalcOpen)}
          className="flex w-full items-center justify-between font-bold text-zinc-900 dark:text-zinc-50 focus:outline-hidden cursor-pointer"
        >
          <span className="flex items-center gap-1.5 text-sm font-extrabold text-[#2563EB]">
            <Sparkles className="h-4.5 w-4.5" />
            스마트 견적 계산기 ⚡
          </span>
          <span className="text-xs text-zinc-500 hover:text-zinc-700">
            {isCalcOpen ? "접기 ▲" : "펼치기 ▼"}
          </span>
        </button>

        {isCalcOpen && (
          <div className="mt-4 space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
            <p className="text-[11px] leading-4 text-zinc-400 dark:text-zinc-500">
              고객의 요청 조건과 파트너님의 인원/옵션을 입력하시면 견적이 자동 산출됩니다.
            </p>

            <div className="grid grid-cols-2 gap-3.5">
              {/* Pyeong Size */}
              <label className="flex flex-col gap-1.5">
                <span className="text-xs font-semibold text-zinc-650 dark:text-zinc-350">작업 면적 (평수)</span>
                <div className="relative flex items-center">
                  <input
                    type="number"
                    value={pyeongSize}
                    onChange={(e) => setPyeongSize(Number(e.target.value))}
                    className="w-full rounded-xl border border-zinc-200 bg-white pl-3.5 pr-10 py-2 text-xs outline-hidden focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/10 dark:border-zinc-800 dark:bg-zinc-950"
                  />
                  <span className="absolute right-3.5 text-[11px] font-bold text-zinc-400">평</span>
                </div>
              </label>

              {/* Price per Pyeong */}
              <label className="flex flex-col gap-1.5">
                <span className="text-xs font-semibold text-zinc-650 dark:text-zinc-350">평당 기본 단가 (원)</span>
                <div className="relative flex items-center">
                  <input
                    type="number"
                    value={pricePerPyeong}
                    onChange={(e) => setPricePerPyeong(Number(e.target.value))}
                    className="w-full rounded-xl border border-zinc-200 bg-white pl-3.5 pr-10 py-2 text-xs outline-hidden focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/10 dark:border-zinc-800 dark:bg-zinc-950"
                  />
                  <span className="absolute right-3.5 text-[11px] font-bold text-zinc-400">원</span>
                </div>
              </label>
            </div>

            <div className="grid grid-cols-2 gap-3.5">
              {/* Worker count */}
              <label className="flex flex-col gap-1.5">
                <span className="text-xs font-semibold text-zinc-650 dark:text-zinc-350">추가 인원 (명당 10만)</span>
                <div className="relative flex items-center">
                  <input
                    type="number"
                    min={0}
                    value={workerCount}
                    onChange={(e) => setWorkerCount(Number(e.target.value))}
                    className="w-full rounded-xl border border-zinc-200 bg-white pl-3.5 pr-10 py-2 text-xs outline-hidden focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/10 dark:border-zinc-800 dark:bg-zinc-950"
                  />
                  <span className="absolute right-3.5 text-[11px] font-bold text-zinc-400">명</span>
                </div>
              </label>

              {/* Optional services */}
              <div className="flex flex-col gap-1.5">
                <span className="text-xs font-semibold text-zinc-650 dark:text-zinc-350">특수 살균 옵션</span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setUseSteam(!useSteam)}
                    className={`flex-1 rounded-xl py-2 text-xs font-bold transition-all border cursor-pointer ${
                      useSteam
                        ? "bg-[#2563EB] text-white border-[#2563EB] shadow-xs"
                        : "bg-white text-zinc-650 border-zinc-200 dark:bg-zinc-950 dark:border-zinc-800 dark:text-zinc-400"
                    }`}
                  >
                    스팀 (+5만)
                  </button>
                  <button
                    type="button"
                    onClick={() => setUsePhytoncide(!usePhytoncide)}
                    className={`flex-1 rounded-xl py-2 text-xs font-bold transition-all border cursor-pointer ${
                      usePhytoncide
                        ? "bg-[#2563EB] text-white border-[#2563EB] shadow-xs"
                        : "bg-white text-zinc-650 border-zinc-200 dark:bg-zinc-950 dark:border-zinc-800 dark:text-zinc-400"
                    }`}
                  >
                    피톤 (+3만)
                  </button>
                </div>
              </div>
            </div>

            {/* Calculated Result Box */}
            <div className="mt-2.5 flex items-center justify-between rounded-xl bg-blue-500/10 px-4 py-3 dark:bg-zinc-950/40">
              <div className="flex flex-col">
                <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">계산된 예상 금액</span>
                <span className="text-base font-extrabold text-[#2563EB] dark:text-blue-400">
                  {calcTotal.toLocaleString()}원
                </span>
              </div>
              <button
                type="button"
                onClick={applyCalculatedPrice}
                className="rounded-lg bg-blue-600 px-3 py-1.5 text-[11px] font-bold text-white shadow-xs hover:bg-blue-700 active:scale-95 transition-all cursor-pointer"
              >
                금액 적용하기 ✨
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Items */}
      <section className="flex flex-col gap-3.5">
        <label className="text-sm font-bold text-zinc-800 dark:text-zinc-200">항목</label>
        {fields.map((field, index) => (
          <div
            key={field.id}
            className="flex flex-col gap-3 rounded-2xl border border-zinc-200/80 bg-zinc-50/35 p-4 transition-all focus-within:border-[#2563EB] focus-within:ring-2 focus-within:ring-[#2563EB]/10 dark:border-zinc-800 dark:bg-zinc-900/20"
          >
            <div className="flex items-center gap-2">
              <input
                {...register(`items.${index}.label`)}
                placeholder="예: 기본 입주청소, 베란다 스팀 추가 등"
                className="flex-1 rounded-xl border border-zinc-200 bg-white px-3.5 py-2.5 text-sm outline-hidden transition-all focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/10 dark:border-zinc-800 dark:bg-zinc-950"
              />
              {fields.length > 1 && (
                <button
                  type="button"
                  onClick={() => remove(index)}
                  className="rounded-xl p-2.5 text-zinc-400 hover:bg-rose-50 hover:text-rose-600 active:scale-90 transition-all dark:hover:bg-rose-950/30"
                  aria-label="항목 삭제"
                >
                  <Trash2 className="h-4.5 w-4.5" />
                </button>
              )}
            </div>
            
            <div className="relative flex items-center">
              <Controller
                control={control}
                name={`items.${index}.price`}
                render={({ field: f }) => (
                  <input
                    type="number"
                    inputMode="numeric"
                    min={0}
                    value={f.value ?? 0}
                    onChange={(e) =>
                      f.onChange(
                        e.target.value === "" ? 0 : Number(e.target.value),
                      )
                    }
                    placeholder="금액"
                    className="w-full rounded-xl border border-zinc-200 bg-white pl-3.5 pr-8 py-2.5 text-sm outline-hidden transition-all focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/10 dark:border-zinc-800 dark:bg-zinc-950"
                  />
                )}
              />
              <span className="absolute right-3.5 text-xs font-bold text-zinc-400">
                원
              </span>
            </div>

            {errors.items?.[index]?.label?.message && (
              <p className="text-xs text-red-600">
                {errors.items[index]?.label?.message}
              </p>
            )}
            {errors.items?.[index]?.price?.message && (
              <p className="text-xs text-red-600">
                {errors.items[index]?.price?.message}
              </p>
            )}
          </div>
        ))}
        <button
          type="button"
          onClick={() =>
            append({ label: "", price: 0, note: null })
          }
          disabled={fields.length >= 10}
          className="flex items-center justify-center gap-1.5 rounded-xl border-2 border-dashed border-zinc-200/80 bg-zinc-50/20 py-3 text-sm font-semibold text-[#2563EB] hover:bg-zinc-50 hover:border-[#2563EB]/40 disabled:opacity-50 active:scale-[0.99] transition-all cursor-pointer dark:border-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-900/40"
        >
          <Plus className="h-4 w-4" /> 항목 추가
        </button>
      </section>

      {/* 희망 일정 */}
      <Field label="희망 일정 (선택)" icon={<Calendar className="h-4 w-4 text-zinc-400" />}>
        <div className="flex gap-2">
          <input
            {...register("scheduledAtDate")}
            type="date"
            className="flex-1 rounded-xl border border-zinc-200 bg-white px-3.5 py-2.5 text-sm outline-hidden transition-all focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/10 dark:border-zinc-800 dark:bg-zinc-950"
          />
          <input
            {...register("scheduledAtTime")}
            type="time"
            className="w-32 rounded-xl border border-zinc-200 bg-white px-3.5 py-2.5 text-sm outline-hidden transition-all focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/10 dark:border-zinc-800 dark:bg-zinc-950"
          />
        </div>
      </Field>

      {/* 작업 예상 시간 */}
      <Field label="작업 예상 시간 (선택)" icon={<Clock className="h-4 w-4 text-zinc-400" />}>
        <Controller
          control={control}
          name="estimatedWorkHours"
          render={({ field }) => (
            <div className="relative flex items-center">
              <input
                type="number"
                inputMode="numeric"
                min={1}
                max={48}
                value={field.value ?? ""}
                onChange={(e) => {
                  const v = e.target.value;
                  field.onChange(v === "" ? null : Number(v));
                }}
                placeholder="예: 5"
                className="w-full rounded-xl border border-zinc-200 bg-white pl-3.5 pr-12 py-2.5 text-sm outline-hidden transition-all focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/10 dark:border-zinc-800 dark:bg-zinc-950"
              />
              <span className="absolute right-3.5 text-xs font-bold text-zinc-400">
                시간
              </span>
            </div>
          )}
        />
      </Field>

      {/* 배상보험 스위치형 리디자인 */}
      <div className="flex items-center justify-between rounded-2xl border border-zinc-200/80 bg-zinc-50/15 p-4 dark:border-zinc-800">
        <div className="flex flex-col gap-0.5">
          <span className="flex items-center gap-1.5 text-sm font-semibold text-zinc-850 dark:text-zinc-200">
            <Shield className="h-4.5 w-4.5 text-[#2563EB]" />
            배상책임보험 가입 여부
          </span>
          <span className="text-[11px] text-zinc-400">
            배상보험에 가입되어 있음을 고객에게 보증합니다.
          </span>
        </div>
        
        {/* Toggle Switch */}
        <label className="relative inline-flex cursor-pointer items-center">
          <input
            {...register("insured")}
            type="checkbox"
            className="peer sr-only"
          />
          <div className="peer h-6.5 w-11 rounded-full bg-zinc-200 transition-all after:absolute after:top-[3px] after:left-[3px] after:h-5 after:w-5 after:rounded-full after:bg-white after:transition-all after:content-[''] peer-checked:bg-[#2563EB] peer-checked:after:translate-x-full dark:bg-zinc-800"></div>
        </label>
      </div>

      {insured && (
        <Field label="배상보험 한도액 (원)" icon={<Shield className="h-4 w-4 text-zinc-400" />}>
          <Controller
            control={control}
            name="insuranceAmount"
            render={({ field }) => (
              <div className="relative flex items-center">
                <input
                  type="number"
                  inputMode="numeric"
                  min={0}
                  value={field.value ?? ""}
                  onChange={(e) => {
                    const v = e.target.value;
                    field.onChange(v === "" ? null : Number(v));
                  }}
                  placeholder="예: 300000000"
                  className="w-full rounded-xl border border-zinc-200 bg-white pl-3.5 pr-8 py-2.5 text-sm outline-hidden transition-all focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/10 dark:border-zinc-800 dark:bg-zinc-950"
                />
                <span className="absolute right-3.5 text-xs font-bold text-zinc-400">
                  원
                </span>
              </div>
            )}
          />
        </Field>
      )}

      {/* 합계 금액 - Premium Card 형태 */}
      <div className="mt-2 rounded-2xl bg-zinc-50 border border-zinc-100 p-4.5 dark:bg-zinc-900/30 dark:border-zinc-850">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">총 견적 합계</span>
          <span className="text-[28px] font-black text-[#2563EB] tracking-tight dark:text-blue-400">
            {totalAmount.toLocaleString()}
            <span className="ml-1 text-base font-bold text-zinc-700 dark:text-zinc-350">원</span>
          </span>
        </div>
      </div>

      {submitError && (
        <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-950/50 dark:text-red-300">
          {submitError}
        </p>
      )}

      <button
        type="submit"
        disabled={isPending || totalAmount <= 0}
        className="relative overflow-hidden w-full rounded-2xl bg-[#2563EB] py-4 text-sm font-extrabold text-white border-t-2 border-white/20 border-b-2 border-black/20 shadow-[0_4px_14px_rgba(37,99,235,0.3),_inset_0_1px_0_rgba(255,255,255,0.2)] hover:bg-[#3b82f6] disabled:opacity-50 disabled:pointer-events-none active:scale-[0.98] transition-all cursor-pointer text-center"
      >
        {isPending ? (
          <span className="flex items-center justify-center gap-1.5">
            제출 중...
          </span>
        ) : (
          <span className="flex items-center justify-center gap-1.5">
            <Check className="h-4.5 w-4.5" />
            {`${totalAmount.toLocaleString()}원 견적 제출하기`}
          </span>
        )}
      </button>
    </form>
  );
}

function Field({
  label,
  icon,
  children,
}: {
  label: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1.8">
      <span className="flex items-center gap-1.5 text-sm font-semibold text-zinc-800 dark:text-zinc-200">
        {icon}
        {label}
      </span>
      {children}
    </label>
  );
}
