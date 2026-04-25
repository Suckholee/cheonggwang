/**
 * v1.6 Phase 4.5 — 고객 스크랩북 아이템.
 *
 * 고객이 본인 영역에서 사진+메모를 쌓아두고,
 * 정기 배치(크론)가 pending 항목을 generateStoryPost에 넘겨 공개 feed에 발행.
 */

export type StoryScrapbookStatus =
  | "pending" // 업로드됨, 배치 대기
  | "processing" // 배치가 작업 중
  | "published" // 공개 발행 완료
  | "failed"; // hygiene 실패 등

export interface StoryScrapbookItem {
  id: string;
  ownerUid: string;
  photoUrls: string[]; // 1~5개 Firebase Storage URL
  storyId: string; // Storage 디렉터리 키 (/stories/{uid}/{storyId}/)
  memo: string | null;
  uploadedAt: Date;
  status: StoryScrapbookStatus;
  batchId: string | null;
  processedAt: Date | null;
  publishedPostId: string | null;
  publishedSlug: string | null;
  failureReason: string | null;
}
