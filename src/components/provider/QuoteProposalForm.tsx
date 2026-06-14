"use client";

import { useState, useEffect, useTransition } from "react";
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

const RECOMMEND_ITEMS = ["살균 소독", "스팀 청소", "피톤치드", "폐기물 처리", "곰팡이 제거"];

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

  // 스마트 계산기 금액 변경 시 마이크로 펄스 애니메이션용 State
  const [isPulsing, setIsPulsing] = useState(false);
  useEffect(() => {
    setIsPulsing(true);
    const t = setTimeout(() => setIsPulsing(false), 300);
    return () => clearTimeout(t);
  }, [calcTotal]);

  // 스마트 계산 적용 여부 동적 판단
  const firstItemPrice = watch("items.0.price");
  const isSmartApplied = firstItemPrice === calcTotal && firstItemPrice > 0;

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
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-6 relative">
      {/* 1. 상단 요청 조건 영역 (안내 카드형 개선) */}
      <div className="rounded-[22px] border border-[#dbe8fb] bg-[linear-gradient(135deg,rgba(255,255,255,0.9)_0%,rgba(238,246,255,0.8)_100%)] p-5 shadow-[0_8px_30px_rgba(43,102,246,0.03)] backdrop-blur-xs dark:border-zinc-800 dark:bg-zinc-900/40">
        <h3 className="text-xs font-bold text-zinc-400 mb-2 uppercase tracking-wider">요청 조건</h3>
        <div className="flex flex-wrap gap-2 mb-3">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[#2563EB]/10 px-3 py-1 text-[11px] font-bold text-[#2563EB] dark:bg-zinc-850 dark:text-blue-300">
            <Sparkles className="h-3.5 w-3.5" />
            {QUOTE_CATEGORY_LABELS[request.category as QuoteCategory]}
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-zinc-100 px-3 py-1 text-[11px] font-semibold text-zinc-650 dark:bg-zinc-800/80 dark:text-zinc-400">
            <MapPin className="h-3.5 w-3.5 text-zinc-400" />
            {request.region.district}
          </span>
          {request.size && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-zinc-100 px-3 py-1 text-[11px] font-semibold text-zinc-650 dark:bg-zinc-800/80 dark:text-zinc-400">
              <Home className="h-3.5 w-3.5 text-zinc-400" />
              {request.size}평 {request.roomType ? `(${request.roomType})` : ""}
            </span>
          )}
        </div>
        <p className="text-[11px] text-zinc-450 dark:text-zinc-500 leading-relaxed font-medium">
          고객이 요청한 기본 조건을 확인하고 합리적인 견적을 작성해 보세요.
        </p>
      </div>

      {/* 2. 스마트 견적 계산기 Panel */}
      <div className="rounded-[24px] border border-blue-100 bg-blue-50/15 p-5 dark:border-zinc-800 dark:bg-zinc-900/30">
        <button
          type="button"
          onClick={() => setIsCalcOpen(!isCalcOpen)}
          className="flex w-full items-center justify-between font-bold text-zinc-900 dark:text-zinc-50 focus:outline-hidden cursor-pointer"
        >
          <span className="flex items-center gap-1.5 text-sm font-extrabold text-[#2563EB]">
            <Sparkles className="h-4.5 w-4.5" />
            스마트 견적 계산기 ⚡
          </span>
          <span className="text-xs text-zinc-500 hover:text-zinc-700 font-semibold bg-zinc-100 dark:bg-zinc-800 px-2.5 py-1 rounded-lg transition-colors">
            {isCalcOpen ? "접기 ▲" : "펼치기 ▼"}
          </span>
        </button>

        {isCalcOpen ? (
          <div className="mt-4 space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
            <p className="text-[11px] leading-4 text-zinc-450 dark:text-zinc-500">
              고객의 요청 조건과 파트너님의 인원/옵션을 입력하시면 견적이 자동 산출됩니다.
            </p>

            <div className="grid grid-cols-2 gap-3.5">
              {/* Pyeong Size */}
              <label className="flex flex-col gap-1.5">
                <span className="text-xs font-semibold text-zinc-650 dark:text-zinc-350">작업 면적 (평수)</span>
                <div className="relative flex items-center">
                  <input
                    type="number"
                    value={pyeongSize || ""}
                    onChange={(e) => setPyeongSize(e.target.value === "" ? 0 : Number(e.target.value))}
                    placeholder="0"
                    className="w-full rounded-xl border border-zinc-200 bg-white pl-3.5 pr-10 py-2.5 text-xs outline-hidden focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/10 dark:border-zinc-800 dark:bg-zinc-950"
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
                    value={pricePerPyeong || ""}
                    onChange={(e) => setPricePerPyeong(e.target.value === "" ? 0 : Number(e.target.value))}
                    placeholder="0"
                    className="w-full rounded-xl border border-zinc-200 bg-white pl-3.5 pr-10 py-2.5 text-xs outline-hidden focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/10 dark:border-zinc-800 dark:bg-zinc-950"
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
                    value={workerCount === 0 ? "" : workerCount}
                    onChange={(e) => setWorkerCount(e.target.value === "" ? 0 : Number(e.target.value))}
                    placeholder="0"
                    className="w-full rounded-xl border border-zinc-200 bg-white pl-3.5 pr-10 py-2.5 text-xs outline-hidden focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/10 dark:border-zinc-800 dark:bg-zinc-950"
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
                    className={`flex-1 rounded-xl py-2.5 text-xs font-bold transition-all border cursor-pointer ${
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
                    className={`flex-1 rounded-xl py-2.5 text-xs font-bold transition-all border cursor-pointer ${
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
                <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-450 dark:text-zinc-400">계산된 예상 금액</span>
                <span className={`text-base font-extrabold text-[#2563EB] dark:text-blue-400 transition-all duration-300 ${isPulsing ? "scale-105 text-blue-600 dark:text-blue-300" : ""}`}>
                  {calcTotal.toLocaleString()}원
                </span>
              </div>
              <button
                type="button"
                onClick={applyCalculatedPrice}
                className="rounded-lg bg-blue-600 px-3.5 py-2 text-[11px] font-bold text-white shadow-xs hover:bg-blue-700 active:scale-95 transition-all cursor-pointer"
              >
                견적 항목에 반영
              </button>
            </div>
          </div>
        ) : (
          /* 접혀있을 때의 요약 영역 */
          <div className="mt-3 flex items-center justify-between rounded-xl bg-blue-50/40 border border-blue-100/50 px-4 py-2.5 dark:bg-zinc-950/20 dark:border-zinc-800/50 animate-in fade-in duration-200">
            <div className="flex flex-col">
              <span className="text-[9px] text-zinc-400 font-bold uppercase tracking-wider">계산기 예상 금액</span>
              <span className={`text-sm font-extrabold text-[#2563EB] dark:text-blue-400 transition-all duration-300 ${isPulsing ? "scale-105 text-blue-600 dark:text-blue-300" : ""}`}>
                {calcTotal.toLocaleString()}원
              </span>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setIsCalcOpen(true)}
                className="text-[11px] font-bold text-zinc-500 hover:text-zinc-800 bg-white border border-zinc-200 rounded-lg px-2.5 py-1.5 dark:bg-zinc-900 dark:border-zinc-800 dark:text-zinc-400 cursor-pointer"
              >
                상세 편집
              </button>
              <button
                type="button"
                onClick={applyCalculatedPrice}
                className="text-[11px] font-bold text-white bg-blue-600 rounded-lg px-3 py-1.5 hover:bg-blue-700 transition-all cursor-pointer"
              >
                적용
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 3. 견적 항목 목록 (카드형 리디자인) */}
      <section className="flex flex-col gap-3.5">
        <label className="text-sm font-bold text-zinc-800 dark:text-zinc-200">견적 항목</label>
        {fields.map((field, index) => (
          <div
            key={field.id}
            className="flex flex-col gap-3.5 rounded-2xl border border-zinc-200 bg-white p-4.5 shadow-[0_4px_16px_rgba(0,0,0,0.015)] transition-all focus-within:border-[#2563EB] focus-within:ring-2 focus-within:ring-[#2563EB]/10 dark:border-zinc-800 dark:bg-zinc-900/20"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-[#2563EB] dark:text-blue-400">
                {index === 0 ? "기본 견적 항목" : `추가 견적 항목 #${index}`}
              </span>
              <div className="flex items-center gap-2">
                {index === 0 && isSmartApplied && (
                  <span className="inline-flex items-center gap-1 rounded-md bg-blue-50 border border-blue-200 px-2 py-0.5 text-[10px] font-bold text-[#2563EB] dark:bg-blue-950/40 dark:border-blue-900/50 dark:text-blue-400 animate-in fade-in zoom-in-95 duration-200">
                    스마트 계산 적용됨
                  </span>
                )}
                {index > 0 && (
                  <button
                    type="button"
                    onClick={() => remove(index)}
                    className="text-[10px] font-bold text-rose-500 hover:text-rose-700 bg-rose-50 dark:bg-rose-950/20 px-2 py-1 rounded-lg transition-colors cursor-pointer"
                  >
                    삭제
                  </button>
                )}
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <span className="text-[11px] font-semibold text-zinc-450 dark:text-zinc-400">항목명</span>
              <input
                {...register(`items.${index}.label`)}
                placeholder="예: 기본 입주청소, 베란다 스팀 추가 등"
                className="w-full rounded-xl border border-zinc-200 bg-white px-3.5 py-2.5 text-xs font-semibold outline-hidden transition-all focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/10 dark:border-zinc-800 dark:bg-zinc-950"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <span className="text-[11px] font-semibold text-zinc-450 dark:text-zinc-400">금액</span>
              <div className="relative flex items-center">
                <Controller
                  control={control}
                  name={`items.${index}.price`}
                  render={({ field: f }) => (
                    <input
                      type="number"
                      inputMode="numeric"
                      min={0}
                      value={f.value === 0 ? "" : (f.value ?? "")}
                      onChange={(e) =>
                        f.onChange(
                          e.target.value === "" ? 0 : Number(e.target.value),
                        )
                      }
                      placeholder="0"
                      className="w-full rounded-xl border border-zinc-200 bg-white pl-3.5 pr-8 py-2.5 text-xs font-bold outline-hidden transition-all focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/10 dark:border-zinc-800 dark:bg-zinc-950"
                    />
                  )}
                />
                <span className="absolute right-3.5 text-xs font-bold text-zinc-400">원</span>
              </div>
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

        {/* 4. 항목 추가 및 추천 항목 칩 */}
        <div className="flex flex-col gap-3">
          <button
            type="button"
            onClick={() =>
              append({ label: "", price: 0, note: null })
            }
            disabled={fields.length >= 10}
            className="flex items-center justify-center gap-1.5 rounded-xl border-2 border-dashed border-zinc-200 bg-zinc-55/10 py-3.5 text-xs font-bold text-[#2563EB] hover:bg-zinc-100 hover:border-[#2563EB]/40 disabled:opacity-50 active:scale-[0.99] transition-all cursor-pointer dark:border-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-900/40"
          >
            <Plus className="h-4 w-4" /> 항목 추가
          </button>

          <div className="flex flex-col gap-2">
            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">추천 추가 항목</span>
            <div className="flex flex-wrap gap-1.5">
              {RECOMMEND_ITEMS.map((label) => (
                <button
                  key={label}
                  type="button"
                  onClick={() => {
                    if (fields.length < 10) {
                      append({ label, price: 0, note: null });
                    }
                  }}
                  className="rounded-lg border border-zinc-200 bg-white px-2.5 py-1.5 text-[11px] font-semibold text-zinc-650 hover:bg-zinc-50 active:scale-95 transition-all dark:border-zinc-850 dark:bg-zinc-900 dark:text-zinc-400 cursor-pointer"
                >
                  + {label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* 5. 제안 가능 일정 (선택) */}
      <Field label="제안 가능 일정 (선택)" icon={<Calendar className="h-4 w-4 text-[#2563EB]" />}>
        <div className="flex gap-2">
          <input
            {...register("scheduledAtDate")}
            type="date"
            className="flex-1 rounded-xl border border-zinc-200 bg-white px-3.5 py-2.5 text-xs outline-hidden transition-all focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/10 dark:border-zinc-800 dark:bg-zinc-950"
          />
          <input
            {...register("scheduledAtTime")}
            type="time"
            className="w-32 rounded-xl border border-zinc-200 bg-white px-3.5 py-2.5 text-xs outline-hidden transition-all focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/10 dark:border-zinc-800 dark:bg-zinc-950"
          />
        </div>
      </Field>

      {/* 6. 작업 예상 시간 (선택) & 빠른 선택 칩 */}
      <Field label="작업 예상 시간 (선택)" icon={<Clock className="h-4 w-4 text-[#2563EB]" />}>
        <Controller
          control={control}
          name="estimatedWorkHours"
          render={({ field }) => (
            <div className="flex flex-col gap-2">
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
                  className="w-full rounded-xl border border-zinc-200 bg-white pl-3.5 pr-12 py-2.5 text-xs outline-hidden transition-all focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/10 dark:border-zinc-800 dark:bg-zinc-950"
                />
                <span className="absolute right-3.5 text-xs font-bold text-zinc-400">
                  시간
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {[2, 3, 4, 5, 6].map((hours) => (
                  <button
                    key={hours}
                    type="button"
                    onClick={() => setValue("estimatedWorkHours", hours)}
                    className={`rounded-lg px-2.5 py-1 text-[11px] font-semibold border transition-all cursor-pointer ${
                      watch("estimatedWorkHours") === hours
                        ? "bg-[#2563EB] text-white border-[#2563EB] shadow-xs"
                        : "bg-white text-zinc-650 border-zinc-200 dark:bg-zinc-900 dark:border-zinc-850 dark:text-zinc-450"
                    }`}
                  >
                    {hours === 6 ? "6시간 이상" : `${hours}시간`}
                  </button>
                ))}
              </div>
            </div>
          )}
        />
      </Field>

      {/* 7. 배상책임보험 정보 개선 */}
      <div className={`flex flex-col gap-3 rounded-2xl border p-4.5 transition-all ${
        insured 
          ? "border-blue-200 bg-blue-50/5 dark:border-blue-900/40 dark:bg-blue-950/5" 
          : "border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900/10"
      }`}>
        <div className="flex items-center justify-between">
          <div className="flex flex-col gap-0.5">
            <span className="flex items-center gap-1.5 text-xs font-bold text-zinc-850 dark:text-zinc-200">
              <Shield className={`h-4.5 w-4.5 ${insured ? "text-[#2563EB]" : "text-zinc-400"}`} />
              배상책임보험 가입 여부
            </span>
            <span className="text-[10px] text-zinc-450 dark:text-zinc-500 font-semibold">
              가입 시 고객에게 '보험 가입 업체'로 표시됩니다.
            </span>
          </div>
          
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
          <div className="text-[10px] font-bold text-blue-600 dark:text-blue-400 animate-in fade-in duration-200">
            ✓ 고객 화면에 보험 가입 배지가 노출됩니다.
          </div>
        )}
      </div>

      {insured && (
        <Field label="배상보험 한도액 (원)" icon={<Shield className="h-4 w-4 text-[#2563EB]" />}>
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
                  className="w-full rounded-xl border border-zinc-200 bg-white pl-3.5 pr-8 py-2.5 text-xs outline-hidden transition-all focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/10 dark:border-zinc-800 dark:bg-zinc-950"
                />
                <span className="absolute right-3.5 text-xs font-bold text-zinc-400">
                  원
                </span>
              </div>
            )}
          />
        </Field>
      )}

      {submitError && (
        <p className="rounded-xl bg-red-50 px-4 py-3 text-xs text-red-700 dark:bg-red-950/50 dark:text-red-350">
          {submitError}
        </p>
      )}

      {/* 여백 스페이서: 하단 고정 CTA 패널에 가려지지 않도록 추가 */}
      <div className="h-36" />

      {/* 8. 총 견적 합계 및 제출 CTA (Sticky Bottom CTA) */}
      <div
        className="fixed bottom-[var(--bottom-nav-height)] left-1/2 -translate-x-1/2 w-full max-w-[480px] z-30 border-t border-zinc-150 bg-white/95 backdrop-blur-xs p-4.5 flex items-center justify-between gap-4 dark:border-zinc-850 dark:bg-zinc-950/95"
        style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 12px)" }}
      >
        <div className="flex flex-col">
          <span className="text-[10px] font-bold text-zinc-450 dark:text-zinc-500 uppercase tracking-wider">총 견적 합계</span>
          {totalAmount <= 0 ? (
            <span className="text-[10px] font-semibold text-zinc-450 dark:text-zinc-500 mt-1.5 max-w-[180px] leading-tight">
              아직 적용된 견적 항목이 없습니다.
            </span>
          ) : (
            <span className="text-lg font-black text-[#2563EB] dark:text-blue-400 tracking-tight mt-0.5">
              {totalAmount.toLocaleString()}
              <span className="ml-0.5 text-xs font-bold text-zinc-700 dark:text-zinc-350">원</span>
            </span>
          )}
        </div>

        <button
          type="submit"
          disabled={isPending || totalAmount <= 0}
          className="flex-1 max-w-[210px] relative overflow-hidden rounded-xl bg-[#2563EB] py-3 text-xs font-extrabold text-white border-t border-white/10 border-b border-black/15 shadow-[0_2px_8px_rgba(37,99,235,0.2)] hover:bg-[#3b82f6] disabled:bg-zinc-200 disabled:text-zinc-400 disabled:border-none disabled:shadow-none disabled:pointer-events-none active:scale-[0.98] transition-all cursor-pointer text-center"
        >
          {isPending ? (
            <span className="flex items-center justify-center gap-1.5">
              제출 중...
            </span>
          ) : totalAmount <= 0 ? (
            "금액을 입력해주세요"
          ) : (
            <span className="flex items-center justify-center gap-1.5">
              <Check className="h-3.5 w-3.5" />
              견적 제출하기
            </span>
          )}
        </button>
      </div>
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
      <span className="flex items-center gap-1.5 text-xs font-bold text-zinc-800 dark:text-zinc-200">
        {icon}
        {label}
      </span>
      {children}
    </label>
  );
}
