import "server-only";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase/admin";
import { QUOTE_CATEGORY_LABELS, type QuoteCategory } from "@/domain/quote-category";

/**
 * v1.6 — 청명 가입 직후 샘플 고객들이 견적 요청을 자동으로 보낸다.
 *
 * 호출: provider-signup-actions.registerProvider TX 커밋 직후.
 * 동작:
 *   1. 신규 청명의 categories ∩ 샘플 고객 persona.interestedCategories 교집합 매칭
 *   2. 매칭된 샘플 고객 중 랜덤 3~5명 선택
 *   3. 각자의 persona 를 기반으로 quoteRequests 문서 1개씩 생성 (status=submitted)
 *   4. status 조정: 신규 청명이 /provider/requests 에서 바로 볼 수 있음
 *
 * 주의:
 *   - submitQuoteRequest 서버 액션을 타지 않음 → triggerSampleQuotes(다른 청명 자동 견적)와
 *     루프가 생기지 않음.
 *   - 이메일 발송·rate-limit 스킵 (시드 성격).
 *   - 실패해도 호출부 흐름엔 영향 없음.
 */

interface SamplePersona {
  age?: number;
  occupation?: string;
  household?: string;
  region?: string;
  goal?: string;
  interestedCategories?: QuoteCategory[];
  monthlyBudget?: number;
  oneLiner?: string;
}

interface SampleCustomer {
  uid: string;
  displayName: string;
  persona: SamplePersona;
}

// 거주·업장 형태별 평수 추정 (견적 요청 시 size 필드 채움)
function estimateSizeFromPersona(persona: SamplePersona, category: QuoteCategory): number {
  const region = (persona.region ?? "").toLowerCase();
  if (region.includes("원룸")) return 6 + Math.floor(Math.random() * 10); // 6~15
  if (region.includes("오피스텔")) return 10 + Math.floor(Math.random() * 12); // 10~21
  if (region.includes("주택")) return 25 + Math.floor(Math.random() * 20); // 25~44
  if (region.includes("매장") || region.includes("스튜디오") || region.includes("학원")) {
    return 15 + Math.floor(Math.random() * 30); // 15~44
  }
  if (region.includes("사무실") || region.includes("오피스")) {
    return 20 + Math.floor(Math.random() * 30);
  }
  if (region.includes("아파트")) return 24 + Math.floor(Math.random() * 20); // 24~43
  // category별 폴백
  if (category === "regular") return 20 + Math.floor(Math.random() * 20);
  if (category === "specialist") return 20 + Math.floor(Math.random() * 15);
  if (category === "special") return 18 + Math.floor(Math.random() * 20);
  return 20 + Math.floor(Math.random() * 15);
}

// persona.region("서울 강남구 ...") → {city, district}
function parseRegion(regionText: string | undefined): { city: string; district: string } {
  const fallback = { city: "서울특별시", district: "강남구" };
  if (!regionText) return fallback;
  const tokens = regionText.trim().split(/\s+/);
  if (tokens.length < 2) return fallback;
  // 첫 토큰: 시/도 약어 (서울, 경기, 인천 등) → 정식명 확장
  const cityAlias: Record<string, string> = {
    서울: "서울특별시",
    경기: "경기도",
    인천: "인천광역시",
    부산: "부산광역시",
    대구: "대구광역시",
    광주: "광주광역시",
    대전: "대전광역시",
    울산: "울산광역시",
  };
  const cityRaw = tokens[0];
  const city =
    cityAlias[cityRaw] ??
    (cityRaw.endsWith("도") ||
    cityRaw.endsWith("시") ||
    cityRaw.endsWith("광역시") ||
    cityRaw.endsWith("특별시")
      ? cityRaw
      : `${cityRaw}특별시`);
  const district = tokens[1];
  return { city, district };
}

// persona.goal 을 자연스러운 note 로 변환. goal이 있으면 그대로 사용(길이 trim).
// 없으면 템플릿 폴백.
function buildNote(persona: SamplePersona, category: QuoteCategory): string {
  const catLabel = QUOTE_CATEGORY_LABELS[category];
  const goal = (persona.goal ?? "").trim();
  if (goal.length >= 20 && goal.length <= 150) return goal;
  const oneLiner = persona.oneLiner ? `(${persona.oneLiner}) ` : "";
  return `${oneLiner}${catLabel} 견적 상담 부탁드립니다. ${persona.occupation ?? ""} 라 시간 여유가 많지 않은 편이에요.`.slice(0, 150);
}


