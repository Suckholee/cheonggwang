import Link from "next/link";
import type { PartnerApplicant } from "@/types/partner-applicant";
import { QUOTE_CATEGORY_LABELS } from "@/domain/quote-category";

/**
 * v1.9 partner-application · §6.3 — 대기 신청자 목록 (admin/partners 페이지 임베드).
 * Server Component — props로 list 받음.
 */

function fmtDate(d: Date): string {
  return d.toLocaleString("ko-KR", {
    timeZone: "Asia/Seoul",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function ApplicantsList({
  applicants,
}: {
  applicants: PartnerApplicant[];
}) {
  if (applicants.length === 0) {
    return (
      <p className="text-xs text-zinc-500">대기 중인 신청이 없습니다.</p>
    );
  }
  return (
    <div className="overflow-x-auto rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
      <table className="w-full text-sm">
        <thead className="bg-zinc-50 text-left text-xs text-zinc-500 dark:bg-zinc-800">
          <tr>
            <th className="px-3 py-2">매장명</th>
            <th className="px-3 py-2">이메일</th>
            <th className="px-3 py-2">카테고리</th>
            <th className="px-3 py-2">지역</th>
            <th className="px-3 py-2">신청</th>
            <th className="px-3 py-2 text-right">액션</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
          {applicants.map((a) => (
            <tr key={a.id}>
              <td className="px-3 py-2 font-medium">{a.businessName}</td>
              <td className="px-3 py-2 text-xs text-zinc-500">{a.email}</td>
              <td className="px-3 py-2 text-xs text-zinc-500">
                {a.category ? QUOTE_CATEGORY_LABELS[a.category] : "-"}
              </td>
              <td className="px-3 py-2 text-xs text-zinc-500">
                {a.regionLabel ?? "-"}
              </td>
              <td className="px-3 py-2 text-xs text-zinc-500">
                {fmtDate(a.appliedAt)}
              </td>
              <td className="px-3 py-2 text-right">
                <Link
                  href={`/admin/partners/applicants/${a.id}`}
                  className="rounded-md border border-zinc-300 px-2 py-1 text-xs hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
                >
                  상세
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
