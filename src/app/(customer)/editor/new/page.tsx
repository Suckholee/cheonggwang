import { createDraftAndRedirect } from "@/app/actions/page-actions";
import { CATEGORY_LABELS } from "@/domain/constants";
import type { Category } from "@/types/page";

export const metadata = {
  title: "새 페이지 · 청광",
};

const options: { value: Category; label: string; desc: string }[] = [
  { value: "restaurant", label: CATEGORY_LABELS.restaurant, desc: "식당·분식·카페형 음식점 등" },
  { value: "salon", label: CATEGORY_LABELS.salon, desc: "헤어·네일·피부관리실 등" },
  { value: "cafe", label: CATEGORY_LABELS.cafe, desc: "디저트·로스터리 카페 등" },
];

export default async function NewEditorPage(props: {
  searchParams: Promise<{ err?: string }>;
}) {
  const { err } = await props.searchParams;

  return (
    <div className="mx-auto max-w-2xl p-6">
      <h1 className="text-2xl font-bold tracking-tight">업종 선택</h1>
      <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
        업종에 맞는 템플릿이 자동으로 적용됩니다.
      </p>
      {err && (
        <p className="mt-4 rounded bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
          {err}
        </p>
      )}
      <form action={createDraftAndRedirect} className="mt-8 flex flex-col gap-3">
        {options.map((opt) => (
          <button
            key={opt.value}
            name="category"
            value={opt.value}
            type="submit"
            className="flex flex-col items-start gap-1 rounded-lg border border-zinc-200 bg-white p-5 text-left transition-colors hover:border-zinc-500 dark:border-zinc-800 dark:bg-zinc-950"
          >
            <span className="text-base font-semibold">{opt.label}</span>
            <span className="text-sm text-zinc-500 dark:text-zinc-400">
              {opt.desc}
            </span>
          </button>
        ))}
      </form>
    </div>
  );
}
