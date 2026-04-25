"use server";

import { cookies } from "next/headers";
import { FieldValue } from "firebase-admin/firestore";
import { nanoid } from "nanoid";
import { adminAuth, adminDb } from "@/lib/firebase/admin";
import {
  SESSION_COOKIE_NAME,
  createSessionCookie,
} from "@/lib/firebase/auth-admin";
import { SESSION_COOKIE_MAX_AGE_SEC } from "@/domain/constants";
import { checkAndIncrement } from "@/lib/firebase/rate-limit";
import { isSyntheticEmail } from "@/lib/auth/username";
import {
  submitPartnerApplicationInputSchema,
  type SubmitPartnerApplicationInput,
} from "@/domain/partner-application-schema";
import {
  AppError,
  toActionError,
  type ActionResult,
} from "@/lib/errors";
import type { QuoteCategory } from "@/domain/quote-category";

/**
 * v1.9 partner-application · §3 — 의뢰업체 등록 신청 server action.
 *
 * Flow (provider-signup-actions.ts 패턴 모방, R1 client-first):
 *   1. zod validate (idToken + 매장 정보)
 *   2. verifyIdToken → uid, email
 *   3. real email 강제 (R2 — synthetic reject)
 *   4. rate-limit (email key, R8 / H8 결의 — IP 키는 v2)
 *   5. Firestore TX:
 *      - tx.get(applicants where ownerUid) — race-safe (H3)
 *      - tx.get(users) — userSnap.exists 명시 (H2)
 *      - existing pending/approved → ALREADY_REGISTERED 409 (R6)
 *      - existing rejected → reopen (R14)
 *      - no existing → create + users merge
 *   6. session cookie set (auto sign-in)
 */

const SIGNUP_RATE_LIMIT = 3;
const SIGNUP_RATE_WINDOW_MS = 60 * 60 * 1000;

export async function submitPartnerApplication(
  rawInput: SubmitPartnerApplicationInput,
): Promise<ActionResult<{ applicantId: string; redirectTo: string }>> {
  try {
    // 1. zod
    const input = submitPartnerApplicationInputSchema.parse(rawInput);

    // 2. verify
    const decoded = await adminAuth.verifyIdToken(input.idToken, true);
    const { uid, email } = decoded;
    if (!email) {
      throw new AppError("UNAUTHORIZED", "계정 정보가 확인되지 않았습니다");
    }

    // 3. real email 강제 (R2)
    if (isSyntheticEmail(email)) {
      throw new AppError(
        "INVALID_INPUT",
        "외부 이메일 계정으로만 신청할 수 있습니다",
      );
    }

    // 4. rate-limit (email key, H8 결의)
    await checkAndIncrement(
      `signup-partner:e:${email}`,
      SIGNUP_RATE_LIMIT,
      SIGNUP_RATE_WINDOW_MS,
    );

    const applicantsCol = adminDb.collection("partnerApplicants");
    const usersCol = adminDb.collection("users");

    let applicantId = "";

    // 5. TX
    await adminDb.runTransaction(async (tx) => {
      // H3 — race-safe TX query
      const existingSnap = await tx.get(
        applicantsCol.where("ownerUid", "==", uid).limit(1),
      );

      // H2 — userSnap 명시 lookup
      const userRef = usersCol.doc(uid);
      const userSnap = await tx.get(userRef);

      if (!existingSnap.empty) {
        const existing = existingSnap.docs[0];
        const existingData = existing.data();
        const status = existingData.status as string | undefined;
        if (status === "pending") {
          throw new AppError(
            "ALREADY_REGISTERED",
            "이미 검토 중인 신청이 있습니다",
          );
        }
        if (status === "approved") {
          throw new AppError(
            "ALREADY_REGISTERED",
            "이미 승인된 의뢰업체 계정입니다",
          );
        }
        // rejected → reopen (R14)
        tx.update(existing.ref, {
          status: "pending",
          reviewedAt: null,
          reviewedBy: null,
          rejectReason: null,
          partnerId: null,
          appliedAt: FieldValue.serverTimestamp(),
          businessName: input.businessName,
          phone: input.phone ?? null,
          category: (input.category as QuoteCategory | undefined) ?? null,
          regionLabel: input.regionLabel ?? null,
          intro: input.intro ?? null,
        });
        applicantId = existing.id;
      } else {
        // 신규
        applicantId = nanoid(12);
        const ref = applicantsCol.doc(applicantId);
        tx.create(ref, {
          ownerUid: uid,
          businessName: input.businessName,
          email,
          phone: input.phone ?? null,
          category: (input.category as QuoteCategory | undefined) ?? null,
          regionLabel: input.regionLabel ?? null,
          intro: input.intro ?? null,
          status: "pending",
          appliedAt: FieldValue.serverTimestamp(),
          reviewedAt: null,
          reviewedBy: null,
          rejectReason: null,
          partnerId: null,
        });
      }

      // users doc merge (provider-signup 패턴)
      const userPayload: Record<string, unknown> = {
        email,
        displayName: input.businessName,
        roles: FieldValue.arrayUnion("client"),
      };
      if (!userSnap.exists) {
        userPayload.isCheonggwangPartner = false;
        userPayload.createdAt = FieldValue.serverTimestamp();
      }
      tx.set(userRef, userPayload, { merge: true });
    });

    // 6. session cookie (auto sign-in)
    const session = await createSessionCookie(input.idToken);
    const jar = await cookies();
    jar.set(SESSION_COOKIE_NAME, session, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: SESSION_COOKIE_MAX_AGE_SEC,
    });

    return {
      ok: true,
      data: {
        applicantId,
        redirectTo: "/signup-partner/submitted",
      },
    };
  } catch (e) {
    return toActionError(e);
  }
}
