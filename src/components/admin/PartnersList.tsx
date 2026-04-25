import Link from "next/link";
import type { Partner } from "@/types/partner";
import {
  isQuoteCategory,
  QUOTE_CATEGORY_LABELS,
} from "@/domain/quote-category";

const STATUS_EMOJI: Record<Partner["status"], string> = {
  invited: "✉",
  active: "✅",
  suspended: "🚫",
};

const STATUS_LABEL: Record<Partner["status"], string> = {
  invited: "초대됨",
  active: "활성",
  suspended: "정지",
};

function categoryLabel(c: string | null | undefined): string {
  if (!c) return "(카테고리 미지정)";
  return isQuoteCategory(c) ? QUOTE_CATEGORY_LABELS[c] : c;
}

function fmt(d: Date): string {
  return d.toLocaleString("ko-KR", {
    timeZone: "Asia/Seoul",
    year: "2-digit", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit",
  });
}

export default function PartnersList({ partners }: { partners: Partner[] }) {
  const groups: Record<Partner["status"], Partner[]> = {
    invited: [],
    active: [],
    suspended: [],
  };
  for (const p of partners) groups[p.status].push(p);

  if (partners.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-zinc-300 p-8 text-center text-zinc-500 dark:border-zinc-700">
        <p className="mb-3">아직 발급된 의뢰업체가 없습니다.</p>
        <Link
          href="/admin/partners/new"
          className="inline-block rounded-md bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700"
        >
          첫 발급
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {(["active", "invited", "suspended"] as Partner["status"][]).map((s) => {
        const list = groups[s];
        if (list.length === 0) return null;
        return (
          <section key={s}>
            <h2 className="mb-2 text-sm font-semibold text-zinc-700 dark:text-zinc-300">
              {STATUS_EMOJI[s]} {STATUS_LABEL[s]} ({list.length})
            </h2>
            <ul className="divide-y divide-zinc-200 rounded-lg border border-zinc-200 bg-white dark:divide-zinc-800 dark:border-zinc-800 dark:bg-zinc-900">
              {list.map((p) => (
                <li key={p.id} className="flex items-center justify-between gap-3 px-4 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{p.businessName}</p>
                    <p className="mt-0.5 text-xs text-zinc-500">
                      {p.regionLabel ?? "(지역 미지정)"} · {categoryLabel(p.category)}
                      {" · "}자동발행: {p.autoPublish.enabled ? "켜짐" : "꺼짐"}
                      {" · "}
                      {fmt(p.issuedAt)}
                    </p>
                  </div>
                  <Link
                    href={`/admin/partners/${p.id}`}
                    className="shrink-0 rounded-md border border-zinc-300 px-3 py-1 text-sm hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
                  >
                    상세
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
