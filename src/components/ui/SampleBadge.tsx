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
  label = "인증",
  size = "sm",
  className = "",
}: Props) {
  const displayLabel = label === "샘플" ? "인증" : label;
  const base =
    "inline-flex items-center gap-0.5 rounded-full font-bold bg-[#EFF6FF] text-[#2563EB] border border-[#BFDBFE] dark:bg-blue-950/20 dark:text-blue-400 dark:border-blue-900/40 shrink-0";
  const sized =
    size === "md"
      ? "px-2 py-0.5 text-[10.5px]"
      : "px-1.5 py-[1.5px] text-[9.5px]";
  return (
    <span
      className={[base, sized, className].join(" ")}
      aria-label={`${displayLabel} 회원`}
    >
      <span className="text-[8px] font-black" aria-hidden>✓</span>
      {displayLabel}
    </span>
  );
}
