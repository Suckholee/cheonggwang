import { PostFeedCard } from "./PostFeedCard";
import type { Post, PostFeedCardDTO } from "@/types/post";

function toFeedCardDTO(p: Post): PostFeedCardDTO {
  return {
    id: p.id,
    slug: p.slug,
    title: p.title,
    summary80: p.summary80.slice(0, 80),
    coverImageUrl: p.coverImageUrl,
    companyName: p.companyName,
    category: p.categories[0] ?? "move-in",
    createdAtMs: p.createdAt.getTime(),
    isSample: p.isSample === true,
  };
}

interface Props {
  posts: Post[];
}

export function PostFeedGrid({ posts }: Props) {
  const dtos = posts.map(toFeedCardDTO);
  return (
    <div
      role="list"
      className="grid grid-cols-1 gap-3 sm:grid-cols-2"
    >
      {dtos.map((dto) => (
        <PostFeedCard key={dto.id} post={dto} />
      ))}
    </div>
  );
}
