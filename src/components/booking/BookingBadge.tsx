import { CheckCircle2 } from "lucide-react";
import { formatScheduledLabel } from "@/domain/booking-day-bucket";

interface Props {
  scheduledAtMs: number;
  size?: "sm" | "md";
}

export function BookingBadge({ scheduledAtMs, size = "sm" }: Props) {
  const label = formatScheduledLabel(scheduledAtMs);
  const sizeClass =
    size === "sm"
      ? "text-[11px] px-2 py-0.5"
      : "text-xs px-2.5 py-1";
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full bg-emerald-50 font-semibold text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400 ${sizeClass}`}
    >
      <CheckCircle2 className="h-3 w-3" aria-hidden />
      일정 확정 · {label}
    </span>
  );
}
