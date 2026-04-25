import type { Category } from "../types/shared";

/**
 * NaverSearchAdapter — 업종별 검색 쿼리 (design §5.1).
 * 네이버 블로그 검색 API (openapi.naver.com/v1/search/blog.json).
 * 본문은 수집하지 않고 title + description만 사용 (T1 안전 티어).
 */
export const NAVER_QUERIES: Record<Category, string[]> = {
  restaurant: [
    "동네 맛집",
    "숨은 맛집",
    "점심 맛집",
    "가성비 식당",
    "가족 모임 식당",
    "분위기 좋은 레스토랑",
    "브런치 맛집",
  ],
  salon: [
    "잘하는 미용실",
    "머릿결 미용실",
    "맞춤 컷 미용실",
    "염색 잘하는 곳",
    "펌 잘하는 미용실",
    "1:1 미용실",
  ],
  cafe: [
    "분위기 좋은 카페",
    "디저트 맛집 카페",
    "작업하기 좋은 카페",
    "조용한 카페",
    "스페셜티 카페",
    "인스타 감성 카페",
  ],
};

/**
 * TistoryRssAdapter — 운영자 큐레이션 공개 RSS 목록.
 * 설계 승인 후 운영자가 카테고리당 10~15개 피드 URL을 추가한다.
 * 초기에는 빈 배열이어도 NaverSearchAdapter만으로 파이프라인이 동작.
 */
export const TISTORY_FEEDS: Record<Category, string[]> = {
  restaurant: [],
  salon: [],
  cafe: [],
};

/**
 * WordPressRssAdapter — 운영자 큐레이션 공개 RSS 목록.
 * 패턴: `{domain}/feed/` 또는 `{domain}/?feed=rss2`
 */
export const WORDPRESS_FEEDS: Record<Category, string[]> = {
  restaurant: [],
  salon: [],
  cafe: [],
};
