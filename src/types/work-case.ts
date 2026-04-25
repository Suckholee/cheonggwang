import type { QuoteCategory } from "@/domain/quote-category";
import type { Photo } from "@/types/page";

export interface WorkCase {
  id: string;
  providerId: string;
  category: QuoteCategory;
  /** "32평", "벽걸이 2", "곰팡이" 등 자유 텍스트 크기 표기 */
  sizeLabel: string;
  beforePhoto: Photo;
  afterPhoto: Photo;
  memo?: string | null;
  completedAt: Date;
  /** v1.3+ booking feature에서 자동 연결 */
  bookingId?: string | null;
  createdAt: Date;
}
