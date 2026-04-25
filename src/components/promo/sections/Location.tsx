import type { LocationSection } from "@/types/page";

interface Props {
  address: string;
  phone: string;
  location: LocationSection;
}

export function Location({ address, phone, location }: Props) {
  const mapQuery = encodeURIComponent(address);
  const hasEmbed = location.mapEmbed && location.mapEmbed.startsWith("http");

  return (
    <section className="mx-auto max-w-4xl px-6 py-16">
      <h2 className="text-center text-sm font-semibold uppercase tracking-widest text-zinc-500">
        오시는 길
      </h2>
      <div className="mt-8 grid gap-6 sm:grid-cols-2">
        <div className="flex flex-col gap-3 rounded-lg border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950">
          <p className="text-sm text-zinc-500">주소</p>
          <p className="text-base text-zinc-900 dark:text-zinc-100">{address}</p>
          <div className="mt-3 flex flex-col gap-2 border-t border-zinc-100 pt-3 dark:border-zinc-800">
            <p className="text-sm text-zinc-500">연락처</p>
            <a
              href={`tel:${phone.replace(/-/g, "")}`}
              className="text-base font-medium text-zinc-900 hover:underline dark:text-zinc-100"
            >
              {phone}
            </a>
          </div>
          <a
            href={`https://map.naver.com/p/search/${mapQuery}`}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 inline-block rounded border border-zinc-300 px-3 py-1.5 text-center text-xs hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-900"
          >
            네이버 지도에서 열기 ↗
          </a>
        </div>
        {hasEmbed ? (
          <div className="overflow-hidden rounded-lg border border-zinc-200 dark:border-zinc-800">
            <iframe
              src={location.mapEmbed}
              title="지도"
              loading="lazy"
              className="h-full w-full min-h-[240px]"
            />
          </div>
        ) : (
          <div className="flex items-center justify-center rounded-lg border border-dashed border-zinc-200 bg-zinc-50 p-6 text-sm text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900">
            지도는 나중에 연결될 예정입니다
          </div>
        )}
      </div>
    </section>
  );
}
