import type { CtaSection } from "@/types/page";

interface Props {
  cta: CtaSection;
  fallbackPhone: string;
  businessName: string;
}

function normalizeLink(link: string, fallbackPhone: string): string {
  if (!link) return `tel:${fallbackPhone.replace(/-/g, "")}`;
  if (link.startsWith("tel:") || link.startsWith("http")) return link;
  if (/^\d/.test(link)) return `tel:${link.replace(/-/g, "")}`;
  return `tel:${fallbackPhone.replace(/-/g, "")}`;
}

export function Cta({ cta, fallbackPhone, businessName }: Props) {
  const label = cta.label || "전화로 문의하기";
  const href = normalizeLink(cta.link, fallbackPhone);

  return (
    <section className="bg-zinc-900 px-6 py-16 text-white dark:bg-zinc-950">
      <div className="mx-auto flex max-w-3xl flex-col items-center gap-5 text-center">
        <p className="text-sm uppercase tracking-widest text-white/60">
          지금 방문해보세요
        </p>
        <p className="text-2xl font-semibold sm:text-3xl">{businessName}</p>
        <a
          href={href}
          className="mt-2 inline-flex items-center gap-2 rounded-full bg-white px-8 py-3 text-base font-semibold text-zinc-900 transition-colors hover:bg-zinc-100"
        >
          {label}
        </a>
      </div>
    </section>
  );
}
