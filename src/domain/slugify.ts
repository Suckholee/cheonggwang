import { customAlphabet } from "nanoid";
import { SLUG_SUFFIX_LENGTH } from "./constants";

const ALPHANUM = "0123456789abcdefghijklmnopqrstuvwxyz";
export const nanoidShort = customAlphabet(ALPHANUM, SLUG_SUFFIX_LENGTH);

/**
 * 한글·공백·특수문자가 섞인 상호명을 URL-safe 슬러그로 변환.
 * 한글은 유지하되 URL 인코딩 후에도 읽히도록 전체를 ASCII-safe 형태로 정규화한다.
 * 결과가 비어있거나 너무 짧으면 'page'로 fallback.
 */
export function slugify(input: string): string {
  const trimmed = input.trim().toLowerCase();
  // NFKD 정규화 후 결합문자 제거 (한글은 자모 분리되지만 Hangul syllables은 유지 시도)
  const normalized = trimmed
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "");
  // 허용: a-z, 0-9, 한글 syllables, 하이픈으로 치환할 공백/언더스코어
  // 그 외 모든 문자는 제거
  const base = normalized
    .replace(/[\s_]+/g, "-")
    .replace(/[^a-z0-9\uac00-\ud7a3-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

  if (!base || base.length < 2) return "page";
  return base.slice(0, 40);
}

export function buildSlugCandidate(businessName: string): string {
  return `${slugify(businessName)}-${nanoidShort()}`;
}
