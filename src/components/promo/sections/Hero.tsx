import Image from "next/image";
import type { HeroSection, Photo } from "@/types/page";

interface Props {
  hero: HeroSection;
  coverPhoto?: Photo;
  businessName: string;
}

export function Hero({ hero, coverPhoto, businessName }: Props) {
  const title = hero.title || businessName;
  const hasCover = coverPhoto && coverPhoto.url && coverPhoto.path !== "placeholder";

  return (
    <section className="relative flex min-h-[60vh] w-full items-end overflow-hidden bg-zinc-900 text-white">
      {hasCover ? (
        <>
          <Image
            src={coverPhoto.url}
            alt={title}
            fill
            priority
            sizes="100vw"
            className="object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
        </>
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-zinc-800 to-zinc-950" />
      )}
      <div className="relative mx-auto w-full max-w-4xl px-6 pb-12 pt-24">
        <h1 className="text-3xl font-bold leading-tight tracking-tight sm:text-5xl">
          {title}
        </h1>
        {hero.subtitle && (
          <p className="mt-3 max-w-xl text-base text-white/90 sm:text-lg">
            {hero.subtitle}
          </p>
        )}
      </div>
    </section>
  );
}
