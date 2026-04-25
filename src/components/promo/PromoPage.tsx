import Link from "next/link";
import type { Page } from "@/types/page";
import type { PartnerFlag } from "@/lib/firebase/user-repository";
import { HygieneBadge } from "./HygieneBadge";
import { Hero } from "./sections/Hero";
import { Intro } from "./sections/Intro";
import { Highlights } from "./sections/Highlights";
import { Hygiene } from "./sections/Hygiene";
import { Location } from "./sections/Location";
import { Cta } from "./sections/Cta";

interface Props {
  page: Page;
  partner: PartnerFlag;
}

/**
 * 공개 홍보 페이지 렌더러.
 * - 섹션 존재 여부에 따라 조건부 렌더 (빈 섹션은 자연스럽게 스킵)
 * - §1.2 Hygiene 격리: partner.isCheonggwangPartner === true일 때만 배지 + hygiene 섹션
 */
export function PromoPage({ page, partner }: Props) {
  const showHygiene =
    partner.isCheonggwangPartner && page.sections.hygiene !== null;

  return (
    <article className="min-h-screen bg-white text-zinc-900 dark:bg-zinc-950 dark:text-zinc-50">
      {partner.isCheonggwangPartner && (
        <HygieneBadge
          partnerCleaningFrequency={partner.partnerCleaningFrequency}
        />
      )}

      <Hero
        hero={page.sections.hero}
        coverPhoto={page.photos[0]}
        businessName={page.businessName}
      />

      <Intro intro={page.sections.intro} />
      <Highlights highlights={page.sections.highlights} />

      {showHygiene && page.sections.hygiene && (
        <Hygiene
          hygiene={page.sections.hygiene}
          partnerCleaningFrequency={partner.partnerCleaningFrequency}
        />
      )}

      <Location
        address={page.address}
        phone={page.phone}
        location={page.sections.location}
      />

      <Cta
        cta={page.sections.cta}
        fallbackPhone={page.phone}
        businessName={page.businessName}
      />

      <footer className="border-t border-zinc-200 bg-zinc-50 py-6 text-center text-xs text-zinc-500 dark:border-zinc-800 dark:bg-zinc-950">
        <Link href="/" className="hover:underline">
          청광 홍보 페이지로 제작됨
        </Link>
      </footer>
    </article>
  );
}
