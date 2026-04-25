import Image from "next/image";
import { Calendar, MapPin, Home, Users } from "lucide-react";
import {
  QUOTE_CATEGORY_EMOJIS,
  QUOTE_CATEGORY_LABELS,
} from "@/domain/quote-category";
import type { QuoteRequest } from "@/types/quote-request";
import type { Provider } from "@/types/provider";

interface Props {
  request: QuoteRequest;
  provider: Provider;
}

function approxDistanceLabel(
  providerRegions: Provider["regions"],
  region: QuoteRequest["region"],
): string {
  const exact = providerRegions.some(
    (r) => r.city === region.city && r.district === region.district,
  );
  if (exact) return "동네";
  const sameCity = providerRegions.some((r) => r.city === region.city);
  if (sameCity) return "같은 시";
  return "다른 지역";
}

function formatPreferredDate(date: Date | null): string {
  if (!date) return "협의";
  const kst = new Date(date.getTime() + 9 * 60 * 60 * 1000);
  const m = kst.getUTCMonth() + 1;
  const d = kst.getUTCDate();
  const dow = ["일", "월", "화", "수", "목", "금", "토"][kst.getUTCDay()];
  const hour = kst.getUTCHours();
  const ampm = hour < 12 ? "오전" : "오후";
  return `${m}월 ${d}일(${dow}) ${ampm}`;
}

function standardPriceRange(
  provider: Provider,
  category: QuoteRequest["category"],
): string | null {
  if (!provider.priceBook || provider.priceBook.length === 0) return null;
  const entry = provider.priceBook.find((p) => p.category === category);
  if (!entry) return null;
  const low = Math.round((entry.basePrice * 0.8) / 10000);
  const high = Math.round((entry.basePrice * 1.2) / 10000);
  return `${low}~${high}만원`;
}

export function RequestCard({ request, provider }: Props) {
  const emoji = QUOTE_CATEGORY_EMOJIS[request.category];
  const categoryLabel = QUOTE_CATEGORY_LABELS[request.category];
  const distance = approxDistanceLabel(provider.regions, request.region);
  const sizeLabel = request.size
    ? `${request.size}평${request.roomType ? ` · ${request.roomType}` : ""}`
    : request.roomType ?? "-";
  const priceRange = standardPriceRange(provider, request.category);

  return (
    <article className="flex flex-col gap-5 rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950">
      {/* 카테고리 칩 */}
      <div className="flex items-center gap-2">
        <span className="rounded-full bg-indigo-100 px-3 py-1 text-xs font-semibold text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300">
          {emoji} {categoryLabel}
        </span>
        <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs text-zinc-600 dark:bg-zinc-900 dark:text-zinc-400">
          비정기 1회
        </span>
      </div>

      {/* 제목 */}
      <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-50">
        {request.region.district} · {sizeLabel}
        <span className="ml-2 text-sm font-normal text-zinc-500">· {distance}</span>
      </h2>

      {/* 사진 grid */}
      {request.photos.length > 0 && (
        <div className="grid grid-cols-2 gap-2">
          {request.photos.slice(0, 2).map((photo) => (
            <div
              key={photo.path}
              className="relative aspect-video overflow-hidden rounded-xl bg-zinc-100 dark:bg-zinc-900"
            >
              <Image
                src={photo.url}
                alt="요청 사진"
                fill
                sizes="(max-width: 640px) 50vw, 300px"
                className="object-cover"
              />
            </div>
          ))}
        </div>
      )}

      {/* Details 2x2 grid */}
      <div className="grid grid-cols-2 gap-3">
        <DetailRow
          icon={<Calendar className="h-4 w-4" />}
          label="희망 일정"
          value={formatPreferredDate(request.preferredDate)}
        />
        <DetailRow
          icon={<MapPin className="h-4 w-4" />}
          label="지역"
          value={request.region.district}
        />
        <DetailRow
          icon={<Home className="h-4 w-4" />}
          label="공간"
          value={sizeLabel}
        />
        <DetailRow
          icon={<Users className="h-4 w-4" />}
          label="경쟁 청명"
          value={`${request.notifiedProviderIds.length}명`}
        />
      </div>

      {/* 고객 요청사항 */}
      {request.note && (
        <div>
          <p className="mb-1 text-xs font-semibold text-zinc-500">고객 요청사항</p>
          <p className="whitespace-pre-wrap rounded-xl bg-zinc-50 px-4 py-3 text-sm text-zinc-700 dark:bg-zinc-900 dark:text-zinc-300">
            {request.note}
          </p>
        </div>
      )}

      {/* 표준 견적 범위 */}
      {priceRange && (
        <div className="rounded-xl bg-indigo-50 px-4 py-3 dark:bg-indigo-950/30">
          <p className="mb-1 text-xs font-semibold text-indigo-600 dark:text-indigo-400">
            표준 견적 범위
          </p>
          <p className="text-lg font-bold text-zinc-900 dark:text-zinc-50">
            {priceRange}
          </p>
        </div>
      )}
    </article>
  );
}

function DetailRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-2 rounded-xl bg-zinc-50 px-3 py-2.5 dark:bg-zinc-900">
      <span className="mt-0.5 text-zinc-500" aria-hidden>
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] text-zinc-500">{label}</p>
        <p className="truncate text-sm font-medium text-zinc-900 dark:text-zinc-50">
          {value}
        </p>
      </div>
    </div>
  );
}
