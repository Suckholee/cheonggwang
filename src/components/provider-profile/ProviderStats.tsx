import type { Provider } from "@/types/provider";

interface Props {
  provider: Provider;
}

function StatCard({
  value,
  label,
}: {
  value: string;
  label: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-0.5 rounded-xl bg-zinc-50 py-4 dark:bg-zinc-900">
      <span className="text-xl font-bold text-zinc-900 dark:text-zinc-50">
        {value}
      </span>
      <span className="text-[11px] text-zinc-500">{label}</span>
    </div>
  );
}

export function ProviderStats({ provider }: Props) {
  const repeat =
    provider.repeatRate !== null && provider.repeatRate !== undefined
      ? `${Math.round(provider.repeatRate * 100)}%`
      : "—";
  const response =
    provider.responseTimeMinutes !== null &&
    provider.responseTimeMinutes !== undefined
      ? `${provider.responseTimeMinutes}분`
      : "—";
  const completed =
    provider.completedWorkCount !== null &&
    provider.completedWorkCount !== undefined
      ? `${provider.completedWorkCount}건`
      : "—";

  return (
    <section className="mt-5 grid grid-cols-3 gap-2">
      <StatCard value={repeat} label="재계약률" />
      <StatCard value={response} label="평균 응답" />
      <StatCard value={completed} label="완료 작업" />
    </section>
  );
}
