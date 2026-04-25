import Link from "next/link";
import Image from "next/image";
import { Star } from "lucide-react";
import { shouldUnoptimizeImage } from "@/lib/image/should-unoptimize";
import type { Provider } from "@/types/provider";

interface Props {
  provider: Provider;
}

function initialGradient(name: string): string {
  const palette = [
    "from-indigo-400 to-purple-500",
    "from-emerald-400 to-teal-500",
    "from-amber-400 to-orange-500",
    "from-pink-400 to-rose-500",
    "from-sky-400 to-cyan-500",
  ];
  const idx = (name.charCodeAt(0) ?? 0) % palette.length;
  return palette[idx];
}

export function PostProviderInfoCard({ provider }: Props) {
  const firstRegion = provider.regions[0];
  const regionLabel = firstRegion
    ? `${firstRegion.city} ${firstRegion.district}`
    : "전국";
  return (
    <Link
      href={`/providers/${provider.id}`}
      className="flex items-center gap-3 rounded-2xl border border-zinc-200 bg-white p-4 transition-colors hover:border-indigo-300 dark:border-zinc-800 dark:bg-zinc-950 dark:hover:border-indigo-700"
      aria-label={`${provider.companyName} 프로필 보기`}
    >
      <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-full">
        {provider.profileImage ? (
          <Image
            src={provider.profileImage}
            alt={provider.companyName}
            fill
            sizes="56px"
            unoptimized={shouldUnoptimizeImage(provider.profileImage)}
            className="object-cover"
          />
        ) : (
          <div
            className={`flex h-full w-full items-center justify-center bg-gradient-to-br ${initialGradient(
              provider.companyName,
            )} text-xl font-bold text-white`}
            aria-hidden
          >
            {provider.companyName.charAt(0)}
          </div>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-bold">{provider.companyName}</p>
        <p className="flex items-center gap-1 text-xs text-zinc-500">
          {provider.rating != null && (
            <>
              <Star
                className="h-3 w-3 fill-amber-500 text-amber-500"
                aria-hidden
              />
              <span>{provider.rating.toFixed(1)}</span>
              <span>·</span>
            </>
          )}
          <span>{regionLabel}</span>
        </p>
      </div>
      <span
        className="shrink-0 text-xs font-semibold text-indigo-600 dark:text-indigo-400"
        aria-hidden
      >
        프로필 →
      </span>
    </Link>
  );
}
