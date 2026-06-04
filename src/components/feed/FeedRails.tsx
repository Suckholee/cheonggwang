import type { ReactElement } from "react";
import { getFeedPosts } from "@/services/feed-service";
import { RAILS } from "@/lib/feed/rails";
import { currentTimeContext } from "@/lib/feed/time-context";
import { rankRailPosts } from "@/lib/feed/ranking";
import { matchesSearch } from "@/lib/feed/search";
import { Rail } from "./Rail";
import { EmptyFeed } from "./EmptyFeed";
import { RegionQuickExplorer } from "./RegionQuickExplorer";
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
    return (
      <div className="pb-16">
        <RegionQuickExplorer />
        <EmptyFeed hasFilter={hasActiveFilter} />
      </div>
    );
  }

  const tc = currentTimeContext();
  let rails = RAILS.filter((r) => !r.timeContext || r.timeContext === tc);

  // If a region filter is active, float the 'nearby' rail to the very top
  if (filter.region) {
    const nearbyIndex = rails.findIndex((r) => r.id === "nearby");
    if (nearbyIndex > -1) {
      const [nearbyRail] = rails.splice(nearbyIndex, 1);
      rails = [nearbyRail, ...rails];
    }
  }

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
    return (
      <div className="pb-16">
        <RegionQuickExplorer />
        <EmptyFeed hasFilter={hasActiveFilter} />
      </div>
    );
  }

  return (
    <div className="pb-16">
      <RegionQuickExplorer />
      {rendered}
    </div>
  );
}
