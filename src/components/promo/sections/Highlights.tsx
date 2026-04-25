import type { HighlightsSection } from "@/types/page";

interface Props {
  highlights: HighlightsSection;
}

export function Highlights({ highlights }: Props) {
  const items = highlights.items.filter(Boolean);
  if (items.length === 0) return null;

  return (
    <section className="border-y border-zinc-200 bg-zinc-50 py-16 dark:border-zinc-800 dark:bg-zinc-950">
      <div className="mx-auto max-w-4xl px-6">
        <h2 className="text-center text-sm font-semibold uppercase tracking-widest text-zinc-500">
          특징
        </h2>
        <ul className="mt-8 grid gap-6 sm:grid-cols-3">
          {items.map((item, idx) => (
            <li
              key={idx}
              className="rounded-lg border border-zinc-200 bg-white p-6 text-center dark:border-zinc-800 dark:bg-zinc-900"
            >
              <div className="mb-3 inline-flex h-8 w-8 items-center justify-center rounded-full bg-zinc-900 text-xs font-semibold text-white dark:bg-zinc-100 dark:text-zinc-900">
                {idx + 1}
              </div>
              <p className="text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
                {item}
              </p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
