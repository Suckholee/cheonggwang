import { CalendarCheck } from "lucide-react";
import { formatScheduledLabel } from "@/domain/booking-day-bucket";
import type { BookingBannerDTO } from "@/types/booking";

interface Props {
  banner: BookingBannerDTO;
}

export function BookingStatusBanner({ banner }: Props) {
  return (
    <aside
      aria-label="일정 확정 정보"
      className="border-b border-emerald-200 bg-emerald-50/60 px-3 py-2 dark:border-emerald-900/50 dark:bg-emerald-950/20"
    >
      <div className="flex items-start gap-2">
        <CalendarCheck
          className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400"
          aria-hidden
        />
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold text-emerald-800 dark:text-emerald-300">
            🗓️ {formatScheduledLabel(banner.scheduledAtMs)} 일정 확정됨
          </p>
          {banner.memo && (
            <p className="mt-0.5 whitespace-pre-wrap text-[11px] text-emerald-700/80 dark:text-emerald-400/80">
              {banner.memo}
            </p>
          )}
        </div>
      </div>
    </aside>
  );
}
