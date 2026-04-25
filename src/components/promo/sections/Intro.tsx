import type { IntroSection } from "@/types/page";

interface Props {
  intro: IntroSection;
}

export function Intro({ intro }: Props) {
  if (!intro.body) return null;
  return (
    <section className="mx-auto max-w-3xl px-6 py-16">
      <p className="whitespace-pre-line text-base leading-relaxed text-zinc-700 dark:text-zinc-300 sm:text-lg">
        {intro.body}
      </p>
    </section>
  );
}
