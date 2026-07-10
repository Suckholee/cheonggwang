"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { FieldValue } from "firebase-admin/firestore";
import { adminAuth, adminDb } from "@/lib/firebase/admin";
import {
  SESSION_COOKIE_NAME,
  createSessionCookie,
} from "@/lib/firebase/auth-admin";
import { SESSION_COOKIE_MAX_AGE_SEC } from "@/domain/constants";
import {
  isSyntheticEmail,
  syntheticEmailToUsername,
} from "@/lib/auth/username";

type ActionResult =
  | { ok: true }
  | { ok: false; code: string; message: string };

export async function signInWithEmail(idToken: string, role?: "customer" | "provider"): Promise<ActionResult> {
  if (!idToken || typeof idToken !== "string") {
    return { ok: false, code: "INVALID_INPUT", message: "ID 토큰이 없습니다" };
  }

  try {
    const decoded = await adminAuth.verifyIdToken(idToken, true);
    const { uid, email, name, phone_number } = decoded;

    // v1.6 (post-merge): 합성 이메일이면 username 추출해서 따로 저장.
    // 레거시 실제 이메일은 email 필드에 그대로 저장.
    const synthetic = isSyntheticEmail(email);
    const username = synthetic ? syntheticEmailToUsername(email) : null;

    const { fromE164 } = await import("@/lib/format/phone");
    const contactPhone = phone_number ? fromE164(phone_number) : "";

    const userRef = adminDb.collection("users").doc(uid);
    const snap = await userRef.get();
    if (!snap.exists) {
      await userRef.set({
        email: synthetic ? "" : (email ?? ""),
        username: username ?? "",
        displayName:
          name ?? username ?? (email ? email.split("@")[0] : "사용자"),
        isCheonggwangPartner: role === "provider",
        role: role ?? "customer",
        contactPhone,
        createdAt: FieldValue.serverTimestamp(),
      });
    } else {
      const updateData: Record<string, any> = {};
      if (username && !snap.data()?.username) {
        updateData.username = username;
      }
      if (contactPhone && !snap.data()?.contactPhone) {
        updateData.contactPhone = contactPhone;
      }
      if (Object.keys(updateData).length > 0) {
        await userRef.update(updateData);
      }
    }

    const session = await createSessionCookie(idToken);
    const jar = await cookies();
    jar.set(SESSION_COOKIE_NAME, session, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: SESSION_COOKIE_MAX_AGE_SEC,
    });
    return { ok: true };
  } catch (e) {
    const message =
      e instanceof Error ? e.message : "로그인에 실패했습니다";
    return { ok: false, code: "AUTH_FAILED", message };
  }
}

export async function signOut(): Promise<void> {
  const jar = await cookies();
  jar.delete(SESSION_COOKIE_NAME);
  redirect("/login");
}
