/**
 * v1.6 (post-merge) · ID 기반 로그인을 위한 합성 이메일 변환.
 *
 * 청광은 사용자에게 이메일 대신 "아이디"를 받고, 내부적으로 Firebase Auth가 요구하는
 * 이메일 형식으로 변환해 사용함. 도메인은 `.auth` (reserved TLD) 를 써서
 * 실제 메일 주소와 충돌 불가.
 *
 * 장점:
 *   - Firebase Auth 의 PBKDF2 password hashing · session · rate limit 그대로 활용
 *   - 사용자에겐 아이디만 노출 (UX 단순)
 *
 * 제약:
 *   - 이메일로 비번 재설정 불가 (합성 주소는 실제 메일함이 없음) → 관리자 개입
 *   - 이메일 인증 메일도 못 감 (건너뛰어야 함)
 */

export const SYNTHETIC_EMAIL_DOMAIN = "cheonggwang.auth";

const USERNAME_RE = /^[a-z][a-z0-9_]{3,19}$/;

/** 예약어 · 분쟁 소지가 있는 이름 차단 */
const RESERVED_USERNAMES = new Set([
  "admin",
  "administrator",
  "root",
  "system",
  "support",
  "help",
  "official",
  "cheonggwang",
  "cheongmyeong",
  "청광",
  "운영자",
  "test",
  "null",
  "undefined",
]);

/** 정규화 (대문자 → 소문자, 공백 제거). 사용자가 대문자로 입력해도 OK. */
export function normalizeUsername(raw: string): string {
  return raw.trim().toLowerCase();
}

/** 아이디 형식/예약어 검증. OK 면 normalized 반환, 아니면 사람이 읽을 사유 throw. */
export function validateUsername(raw: string): string {
  const normalized = normalizeUsername(raw);
  if (!normalized) {
    throw new Error("아이디를 입력해 주세요");
  }
  if (normalized.length < 4) {
    throw new Error("아이디는 4자 이상이어야 합니다");
  }
  if (normalized.length > 20) {
    throw new Error("아이디는 20자 이하여야 합니다");
  }
  if (!USERNAME_RE.test(normalized)) {
    throw new Error(
      "아이디는 영문 소문자로 시작하고 영문·숫자·_ 만 사용할 수 있어요",
    );
  }
  if (RESERVED_USERNAMES.has(normalized)) {
    throw new Error("사용할 수 없는 아이디입니다");
  }
  return normalized;
}

/** ID → 합성 이메일. Firebase Auth `createUser/signIn` 계열에 직접 전달. */
export function usernameToSyntheticEmail(username: string): string {
  return `${normalizeUsername(username)}@${SYNTHETIC_EMAIL_DOMAIN}`;
}

/** 합성 이메일인지 판별 (레거시 실제 이메일과 구분). */
export function isSyntheticEmail(email: string | null | undefined): boolean {
  return !!email && email.toLowerCase().endsWith(`@${SYNTHETIC_EMAIL_DOMAIN}`);
}

/** 합성 이메일 → 원본 ID. 레거시 실제 이메일이면 null 반환. */
export function syntheticEmailToUsername(
  email: string | null | undefined,
): string | null {
  if (!isSyntheticEmail(email)) return null;
  return (email as string).split("@")[0];
}
