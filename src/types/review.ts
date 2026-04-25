export interface Review {
  id: string;
  providerId: string;
  /** Firebase Auth uid · UI 노출은 clientMask (ReviewView) */
  clientUid: string;
  bookingId?: string | null;
  rating: number;       // 1~5
  text: string;
  createdAt: Date;
  /** v2+ 청명 답변 */
  providerReply?: string | null;
}

/** UI 노출 전용 · clientUid → clientMask (이*희 형식) */
export interface ReviewView {
  id: string;
  providerId: string;
  clientMask: string;
  bookingId?: string | null;
  rating: number;
  text: string;
  createdAt: Date;
  providerReply?: string | null;
}
