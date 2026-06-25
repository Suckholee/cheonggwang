import { Suspense } from "react";
import type { Metadata } from "next";
import { connection } from "next/server";
import { Info } from "lucide-react";
import { adminDb } from "@/lib/firebase/admin";
import { QUOTE_CATEGORY_EMOJIS, QUOTE_CATEGORY_LABELS, type QuoteCategory } from "@/domain/quote-category";
import { SampleBadge } from "@/components/ui/SampleBadge";
import { SampleLoginButton } from "@/components/auth/SampleLoginButton";

export const metadata: Metadata = {
  title: "관제 콘솔 · 청광",
  description:
    "청광 파트너사 및 가입 회원 현황 시연용 관제 콘솔입니다.",
  robots: { index: false },
};

interface SampleProvider {
  id: string;
  companyName: string;
  categories: QuoteCategory[];
  regions: string[];
  slogan: string | null;
  username: string;
  rating: number | null;
  reviewCount: number | null;
}

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
  username: string;
  persona: SamplePersona | null;
}

async function loadSampleAccounts(): Promise<{
  providers: SampleProvider[];
  customers: SampleCustomer[];
}> {
  const [provSnap, userSnap] = await Promise.all([
    adminDb.collection("providers").where("isSample", "==", true).get(),
    adminDb.collection("users").where("isSample", "==", true).get(),
  ]);

  const usernameByUid = new Map<string, string>();
  const customerCandidates: SampleCustomer[] = [];
  userSnap.docs.forEach((d) => {
    const data = d.data();
    const uid = d.id;
    const username = typeof data.username === "string" ? data.username : "";
    const displayName =
      typeof data.displayName === "string" ? data.displayName : "";
    usernameByUid.set(uid, username);
    // providerId 없는 샘플 사용자 → 고객
    if (!data.providerId) {
      const rawPersona = data.persona as Record<string, unknown> | undefined;
      const persona: SamplePersona | null = rawPersona
        ? {
            age:
              typeof rawPersona.age === "number" ? rawPersona.age : undefined,
            occupation:
              typeof rawPersona.occupation === "string"
                ? rawPersona.occupation
                : undefined,
            household:
              typeof rawPersona.household === "string"
                ? rawPersona.household
                : undefined,
            region:
              typeof rawPersona.region === "string"
                ? rawPersona.region
                : undefined,
            goal:
              typeof rawPersona.goal === "string"
                ? rawPersona.goal
                : undefined,
            interestedCategories: Array.isArray(rawPersona.interestedCategories)
              ? (rawPersona.interestedCategories as QuoteCategory[])
              : undefined,
            monthlyBudget:
              typeof rawPersona.monthlyBudget === "number"
                ? rawPersona.monthlyBudget
                : undefined,
            oneLiner:
              typeof rawPersona.oneLiner === "string"
                ? rawPersona.oneLiner
                : undefined,
          }
        : null;
      customerCandidates.push({ uid, displayName, username, persona });
    }
  });

  const providers: SampleProvider[] = provSnap.docs
    .map((d) => {
      const data = d.data();
      const regions = Array.isArray(data.regions)
        ? (data.regions as Array<{ city: string; district: string }>).map(
            (r) => `${r.city} ${r.district}`,
          )
        : [];
      return {
        id: d.id,
        companyName: String(data.companyName ?? "이름 없음"),
        categories: Array.isArray(data.categories) ? data.categories : [],
        regions,
        slogan:
          typeof data.slogan === "string" && data.slogan.trim()
            ? data.slogan
            : null,
        username: usernameByUid.get(String(data.ownerUid ?? "")) ?? "",
        rating:
          typeof data.rating === "number"
            ? Math.round(data.rating * 10) / 10
            : null,
        reviewCount:
          typeof data.reviewCount === "number" ? data.reviewCount : null,
      };
    })
    .sort((a, b) => a.companyName.localeCompare(b.companyName, "ko"));

  const customers = customerCandidates.sort((a, b) =>
    a.displayName.localeCompare(b.displayName, "ko"),
  );

  return { providers, customers };
}