export interface TriggerSampleRequestsInput {
  providerId: string;
  /** 신규 청명이 등록한 서비스 카테고리 */
  providerCategories: QuoteCategory[];
  /** 매칭 최대 고객 수 (기본 4) */
  maxCustomers?: number;
}

export async function triggerSampleQuoteRequests(
  input: TriggerSampleRequestsInput,
): Promise<{ created: number }> {
  try {
    const MAX = input.maxCustomers ?? 4;
    const providerCats = new Set(input.providerCategories);
    if (providerCats.size === 0) {
      return { created: 0 };
    }

    // 샘플 고객 조회 (persona.interestedCategories 는 array-contains-any 불가 조건이 있음 →
    // 전체 샘플 user 읽어서 인메모리 필터가 단순)
    const userSnap = await adminDb
      .collection("users")
      .where("isSample", "==", true)
      .get();

    const candidates: SampleCustomer[] = [];
    userSnap.docs.forEach((d) => {
      const data = d.data();
      if (data.providerId) return; // 청명 제외
      const persona = data.persona as Record<string, unknown> | undefined;
      if (!persona) return;
      const interested = Array.isArray(persona.interestedCategories)
        ? (persona.interestedCategories as QuoteCategory[])
        : [];
      if (!interested.some((c) => providerCats.has(c))) return;
      candidates.push({
        uid: d.id,
        displayName: String(data.displayName ?? "고객"),
        persona: {
          age: typeof persona.age === "number" ? persona.age : undefined,
          occupation:
            typeof persona.occupation === "string"
              ? persona.occupation
              : undefined,
          household:
            typeof persona.household === "string"
              ? persona.household
              : undefined,
          region:
            typeof persona.region === "string" ? persona.region : undefined,
          goal: typeof persona.goal === "string" ? persona.goal : undefined,
          interestedCategories: interested,
          monthlyBudget:
            typeof persona.monthlyBudget === "number"
              ? persona.monthlyBudget
              : undefined,
          oneLiner:
            typeof persona.oneLiner === "string" ? persona.oneLiner : undefined,
        },
      });
    });

    if (candidates.length === 0) {
      console.log(
        `[sample-requests] no matching sample customers · providerId=${input.providerId}`,
      );
      return { created: 0 };
    }

    const picked = candidates.sort(() => Math.random() - 0.5).slice(0, MAX);

    // 각 고객별 요청 생성 (병렬 OK, 서로 독립)
    // thread 는 일부러 생성하지 않음 — 실제 마켓플레이스 플로우 처럼
    // 청명이 견적을 보낼 때(submitQuote) 자동 생성되는 구조를 유지.
    let created = 0;
    await Promise.all(
      picked.map(async (cust) => {
        try {
          const overlap = (cust.persona.interestedCategories ?? []).filter(
            (c) => providerCats.has(c),
          );
          const category =
            overlap[Math.floor(Math.random() * overlap.length)] ??
            input.providerCategories[0];

          const region = parseRegion(cust.persona.region);
          const size = estimateSizeFromPersona(cust.persona, category);
          const note = buildNote(cust.persona, category);

          const daysAhead = 2 + Math.floor(Math.random() * 8);
          const preferredDate = new Date();
          preferredDate.setDate(preferredDate.getDate() + daysAhead);

          const ref = adminDb.collection("quoteRequests").doc();
          await ref.set({
            clientUid: cust.uid,
            category,
            region,
            size,
            roomType: null,
            preferredDate: Timestamp.fromDate(preferredDate),
            contactPhone: "010-0000-0000",
            photos: [],
            note,
            notifiedProviderIds: [input.providerId],
            status: "submitted",
            createdAt: FieldValue.serverTimestamp(),
            isSampleAi: true,
          });
          created++;
          console.log(
            `[sample-requests] ${cust.displayName} (${category} ${size}평 ${region.district}) → provider ${input.providerId}`,
          );
        } catch (err) {
          console.warn(
            `[sample-requests] ${cust.displayName} failed:`,
            (err as Error)?.message ?? err,
          );
        }
      }),
    );

    return { created };
  } catch (err) {
    console.warn("[sample-requests] fatal", err);
    return { created: 0 };
  }
}
