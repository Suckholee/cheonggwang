import type { QuoteCategory } from "@/domain/quote-category";
import type { QuoteStatus } from "@/domain/quote-status";
import type { RoomType } from "@/domain/room-type";
import type { Photo, Region } from "@/types/page";

export type { QuoteStatus } from "@/domain/quote-status";

export interface QuoteRequest {
  id: string;
  clientUid: string;
  category: QuoteCategory;
  region: Region;
  size: number | null;
  /** v1.1 quote-response 확장 · Figma "32평·투룸" 표시용 */
  roomType?: RoomType;
  preferredDate: Date | null;
  contactPhone: string;
  photos: Photo[];
  note: string | null;
  notifiedProviderIds: string[];
  status: QuoteStatus;
  createdAt: Date;
}
