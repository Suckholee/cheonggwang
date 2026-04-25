import type { QuoteRequest } from "@/types/quote-request";
import {
  QUOTE_CATEGORY_EMOJIS,
  QUOTE_CATEGORY_LABELS,
} from "@/domain/quote-category";

export function QuoteSummary({ request }: { request: QuoteRequest }) {
  const date = request.preferredDate
    ? request.preferredDate.toLocaleDateString("ko-KR")
    : "협의";
  const size = request.size ? `${request.size}평` : "정보 없음";

  return (
    <dl className="grid grid-cols-[80px_1fr] gap-y-2 text-sm">
      <dt className="text-zinc-500">카테고리</dt>
      <dd className="font-medium">
        {QUOTE_CATEGORY_EMOJIS[request.category]}{" "}
        {QUOTE_CATEGORY_LABELS[request.category]}
      </dd>
      <dt className="text-zinc-500">지역</dt>
      <dd>
        {request.region.city} {request.region.district}
      </dd>
      <dt className="text-zinc-500">평수</dt>
      <dd>{size}</dd>
      <dt className="text-zinc-500">희망일</dt>
      <dd>{date}</dd>
      <dt className="text-zinc-500">연락처</dt>
      <dd>{request.contactPhone}</dd>
      {request.photos.length > 0 && (
        <>
          <dt className="text-zinc-500">사진</dt>
          <dd>{request.photos.length}장 첨부</dd>
        </>
      )}
      {request.note && (
        <>
          <dt className="text-zinc-500">특이사항</dt>
          <dd className="whitespace-pre-wrap text-zinc-700 dark:text-zinc-300">
            {request.note}
          </dd>
        </>
      )}
    </dl>
  );
}
