"use server";

import { cookies } from "next/headers";
import { FieldValue } from "firebase-admin/firestore";
import { adminAuth, adminDb } from "@/lib/firebase/admin";
import {
  SESSION_COOKIE_NAME,
  createSessionCookie,
} from "@/lib/firebase/auth-admin";
import { SESSION_COOKIE_MAX_AGE_SEC } from "@/domain/constants";
import { checkAndIncrement } from "@/lib/firebase/rate-limit";
import { sendWelcomeEmail } from "@/lib/email/welcome-email";
import { sendAdminAlert } from "@/lib/email/admin-alert-email";
import {
  registerProviderInputSchema,
  type RegisterProviderInput,
} from "@/domain/provider-signup-schema";
import {
  isSyntheticEmail,
  syntheticEmailToUsername,
} from "@/lib/auth/username";
import {
  AppError,
  actionError,
  toActionError,
  type ActionResult,
} from "@/lib/errors";

const SIGNUP_RATE_LIMIT = 3;
const SIGNUP_RATE_WINDOW_MS = 60 * 60 * 1000;

export async function registerProvider(
  rawInput: RegisterProviderInput,
): Promise<ActionResult<{ providerId: string }>> {
  try {
    // 1. Zod 검증
    const input = registerProviderInputSchema.parse(rawInput);

    // 2. idToken 검증
    const decoded = await adminAuth.verifyIdToken(input.idToken, true);
    const { uid, email } = decoded;
    if (!email) {
      throw new AppError("UNAUTHORIZED", "계정 정보가 확인되지 않았습니다");
    }

    // v1.6 (post-merge): 합성 이메일이면 username 추출, 외부 이메일 발송 대상에선 제외.
    const synthetic = isSyntheticEmail(email);
    const username = synthetic ? syntheticEmailToUsername(email) : null;
    const contactEmailForRecord = synthetic ? "" : email;
    const rateLimitKey = synthetic ? `signup:u:${username}` : `signup:${email}`;

    // 3. Rate limit (signup 기준 1시간 3건)
    await checkAndIncrement(
      rateLimitKey,
      SIGNUP_RATE_LIMIT,
      SIGNUP_RATE_WINDOW_MS,
    );

    // 4-5. Firestore transaction
    //  - M1: providerId를 외부 변수에 capture (globalThis 안티패턴 제거)
    //  - M2: 중복 provider 체크를 TX 내부에서 tx.get(query)
    //  - M3: users.createdAt은 기존 doc 없을 때만 set (기존 client createdAt 보존)
    const providersCol = adminDb.collection("providers");
    const usersCol = adminDb.collection("users");

    let providerId = "";
    const ownerQuery = providersCol
      .where("ownerUid", "==", uid)
      .limit(1);

    await adminDb.runTransaction(async (tx) => {
      // 중복 provider 체크 (race-safe, TX 내부)
      const existing = await tx.get(ownerQuery);
      if (!existing.empty) {
        throw new AppError(
          "ALREADY_REGISTERED",
          "이미 청명으로 가입된 계정입니다",
        );
      }

      // 기존 users doc 존재 여부 확인 (createdAt 보존)
      const userRef = usersCol.doc(uid);
      const userSnap = await tx.get(userRef);

      // providers doc 선발급 id로 write
      const providerRef = providersCol.doc();
      providerId = providerRef.id;

      tx.create(providerRef, {
        ownerUid: uid,
        companyName: input.companyName,
        categories: [input.primaryCategory],
        regions: [],
        contactEmail: contactEmailForRecord,
        contactPhone: input.contactPhone,
        description: null,
        isCheonggwangOwned: false,
        insured: false,
        insuranceAmount: null,
        verified: false,
        pageId: null,
        rating: null,
        reviewCount: null,
        responseTimeHours: null,
        yearsOfExperience: null,
        isAvailable: true,
        priceBook: [],
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });

      // users merge (roles arrayUnion, providerId back-fill, contactPhone)
      const userPayload: Record<string, unknown> = {
        email: contactEmailForRecord,
        username: username ?? "",
        displayName: input.companyName,
        roles: FieldValue.arrayUnion("provider"),
        providerId,
        contactPhone: input.contactPhone,
      };
      if (!userSnap.exists) {
        userPayload.isCheonggwangPartner = false;
        userPayload.createdAt = FieldValue.serverTimestamp();
      }
      tx.set(userRef, userPayload, { merge: true });
    });

    // 6. 이메일 (graceful — 실패해도 signup 성공)
    // v1.6 (post-merge): 합성 이메일이면 환영메일 스킵 (수신함 없음).
    //  관리자 알림은 유지하되, email 자리에 "아이디: {username}" 플레이스홀더 사용.
    const operatorEmail = process.env.OPERATOR_EMAIL;
    type EmailResult = { ok: true } | { ok: false; error: string };
    const emailTasks: Promise<EmailResult>[] = [];
    if (!synthetic) {
      emailTasks.push(sendWelcomeEmail(email, input.companyName));
    }
    if (operatorEmail) {
      emailTasks.push(
        sendAdminAlert(operatorEmail, {
          providerId,
          companyName: input.companyName,
          email: synthetic ? `[아이디] ${username}` : email,
          contactPhone: input.contactPhone,
          primaryCategory: input.primaryCategory,
          marketingAgreed: input.marketingAgreed === true,
        }),
      );
    }
    const emailResults = await Promise.allSettled(emailTasks);
    emailResults.forEach((r, i) => {
      if (r.status === "rejected") {
        console.warn(
          `[provider-signup] email[${i}] 발송 실패:`,
          r.reason,
        );
      } else if (!r.value.ok) {
        console.warn(
          `[provider-signup] email[${i}] 발송 실패:`,
          r.value.error,
        );
      }
    });

    // 7. Session cookie 설정 (즉시 로그인 상태)
    const session = await createSessionCookie(input.idToken);
    const jar = await cookies();
    jar.set(SESSION_COOKIE_NAME, session, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: SESSION_COOKIE_MAX_AGE_SEC,
    });

    // 8. v1.6 샘플 고객 자동 견적 요청 (데모). 실패해도 가입 흐름엔 영향 없음.
    try {
      const { triggerSampleQuoteRequests } = await import(
        "@/lib/quote/sample-quote-request-generator"
      );
      await triggerSampleQuoteRequests({
        providerId,
        providerCategories: [input.primaryCategory],
        maxCustomers: 4,
      });
    } catch (err) {
      console.warn("[sample-requests] trigger failed (non-fatal)", err);
    }

    // 9. ok
    return { ok: true, data: { providerId } };
  } catch (e) {
    // Zod issues
    if (typeof e === "object" && e !== null && "issues" in e) {
      return actionError("INVALID_INPUT", "입력 정보가 올바르지 않습니다");
    }
    return toActionError(e);
  }
}
