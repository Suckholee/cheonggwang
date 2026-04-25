import type { ReactElement } from "react";
import { getFeedPosts } from "@/services/feed-service";
import { RAILS } from "@/lib/feed/rails";
import { currentTimeContext } from "@/lib/feed/time-context";
import { rankRailPosts } from "@/lib/feed/ranking";
import { matchesSearch } from "@/lib/feed/search";
import { Rail } from "./Rail";
import { EmptyFeed } from "./EmptyFeed";
import type { Category, Region } from "@/types/page";

interface Props {
  filter: {
    category: Category | "all";
    region: Region | null;
  };
  query: string;
}

export async function FeedRails({ filter, query }: Props) {
  const posts = await getFeedPosts({ category: filter.category });
  const filtered = query ? posts.filter((p) => matchesSearch(p, query)) : posts;

  const hasActiveFilter =
    !!query ||
    !!filter.region ||
    (filter.category !== undefined && filter.category !== "all");

  if (filtered.length === 0) {
    return <EmptyFeed hasFilter={hasActiveFilter} />;
  }

  const tc = currentTimeContext();
  const rails = RAILS.filter((r) => !r.timeContext || r.timeContext === tc);

  const rendered = rails
    .map((rail) => {
      const ranked = rankRailPosts(filtered, rail, filter.region);
      if (ranked.length === 0) return null;
      const districtLabel = filter.region?.district ?? "내 지역";
      const title = rail.title.replace("{district}", districtLabel);
      return <Rail key={rail.id} title={title} posts={ranked} />;
    })
    .filter((el): el is ReactElement => el !== null);

  if (rendered.length === 0) {
    return <EmptyFeed hasFilter={hasActiveFilter} />;
  }

  return <div className="pb-16">{rendered}</div>;
}
