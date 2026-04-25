import type { HygieneSection } from "@/types/page";

interface Props {
  hygiene: HygieneSection;
  partnerCleaningFrequency?: string;
}

export function Hygiene({ hygiene, partnerCleaningFrequency }: Props) {
  if (!hygiene.body) return null;
  return (
    <section className="mx-auto max-w-3xl px-6 py-16">
      <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-6 dark:border-emerald-900 dark:bg-emerald-950/40">
        <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-400">
          <span aria-hidden>🧼</span>
          위생 안심
          {partnerCleaningFrequency && (
            <span className="rounded bg-emerald-100 px-2 py-0.5 text-[10px] font-normal text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300">
              {partnerCleaningFrequency}
            </span>
          )}
        </div>
        <p className="whitespace-pre-line text-sm leading-relaxed text-emerald-900 dark:text-emerald-100">
          {hygiene.body}
        </p>
      </div>
    </section>
  );
}
