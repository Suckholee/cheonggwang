import "server-only";
import { adminAuth } from "./admin";
import {
  SESSION_COOKIE_MAX_AGE_SEC,
  SESSION_COOKIE_NAME,
} from "@/domain/constants";

export { SESSION_COOKIE_NAME };

export async function createSessionCookie(idToken: string): Promise<string> {
  const expiresIn = SESSION_COOKIE_MAX_AGE_SEC * 1000;
  return adminAuth.createSessionCookie(idToken, { expiresIn });
}

export async function verifySessionCookie(
  cookie: string | undefined
): Promise<string> {
  if (!cookie) throw new Error("UNAUTHORIZED");
  try {
    const decoded = await adminAuth.verifySessionCookie(cookie, true);
    return decoded.uid;
  } catch {
    throw new Error("UNAUTHORIZED");
  }
}

export async function tryVerifySessionCookie(
  cookie: string | undefined
): Promise<string | null> {
  if (!cookie) return null;
  try {
    const decoded = await adminAuth.verifySessionCookie(cookie, true);
    return decoded.uid;
  } catch {
    return null;
  }
}
