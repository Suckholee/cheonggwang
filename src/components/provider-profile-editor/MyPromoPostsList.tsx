import Link from "next/link";
import { postRepository } from "@/lib/firebase/post-repository";
import { formatRelativeTime } from "@/lib/format/relative-time";

interface Props {
  providerId: string;
}

export async function MyPromoPostsList({ providerId }: Props) {
  let posts: Awaited<ReturnType<typeof postRepository.listByProvider>> = [];
  try {
    posts = await postRepository.listByProvider(providerId, 3);
  } catch (e) {
    console.warn("[promo] MyPromoPostsList listByProvider failed:", e);
  }

  if (posts.length === 0) {
    return (
      <section className="rounded-2xl border border-dashed border-zinc-300 p-5 text-center dark:border-zinc-700">
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          아직 작성한 포스트가 없어요
        </p>
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950">
      <h3 className="mb-3 text-base font-bold">내 최근 포스트</h3>
      <ul className="space-y-2">
        {posts.map((p) => (
          <li key={p.id}>
            <Link
              href={`/community/${p.id}`}
              className="block rounded-lg border border-zinc-200 bg-white p-3 transition-colors hover:border-indigo-300 dark:border-zinc-800 dark:bg-zinc-950 dark:hover:border-indigo-700"
            >
              <p className="line-clamp-1 text-sm font-medium">{p.title}</p>
              <p className="mt-1 line-clamp-1 text-xs text-zinc-500">
                {p.summary80}
              </p>
              <p className="mt-1 text-[11px] text-zinc-400">
                {formatRelativeTime(p.createdAt.getTime())}
              </p>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
