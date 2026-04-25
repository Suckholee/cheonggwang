/**
 * urlHash 기반 중복 제거. 이미 Firestore에 저장되어 있는 해시 집합(existingHashes)과
 * 이번 수집 배치 내 중복을 동시에 제거한다.
 *
 * 순수 함수 — Firestore 읽기는 호출자(usecase layer)가 수행한 뒤 전달.
 * 제네릭으로 RawSource/NormalizedSource 어느 쪽이든 타입 보존.
 */
export function dedupByUrlHash<T extends { urlHash: string }>(
  sources: T[],
  existingHashes: ReadonlySet<string>
): T[] {
  const seenThisBatch = new Set<string>();
  const result: T[] = [];
  for (const s of sources) {
    if (existingHashes.has(s.urlHash)) continue;
    if (seenThisBatch.has(s.urlHash)) continue;
    seenThisBatch.add(s.urlHash);
    result.push(s);
  }
  return result;
}
