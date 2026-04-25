interface Props {
  /** 기본: "샘플" · 배지 문구 커스텀 가능 */
  label?: string;
  /** small = 카드용, md = 프로필 상단용 */
  size?: "sm" | "md";
  className?: string;
}

/**
 * v1.6 — 샘플/데모 계정·포스트 식별 배지.
 * 의도: AI가 자동 응답하거나 자동 생성된 콘텐츠임을 사용자에게 투명하게 고지.
 */
export function SampleBadge({
  label = "샘플",
  size = "sm",
  className = "",
}: Props) {
  const base =
    "inline-flex items-center gap-1 rounded-full font-medium bg-zinc-100 text-zinc-500 border border-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:border-zinc-700";
  const sized =
    size === "md"
      ? "px-2 py-0.5 text-[11px]"
      : "px-1.5 py-[1px] text-[10px]";
  return (
    <span
      className={[base, sized, className].join(" ")}
      aria-label={`${label} 계정`}
      title="청광 운영 샘플 계정 · AI 데모용"
    >
      <span aria-hidden>●</span>
      {label}
    </span>
  );
}
