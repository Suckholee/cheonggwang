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
        <div className="flex h-full items-center justify-center bg-gradient-to-br from-indigo-500 to-indigo-700 text-7xl font-bold text-white">
          {initial}
        </div>
      )}
      <div className="absolute right-3 top-3 z-10">
        <FavoriteButton providerId={provider.id} />
      </div>
    </section>
  );
}
