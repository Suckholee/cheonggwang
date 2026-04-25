interface Props {
  partnerCleaningFrequency?: string;
}

/**
 * §1.2 / §12.7: 청광 파트너 전용 신뢰 배지. 페이지 상단에 작게 노출.
 * 이 배지는 `isCheonggwangPartner === true`일 때만 렌더되어야 한다.
 */
export function HygieneBadge({ partnerCleaningFrequency }: Props) {
  return (
    <div className="flex justify-center bg-emerald-50 py-2 text-xs font-medium text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200">
      <span className="inline-flex items-center gap-1.5">
        <span aria-hidden>🧼</span>
        청광 파트너
        {partnerCleaningFrequency && (
          <>
            <span aria-hidden className="opacity-50">
              ·
            </span>
            <span>{partnerCleaningFrequency} 전문 청소</span>
          </>
        )}
      </span>
    </div>
  );
}
