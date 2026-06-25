"use server";

import { cookies } from "next/headers";
import { verifySessionCookie } from "@/lib/firebase/auth-admin";
import { SESSION_COOKIE_NAME } from "@/domain/constants";
import { checkAndIncrement } from "@/lib/firebase/rate-limit";
import { providerRepository } from "@/lib/firebase/provider-repository";
import { quoteRequestRepository } from "@/lib/firebase/quote-request-repository";
import { ensureClientRole } from "@/lib/firebase/user-roles";
import { sendQuoteEmail } from "@/lib/email/quote-email";
import {
  quoteRequestInputSchema,
  type QuoteRequestInput,
} from "@/domain/quote-schemas";
import type { QuoteRequest } from "@/types/quote-request";
import {
  actionError,
  toActionError,
  type ActionResult,
} from "@/lib/errors";

const QUOTE_RATE_LIMIT = 5;
const QUOTE_RATE_WINDOW_MS = 60 * 60 * 1000;

async function requireUid(): Promise<string> {
  const jar = await cookies();
  const session = jar.get(SESSION_COOKIE_NAME)?.value;
  return verifySessionCookie(session);
}

export type SubmitQuoteInput = QuoteRequestInput;

export async function submitQuoteRequest(
  rawInput: SubmitQuoteInput,
): Promise<ActionResult<{ requestId: string }>> {
  try {
    // 1. auth
    const clientUid = await requireUid();

    // 2. rate limit (5건/시간)
    await checkAndIncrement(
      `quote:${clientUid}`,
      QUOTE_RATE_LIMIT,
      QUOTE_RATE_WINDOW_MS,
    );

    // 3. zod 검증
    const input = quoteRequestInputSchema.parse(rawInput);

    // 4. client role 부여 (멱등)
    await ensureClientRole(clientUid);

    // 5. 매칭 대상 청명 조회
    const matchedProviders = await providerRepository.listByCategory(input.category);

    // 5a. preferredProviderId가 있으면 해당 청명을 결과 맨 앞에 배치 (중복 dedup)
    let providers = matchedProviders;
    if (input.preferredProviderId) {
      const preferredId = input.preferredProviderId;
      const alreadyMatched = providers.find((p) => p.id === preferredId);
      if (alreadyMatched) {
        // 이미 category 매칭에 있으면 맨 앞으로 이동
        providers = [
          alreadyMatched,
          ...providers.filter((p) => p.id !== preferredId),
        ];
      } else {
        // 없으면 fetch 후 맨 앞에 삽입 (category 다른 경우 fallback)
        const preferred = await providerRepository.get(preferredId);
        if (preferred) providers = [preferred, ...providers];
      }
    }

    // 6. Firestore 저장 (pre-issued requestId)
    const preferredDate = input.preferredDate
      ? new Date(input.preferredDate)
      : null;

    await quoteRequestRepository.create(input.requestId, {
      clientUid,
      clientName: input.clientName,
      category: input.category,
      subService: input.subService,
      region: input.region,
      size: input.size,
      preferredDate,
      preferredTime: input.preferredTime,
      hasElevator: input.hasElevator,
      parkingAvailable: input.parkingAvailable,
      contactPhone: input.contactPhone,
      photos: input.photos,
      note: input.note,
      address: input.address,
      notifiedProviderIds: [],
      status: "submitted",
      baseAmount: input.baseAmount,
      optionsAmount: input.optionsAmount,
      totalAmount: input.totalAmount,
      optionsList: input.optionsList,
      quoteType: input.quoteType,
      frequency: input.frequency,
      frequencyCount: input.frequencyCount,
    });

    // 7. 이메일 발송 (graceful — 실패해도 저장은 성공)
    const emailRequest: QuoteRequest = {
      id: input.requestId,
      clientUid,
      clientName: input.clientName,
      category: input.category,
      subService: input.subService,
      region: input.region,
      size: input.size,
      preferredDate,
      preferredTime: input.preferredTime,
      hasElevator: input.hasElevator,
      parkingAvailable: input.parkingAvailable,
      contactPhone: input.contactPhone,
      photos: input.photos,
      note: input.note,
      address: input.address,
      notifiedProviderIds: [],
      status: "submitted",
      createdAt: new Date(),
      baseAmount: input.baseAmount,
      optionsAmount: input.optionsAmount,
      totalAmount: input.totalAmount,
      optionsList: input.optionsList,
      quoteType: input.quoteType,
      frequency: input.frequency,
      frequencyCount: input.frequencyCount,
    };
    const photoUrls = input.photos.map((p) => p.url);

    const emailResults = await Promise.allSettled(
      providers.map((provider) =>
        sendQuoteEmail({ provider, request: emailRequest, photoUrls }),
      ),
    );

    const successfulIds: string[] = [];
    emailResults.forEach((result, i) => {
      const provider = providers[i];
      if (result.status === "fulfilled" && result.value.ok) {
        successfulIds.push(provider.id);
      } else {
        const reason =
          result.status === "rejected"
            ? String(result.reason)
            : result.value.ok
              ? ""
              : result.value.error;
        console.warn(
          `[quote-email] ${provider.id} (${provider.contactEmail}) 발송 실패: ${reason}`,
        );
      }
    });

    // 8. notifiedProviderIds 업데이트
    if (successfulIds.length > 0) {
      await quoteRequestRepository.update(input.requestId, {
        notifiedProviderIds: successfulIds,
      });
    }

    // 9. v1.6 샘플 청명 자동 견적 (데모 플로우). 실제 청명 흐름에 영향 없음.
    try {
      const { triggerSampleQuotes } = await import(
        "@/lib/quote/sample-quote-generator"
      );
      await triggerSampleQuotes({
        requestId: input.requestId,
        clientUid,
        category: input.category,
        region: input.region,
        size: input.size ?? null,
        note: input.note ?? null,
        maxProviders: 3,
      });
    } catch (err) {
      console.warn("[sample-quotes] trigger failed (non-fatal)", err);
    }

    // 10. ok
    return { ok: true, data: { requestId: input.requestId } };
  } catch (e) {
    // Zod issues
    if (typeof e === "object" && e !== null && "issues" in e) {
      return actionError("INVALID_INPUT", "요청 정보가 올바르지 않습니다");
    }
    return toActionError(e);
  }
}

export async function submitQuoteRequestReview(
  requestId: string,
  review: { rating: number; comment: string; wouldReuse: string }
): Promise<ActionResult<null>> {
  try {
    const clientUid = await requireUid();
    const req = await quoteRequestRepository.get(requestId);
    if (!req) return actionError("NOT_FOUND", "요청을 찾을 수 없습니다.");
    if (req.clientUid !== clientUid) return actionError("FORBIDDEN", "권한이 없습니다.");
    
    await quoteRequestRepository.update(requestId, {
      customerReview: review
    });
    
    return { ok: true, data: null };
  } catch (err) {
    return toActionError(err);
  }
}