export default function SampleAccountsPage() {
  return (
    <div className="mx-auto min-h-screen max-w-[480px] bg-[#f5f6f8] px-4 pt-2 pb-28 dark:bg-zinc-950">
      <header className="sticky top-0 z-50 -mx-4 mb-4 border-b border-white/60 bg-[#f4f9ff]/90 px-4 py-3 backdrop-blur dark:bg-zinc-900/90 dark:border-zinc-800">
        <h1 className="text-[20px] font-black tracking-tight text-zinc-900 dark:text-zinc-50">
          청광 매니저 관제 콘솔
        </h1>
        <p className="mt-1 text-[11px] font-bold text-zinc-500">
          시연 및 관제를 위해 매핑된 통합 계정/매니저 관제센터
        </p>
      </header>

      <section className="mb-4 rounded-[20px] border border-[#dbe8fb] bg-white p-4 text-[12px] leading-6 text-zinc-700 dark:border-zinc-850 dark:bg-zinc-900 dark:text-zinc-300 shadow-xs">
        <div className="flex items-start gap-2">
          <Info
            className="mt-0.5 h-4 w-4 shrink-0 text-[#2563EB]"
            aria-hidden
          />
          <div>
            <p className="font-bold text-zinc-900 dark:text-zinc-150">
              청광 파트너십 및 회원 관제 콘솔
            </p>
            <p className="mt-1 text-[11.5px] leading-relaxed font-semibold text-zinc-550 dark:text-zinc-400">
              본 시스템은 청광 파트너십 채널 및 계약 회원 관제용 콘솔입니다. 등록된 파트너(청명) 및 고객 데이터를 바탕으로 비즈니스 연동 세션을 진행할 수 있습니다.
            </p>
            <ul className="mt-2 list-disc pl-4 text-[11px] text-zinc-500 space-y-1">
              <li>실재 파트너사 및 회원들의 세션과 연동하여 실시간 대화 및 2단계 견적 프로세스를 완벽히 검증할 수 있습니다.</li>
              <li>
                각 카드를 선택하면 해당 파트너 또는 고객의 가입 세션으로 즉시 연동 전환됩니다.
              </li>
              <li>
                보안 및 우수 파트너 등급 구분을 위해 청광 공식 심사를 통과한 계정에는{" "}
                <SampleBadge size="sm" /> 공식 엠블럼 배지가 상시 부착되어 관리됩니다.
              </li>
            </ul>
          </div>
        </div>
      </section>

      <Suspense fallback={<Skeleton />}>
        <Body />
      </Suspense>
    </div>
  );
}

function Skeleton() {
  return (
    <div className="space-y-3" aria-label="불러오는 중">
      <div className="h-20 animate-pulse rounded-[20px] bg-zinc-100 dark:bg-zinc-900" />
      <div className="h-20 animate-pulse rounded-[20px] bg-zinc-100 dark:bg-zinc-900" />
      <div className="h-20 animate-pulse rounded-[20px] bg-zinc-100 dark:bg-zinc-900" />
    </div>
  );
}

