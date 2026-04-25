import "server-only";
import { Timestamp, type DocumentData } from "firebase-admin/firestore";
import { adminDb } from "./admin";
import type { ReviewView } from "@/types/review";

const COLLECTION = "reviews";
const col = () => adminDb.collection(COLLECTION);

/**
 * 이름 마스킹:
 *   - 빈 값 → "익명"
 *   - 1자 → 그대로
 *   - 2자 → "X*"
 *   - 3자 이상 → "X*X" (첫 + 마지막 사이에 *)
 */
export function maskName(displayName: string | undefined): string {
  if (!displayName) return "익명";
  const s = displayName.trim();
  if (s.length === 0) return "익명";
  if (s.length === 1) return s;
  if (s.length === 2) return `${s[0]}*`;
  return `${s[0]}*${s[s.length - 1]}`;
}

/**
 * reviews의 clientUid → users.displayName 조회 후 mask.
 * **N+1 주의**: 리뷰 N개 × users.get N번. limit ≤ 10 전제.
 * v1.1c+ 에서는 batch get 또는 denormalize (review.clientDisplayName) 고려.
 */
async function resolveDisplayName(
  clientUid: string,
): Promise<string | undefined> {
  if (!clientUid) return undefined;
  try {
    const snap = await adminDb.collection("users").doc(clientUid).get();
    if (!snap.exists) return undefined;
    return (snap.data()?.displayName as string | undefined) ?? undefined;
  } catch {
    return undefined;
  }
}

export const reviewRepository = {
  async listByProvider(
    providerId: string,
    limit = 10,
  ): Promise<ReviewView[]> {
    const snap = await col()
      .where("providerId", "==", providerId)
      .orderBy("createdAt", "desc")
      .limit(limit)
      .get();
    const rows = snap.docs.map((d) => ({ id: d.id, data: d.data() }));
    const names = await Promise.all(
      rows.map((r) => resolveDisplayName(String(r.data.clientUid ?? ""))),
    );
    return rows.map(({ id, data }, i) => ({
      id,
      providerId: String(data.providerId ?? ""),
      clientMask: maskName(names[i]),
      bookingId: (data.bookingId as string | null | undefined) ?? null,
      rating: Number(data.rating ?? 0),
      text: String(data.text ?? ""),
      createdAt:
        (data.createdAt as Timestamp | undefined)?.toDate?.() ?? new Date(),
      providerReply:
        (data.providerReply as string | null | undefined) ?? null,
    }));
  },
};
