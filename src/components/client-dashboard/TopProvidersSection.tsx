import { connection } from "next/server";
import { providerRepository } from "@/lib/firebase/provider-repository";
import { TopProviderCard } from "./TopProviderCard";
import { EmptyDataCard } from "./EmptyDataCard";
import type { Provider } from "@/types/provider";
import type { TopProviderCardDTO } from "@/types/client-dashboard";

function toTopProviderCardDTO(p: Provider): TopProviderCardDTO {
  return {
    providerId: p.id,
    companyName: p.companyName,
    profileImage: p.profileImage ?? null,
    rating: p.rating ?? null,
    completedWorkCount: p.completedWorkCount ?? null,
    repeatRate: p.repeatRate ?? null,
  };
}

export async function TopProvidersSection() {
  await connection();
  let providers: Provider[] = [];
  try {
    providers = await providerRepository.listTopRated(5);
  } catch (e) {
    console.warn("[client-dashboard] listTopRated failed:", e);
  }
  const dtos = providers.map(toTopProviderCardDTO);

  return (
    <section
      aria-labelledby="top-providers-heading"
      className="mt-6 -mx-4 rounded-[32px] bg-[linear-gradient(180deg,#eef6ff_0%,#f8fbff_100%)] p-4 pt-6 pb-8 dark:bg-zinc-900/50"
    >
      <div className="mb-4">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#2B66F6]/70">
          Recommended Pros
        </p>
        <div className="mt-1 flex items-center gap-2">
          <h2
            id="top-providers-heading"
            className="text-[22px] font-black tracking-tight text-zinc-900 dark:text-zinc-50"
          >
            지금 많이 찾는 청명
          </h2>
          <span className="rounded-full bg-white/80 px-2 py-1 text-[11px] font-medium text-zinc-500">
            신뢰 지표 기반
          </span>
        </div>
        <p className="mt-1 text-[13px] leading-5 text-zinc-500 dark:text-zinc-400">
          평점, 반복 의뢰율, 작업 이력을 바탕으로 홈에서 먼저 살펴볼 수 있는 청명들이에요.
        </p>
      </div>

      {dtos.length === 0 ? (
        <EmptyDataCard
          title="곧 추천 리스트가 업데이트 됩니다"
          description="청명 가입과 작업 이력이 쌓이면 노출됩니다"
        />
      ) : (
        <div role="list" className="flex flex-col gap-3">
          {dtos.map((dto, idx) => (
            <div key={dto.providerId} role="listitem">
              <TopProviderCard provider={dto} rank={idx + 1} />
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