async function Body() {
  // Next 16 cacheComponents: firebase-admin gRPC 가 crypto.randomBytes 를
  // 쓰는데, dynamic 컨텍스트임을 명시해야 prerender 에러가 나지 않음.
  await connection();
  const { providers, customers } = await loadSampleAccounts();
  return (
    <div className="space-y-6">
      <section>
        <div className="mb-2 flex items-baseline justify-between">
          <h2 className="text-[15px] font-bold">등록 파트너사 (청명)</h2>
          <span className="text-xs text-zinc-500">{providers.length}개</span>
        </div>
        {providers.length === 0 ? (
          <EmptyCard text="아직 등록된 파트너사 정보가 없습니다" />
        ) : (
          <ul className="space-y-2">
            {providers.map((p) => (
              <li
                key={p.id}
                className="rounded-[20px] border border-[#dbe8fb] bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="flex items-center gap-2 text-[15px] font-bold text-zinc-900 dark:text-zinc-50">
                        <span className="truncate">{p.companyName}</span>
                        <SampleBadge />
                      </p>
                      {p.username && (
                        <SampleLoginButton username={p.username} displayName={p.companyName} />
                      )}
                    </div>
                    {p.slogan && (
                      <p className="mt-0.5 truncate text-[12px] text-zinc-500">
                        {p.slogan}
                      </p>
                    )}
                  </div>
                  {p.rating !== null && (
                    <div className="shrink-0 text-right text-[11px] text-zinc-500">
                      <span className="font-semibold text-[#2563EB]">
                        ★ {p.rating}
                      </span>
                      {p.reviewCount !== null && (
                        <span> · 후기 {p.reviewCount}</span>
                      )}
                    </div>
                  )}
                </div>
                <div className="mt-2 flex flex-wrap gap-1.5 text-[11px]">
                  {p.categories.map((c) => (
                    <span
                      key={c}
                      className="inline-flex items-center gap-1 rounded-full bg-[#edf4ff] px-2 py-0.5 font-medium text-[#2563EB] dark:bg-indigo-950/40 dark:text-indigo-300"
                    >
                      {QUOTE_CATEGORY_EMOJIS[c]} {QUOTE_CATEGORY_LABELS[c]}
                    </span>
                  ))}
                </div>
                <div className="mt-2 flex items-center justify-between text-[11px] text-zinc-500">
                  <span className="truncate">
                    {p.regions.slice(0, 2).join(" · ") || "지역 미지정"}
                  </span>
                  {p.username && (
                    <code className="shrink-0 rounded bg-zinc-100 px-1.5 py-[1px] text-[10px] text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
                      @{p.username}
                    </code>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <div className="mb-2 flex items-baseline justify-between">
          <h2 className="text-[15px] font-bold">의뢰인 / 고객 회원</h2>
          <span className="text-xs text-zinc-500">{customers.length}명</span>
        </div>
        {customers.length === 0 ? (
          <EmptyCard text="아직 등록된 고객 회원이 없습니다" />
        ) : (
          <ul className="space-y-2">
            {customers.map((c) => (
              <li
                key={c.uid}
                className="rounded-[20px] border border-[#dbe8fb] bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="flex items-center gap-2 text-[15px] font-bold text-zinc-900 dark:text-zinc-50">
                        <span className="truncate">
                          {c.displayName || "이름 없음"}
                        </span>
                        {c.persona?.age && (
                          <span className="text-[12px] font-medium text-zinc-500">
                            · {c.persona.age}세
                          </span>
                        )}
                        <SampleBadge />
                      </p>
                      {c.username && (
                        <SampleLoginButton username={c.username} displayName={c.displayName} />
                      )}
                    </div>
                    {c.persona?.occupation && (
                      <p className="mt-0.5 truncate text-[12px] font-medium text-zinc-700 dark:text-zinc-300">
                        {c.persona.occupation}
                        {c.persona.household && (
                          <span className="text-zinc-500">
                            {" · "}
                            {c.persona.household}
                          </span>
                        )}
                      </p>
                    )}
                    {c.persona?.oneLiner && (
                      <p className="mt-1 text-[12px] italic leading-5 text-zinc-500">
                        “{c.persona.oneLiner}”
                      </p>
                    )}
                  </div>
                  {c.username && (
                    <code className="shrink-0 rounded bg-zinc-100 px-1.5 py-[1px] text-[10px] text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
                      @{c.username}
                    </code>
                  )}
                </div>
                {c.persona?.goal && (
                  <p className="mt-2 rounded-[12px] bg-[#f4f9ff] px-3 py-2 text-[12px] leading-5 text-zinc-700 dark:bg-zinc-950 dark:text-zinc-300">
                    <span className="font-semibold text-[#2563EB]">
                      청소 목적 ·{" "}
                    </span>
                    {c.persona.goal}
                  </p>
                )}
                <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[11px]">
                  {c.persona?.interestedCategories?.map((cat) => (
                    <span
                      key={cat}
                      className="inline-flex items-center gap-1 rounded-full bg-[#edf4ff] px-2 py-0.5 font-medium text-[#2563EB] dark:bg-indigo-950/40 dark:text-indigo-300"
                    >
                      {QUOTE_CATEGORY_EMOJIS[cat]}
                      {QUOTE_CATEGORY_LABELS[cat]}
                    </span>
                  ))}
                  {c.persona?.region && (
                    <span className="text-zinc-500">
                      · {c.persona.region}
                    </span>
                  )}
                </div>
                {c.persona?.monthlyBudget && (
                  <p className="mt-2 text-[11px] text-zinc-500">
                    예산 · 월 {(c.persona.monthlyBudget / 10000).toFixed(0)}만원
                    내외
                  </p>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      <footer className="pt-2 text-center text-[11px] leading-5 text-zinc-400">
        본 서비스는 내부 관제용 샌드박스로서, 등록된 모든 사용자 대화 연동 처리는 청광 AI 커뮤니케이터에 의해 실시간 관리됩니다.
      </footer>
    </div>
  );
}

function EmptyCard({ text }: { text: string }) {
  return (
    <div className="rounded-[20px] border border-dashed border-[#c9daf7] bg-[#f8fbff] p-6 text-center text-[13px] text-zinc-500 dark:border-zinc-700 dark:bg-zinc-900">
      {text}
    </div>
  );
}
