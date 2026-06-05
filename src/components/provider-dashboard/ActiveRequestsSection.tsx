import Link from "next/link";
import { RequestPreviewCard } from "./RequestPreviewCard";
import { EmptyRequestsHint } from "./EmptyRequestsHint";
import type { Provider } from "@/types/provider";
import type { QuoteRequest } from "@/types/quote-request";
import type { QuoteRequestPreviewDTO } from "@/types/dashboard";

interface Props {
  provider: Provider;
  requests: QuoteRequest[];
  totalCount: number;
}

function toPreviewDTO(request: QuoteRequest): QuoteRequestPreviewDTO {
  const regionLabel =
    [request.region.city, request.region.district].filter(Boolean).join(" ") ||
    "지역 미지정";
  return {
    id: request.id,
    category: request.category,
    regionLabel,
    sizeLabel: request.size != null ? `${request.size}평` : null,
    createdAtMs: request.createdAt.getTime(),
    note: request.note?.slice(0, 80) ?? null,
  };
}

export function ActiveRequestsSection({
  provider,
  requests,
  totalCount,
}: Props) {
  if (totalCount === 0) {
    return (
      <section aria-labelledby="active-requests-heading" className="mb-6">
        <h2
          id="active-requests-heading"
          className="mb-3 text-[14px] font-extrabold text-zinc-800 dark:text-zinc-200"
        >
          수신 요청
        </h2>
        <EmptyRequestsHint
          emphasizeCategories={(provider.categories?.length ?? 0) < 3}
          emphasizeProfile={
            !provider.description ||
            (provider.priceBook?.length ?? 0) === 0
          }
        />
      </section>
    );
  }

  const previews = requests.map(toPreviewDTO);

  return (
    <section aria-labelledby="active-requests-heading" className="mb-6">
      <div className="mb-3 flex items-center justify-between">
        <h2
          id="active-requests-heading"
          className="text-[14px] font-extrabold text-zinc-800 dark:text-zinc-200"
        >
          수신 요청{" "}
          <span className="ml-1 text-[11px] font-bold text-zinc-400 dark:text-zinc-500">
            ({totalCount}건)
          </span>
        </h2>
        <Link
          href="/provider/requests"
          className="text-xs font-extrabold text-[#2563EB] hover:text-[#1D4ED8] dark:text-[#3B82F6]"
        >
          전체 보기 →
        </Link>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {previews.map((request) => (
          <RequestPreviewCard key={request.id} request={request} />
        ))}
      </div>
    </section>
  );
}
