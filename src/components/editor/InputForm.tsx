"use client";

import { useFieldArray, type Control, type UseFormRegister, type FieldErrors } from "react-hook-form";
import {
  MAX_ADDRESS,
  MAX_BUSINESS_NAME,
  MAX_KEY_POINTS,
  MAX_KEY_POINT_LENGTH,
  MIN_KEY_POINTS,
  CATEGORY_LABELS,
} from "@/domain/constants";
import type { EditorFormValues } from "./EditorShell";

interface Props {
  register: UseFormRegister<EditorFormValues>;
  control: Control<EditorFormValues>;
  errors: FieldErrors<EditorFormValues>;
  category: keyof typeof CATEGORY_LABELS;
}

export function InputForm({ register, control, errors, category }: Props) {
  const keyPointsField = useFieldArray({
    control,
    name: "keyPoints" as never,
  });

  const keyPoints = keyPointsField.fields as { id: string }[];

  return (
    <div className="flex flex-col gap-5">
      <Field label="업종" hint="페이지 생성 시 선택한 값 (변경 불가)">
        <input
          type="text"
          disabled
          value={CATEGORY_LABELS[category]}
          className="w-full rounded border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900"
        />
      </Field>

      <Field
        label="업체명"
        hint={`최대 ${MAX_BUSINESS_NAME}자`}
        error={errors.businessName?.message}
      >
        <input
          {...register("businessName")}
          type="text"
          maxLength={MAX_BUSINESS_NAME}
          className="w-full rounded border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-950"
        />
      </Field>

      <Field
        label="주소"
        hint={`최대 ${MAX_ADDRESS}자`}
        error={errors.address?.message}
      >
        <input
          {...register("address")}
          type="text"
          maxLength={MAX_ADDRESS}
          className="w-full rounded border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-950"
        />
      </Field>

      <Field
        label="연락처"
        hint="예: 010-1234-5678"
        error={errors.phone?.message}
      >
        <input
          {...register("phone")}
          type="tel"
          placeholder="02-000-0000"
          className="w-full rounded border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-950"
        />
      </Field>

      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium">
            키포인트{" "}
            <span className="text-xs text-zinc-500">
              ({keyPoints.length} / {MAX_KEY_POINTS})
            </span>
          </label>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => keyPointsField.append("")}
              disabled={keyPoints.length >= MAX_KEY_POINTS}
              className="rounded border border-zinc-300 px-2 py-1 text-xs disabled:opacity-50 dark:border-zinc-700"
            >
              추가
            </button>
          </div>
        </div>
        <p className="text-xs text-zinc-500">
          매장의 장점 {MIN_KEY_POINTS}~{MAX_KEY_POINTS}개. AI가 글 생성 시 참고합니다.
        </p>
        <ul className="flex flex-col gap-2">
          {keyPoints.map((kp, idx) => (
            <li key={kp.id} className="flex items-start gap-2">
              <input
                {...register(`keyPoints.${idx}` as const)}
                type="text"
                maxLength={MAX_KEY_POINT_LENGTH}
                placeholder={`키포인트 ${idx + 1}`}
                className="flex-1 rounded border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-950"
              />
              <button
                type="button"
                onClick={() => keyPointsField.remove(idx)}
                disabled={keyPoints.length <= MIN_KEY_POINTS}
                className="rounded border border-zinc-300 px-2.5 py-2 text-xs disabled:opacity-40 dark:border-zinc-700"
              >
                삭제
              </button>
            </li>
          ))}
        </ul>
        {errors.keyPoints && (
          <p className="text-xs text-red-600">
            {typeof errors.keyPoints.message === "string"
              ? errors.keyPoints.message
              : "키포인트를 확인해주세요"}
          </p>
        )}
      </div>
    </div>
  );
}

function Field({
  label,
  hint,
  error,
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-medium">{label}</label>
      {children}
      {error ? (
        <p className="text-xs text-red-600">{error}</p>
      ) : hint ? (
        <p className="text-xs text-zinc-500">{hint}</p>
      ) : null}
    </div>
  );
}
