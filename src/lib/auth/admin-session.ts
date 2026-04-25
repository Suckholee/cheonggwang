import "server-only";
import { SignJWT, jwtVerify, type JWTPayload } from "jose";

/**
 * v1.8 admin-console — admin session JWT (jose 기반).
 *
 *   - HS256 + ADMIN_SESSION_SECRET 32 bytes hex
 *   - issuer: 'cheonggwang-admin' (다른 JWT와 격리, R7)
 *   - kid: 'admin-v1' (회전 대비)
 *   - exp: 8h
 *
 * Edge·Node runtime 모두 호환 (Web Crypto 표준). jsonwebtoken 미사용.
 */

const ISSUER = "cheonggwang-admin";
const ALG = "HS256";
const KID = "admin-v1";
const TTL_SECONDS = 8 * 60 * 60;

function getSecretKey(): Uint8Array {
  const raw = process.env.ADMIN_SESSION_SECRET;
  if (!raw || raw.length < 32) {
    throw new Error(
      "ADMIN_SESSION_SECRET 미설정 또는 너무 짧음 (≥32 chars 필요)",
    );
  }
  return new TextEncoder().encode(raw);
}

interface AdminPayload extends JWTPayload {
  admin?: boolean;
}

/** admin 인증 토큰 발급. login 라우트에서만 호출. */
export async function signAdminToken(): Promise<string> {
  return await new SignJWT({ admin: true })
    .setProtectedHeader({ alg: ALG, kid: KID })
    .setIssuer(ISSUER)
    .setIssuedAt()
    .setExpirationTime(`${TTL_SECONDS}s`)
    .sign(getSecretKey());
}

/**
 * 토큰 검증. cookie value 또는 undefined 입력.
 * 유효한 admin 토큰이면 true, 그 외 false (예외 X — 분기 단순화).
 */
export async function verifyAdminToken(
  token: string | undefined | null,
): Promise<boolean> {
  if (!token) return false;
  try {
    const { payload } = await jwtVerify(token, getSecretKey(), {
      algorithms: [ALG],
      issuer: ISSUER,
    });
    return (payload as AdminPayload).admin === true;
  } catch {
    return false;
  }
}

export const ADMIN_SESSION_COOKIE = "admin_session";
export const ADMIN_SESSION_MAX_AGE_SEC = TTL_SECONDS;
