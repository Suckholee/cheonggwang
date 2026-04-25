import type { UserProfile } from "@/types/page";
import type { PartnerApplicantStatus } from "@/types/partner-applicant";

/**
 * v1.10 partner-issue-from-users · §2 — admin 의뢰업체 발급 콘솔용 타입.
 * UserProfile + 발급/신청 상태 플래그.
 */
export interface ClientWithIssuanceStatus {
  user: UserProfile;
  /** 이미 partner 발급된 사용자라면 partnerId, 아니면 null */
  partnerId: string | null;
  /** pending applicant 상태이면 'pending', 아니면 null */
  applicantStatus: PartnerApplicantStatus | null;
}

export type ClientSortMode = "latest" | "name";

export interface ClientDateRange {
  /** ISO YYYY-MM-DD (inclusive) — Asia/Seoul 자정 기준 변환 */
  fromYmd: string;
  toYmd: string;
}

export interface ListClientsPageInput {
  cursor: string | null;
  sort: ClientSortMode;
  dateRange: ClientDateRange | null;
}

export interface ListClientsPageResult {
  items: ClientWithIssuanceStatus[];
  nextCursor: string | null;
  hasMore: boolean;
}

/**
 * Cursor 형식 (§2.2):
 *   sort='latest': base64(`${createdAtMs}:${uid}`)
 *   sort='name':   base64(`${displayName}:${uid}`)
 *
 * H1 결의: lastIndexOf(":")로 split. uid는 Firebase Auth UID(alphanumeric)라 콜론 없음.
 *         displayName이 빈 문자열이어도 idx === 0은 valid (`if (idx < 0)`).
 */
export function encodeCursor(
  sort: ClientSortMode,
  lastDoc: { createdAt: Date; uid: string; displayName: string },
): string {
  const payload =
    sort === "latest"
      ? `${lastDoc.createdAt.getTime()}:${lastDoc.uid}`
      : `${lastDoc.displayName}:${lastDoc.uid}`;
  return Buffer.from(payload, "utf-8").toString("base64");
}

export function decodeCursor(
  sort: ClientSortMode,
  token: string | null,
): { primary: string | number; uid: string } | null {
  if (!token) return null;
  try {
    const raw = Buffer.from(token, "base64").toString("utf-8");
    const idx = raw.lastIndexOf(":");
    if (idx < 0) return null;
    const primaryRaw = raw.slice(0, idx);
    const uid = raw.slice(idx + 1);
    if (!uid) return null;
    if (sort === "latest") {
      const n = Number(primaryRaw);
      if (!Number.isFinite(n)) return null;
      return { primary: n, uid };
    }
    return { primary: primaryRaw, uid };
  } catch {
    return null;
  }
}
