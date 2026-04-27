import { Check } from "lucide-react";
import {
  STEPPER_LABELS,
  statusToStepIndex,
  type QuoteStatus,
} from "@/domain/quote-status";

interface Props {
  status: QuoteStatus;
  compact?: boolean;
}

export function QuoteStepper({ status, compact = false }: Props) {
  const currentIdx = statusToStepIndex(status);

  if (currentIdx === -1) {
    return (
      <p className="rounded-lg bg-zinc-100 px-3 py-2 text-xs font-medium text-zinc-500 dark:bg-zinc-900">
        취소됨
      </p>
    );
  }

  const size = compact ? "h-5 w-5 text-[10px]" : "h-6 w-6 text-xs";
  const lineBase = compact ? "h-[2px]" : "h-[2px]";

  return (
    <div className="flex items-center w-full max-w-[260px] mx-auto">
      {STEPPER_LABELS.map((label, i) => {
        const isDone = i <= currentIdx;
        const isCurrent = i === currentIdx;
        const isLastStep = i === 3;
        
        let bgColor = "bg-zinc-100 dark:bg-zinc-800 text-zinc-300";
        if (isDone) {
          bgColor = isLastStep ? "bg-[#23C16B] text-white" : "bg-[#2563EB] text-white";
        }

        return (
          <div key={label} className="flex flex-1 flex-col items-center gap-1.5 relative">
            <div className="flex w-full items-center justify-center relative">
              <div className="flex items-center justify-center w-full z-10">
                <span
                  className={`flex ${size} flex-shrink-0 items-center justify-center rounded-full font-bold ${bgColor}`}
                >
                  {isDone ? (
                    <Check className="h-3.5 w-3.5" strokeWidth={3} aria-hidden />
                  ) : (
                    i + 1
                  )}
                </span>
              </div>
              
              {i < STEPPER_LABELS.length - 1 && (
                <span
                  className={`${lineBase} absolute left-1/2 w-full ${
                    i < currentIdx
                      ? "bg-[#2563EB]"
                      : "bg-zinc-100 dark:bg-zinc-800"
                  }`}
                  style={{ zIndex: 0 }}
                />
              )}
            </div>
            <span
              className={`text-[11px] font-bold ${
                isCurrent && !isLastStep
                  ? "text-[#2563EB]"
                  : isCurrent && isLastStep
                  ? "text-[#23C16B]"
                  : isDone
                  ? "text-zinc-600 dark:text-zinc-400"
                  : "text-zinc-300"
              }`}
            >
              {label}
            </span>
          </div>
        );
      })}
    </div>
  );
}
