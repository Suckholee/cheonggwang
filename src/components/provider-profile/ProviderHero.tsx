import Image from "next/image";
import { shouldUnoptimizeImage } from "@/lib/image/should-unoptimize";
import { FavoriteButton } from "./FavoriteButton";
import type { Provider } from "@/types/provider";

interface Props {
  provider: Provider;
}

export function ProviderHero({ provider }: Props) {
  const initial = provider.companyName.trim()[0] ?? "?";

  return (
    <section className="relative aspect-[4/3] overflow-hidden rounded-2xl">
      {provider.profileImage ? (
        <Image
          src={provider.profileImage}
          alt={provider.companyName}
          fill
          sizes="(max-width: 640px) 100vw, 600px"
          unoptimized={shouldUnoptimizeImage(provider.profileImage)}
          className="object-cover"
          priority
        />
      ) : (
        <div 
          className="flex h-full flex-col items-center justify-center bg-cover bg-center relative text-white"
          style={{ backgroundImage: "url('/images/clean_living_room.png')" }}
        >
          {/* Blur & Gradient Overlay */}
          <div className="absolute inset-0 bg-indigo-950/60 dark:bg-zinc-950/80 backdrop-blur-xs" />
          
          <div className="relative z-10 flex h-20 w-20 items-center justify-center rounded-2xl border border-white/30 bg-white/20 text-4xl font-extrabold shadow-sm backdrop-blur-md">
            {initial}
          </div>
          <span className="relative z-10 mt-3 text-sm font-semibold tracking-wider text-white/80">
            {provider.companyName}
          </span>
        </div>
      )}
      <div className="absolute right-3 top-3 z-10">
        <FavoriteButton providerId={provider.id} />
      </div>
    </section>
  );
}
