interface Props {
  icon: string;
  title: string;
  /** 추가 설명 (생략 가능) */
  description?: string;
}

export function EmptySection({ icon, title, description }: Props) {
  return (
    <div className="rounded-xl bg-zinc-50 px-4 py-8 text-center dark:bg-zinc-900">
      <span className="mb-2 block text-3xl" aria-hidden>
        {icon}
      </span>
      <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
        아직 {title}이 없어요
      </p>
      <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
        {description ?? "곧 추가됩니다"}
      </p>
    </div>
  );
}
