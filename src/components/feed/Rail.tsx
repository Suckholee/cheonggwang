import type { Page } from "@/types/page";
import { PostCard } from "./PostCard";

interface Props {
  title: string;
  posts: Page[];
}

export function Rail({ title, posts }: Props) {
  if (posts.length === 0) return null;
  return (
    <section className="py-5">
      <h2 className="px-4 text-base font-semibold text-zinc-900 dark:text-zinc-50 sm:px-6">
        {title}
      </h2>
      <div
        className="mt-3 flex gap-3 overflow-x-auto px-4 pb-2 sm:px-6"
        style={{ scrollSnapType: "x mandatory" }}
      >
        {posts.map((post) => (
          <PostCard key={post.id} post={post} />
        ))}
      </div>
    </section>
  );
}
