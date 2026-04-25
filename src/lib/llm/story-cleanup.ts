import "server-only";
import { adminStorage, getStorageBucketName } from "@/lib/firebase/admin";

/**
 * v1.6 · §5.2 C5 — hygiene 실패 또는 생성 중단 시 Storage의 스토리 사진 일괄 삭제.
 * `/stories/{uid}/{storyId}/` 디렉터리 전체 제거.
 *
 * 비동기 삭제 (.catch에서 묶여 호출됨) — 실패해도 main flow에 영향 없음.
 */
export async function cleanupStoryPhotos(
  uid: string,
  storyId: string,
): Promise<void> {
  const bucket = adminStorage.bucket(getStorageBucketName());
  const prefix = `stories/${uid}/${storyId}/`;
  await bucket.deleteFiles({ prefix });
}
