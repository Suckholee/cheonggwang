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
    categories: Category[];
    regions: Region[];
  };
  query: string;
}

export async function FeedRails({ filter, query }: Props) {
  const posts = await getFeedPosts({ categories: filter.categories });
  const filtered = query ? posts.filter((p) => matchesSearch(p, query)) : posts;

  const hasActiveFilter =
    !!query ||
    filter.regions.length > 0 ||
    filter.categories.length > 0;

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
  if (filter.regions.length > 0) {
    const nearbyIndex = rails.findIndex((r) => r.id === "nearby");
    if (nearbyIndex > -1) {
      const [nearbyRail] = rails.splice(nearbyIndex, 1);
      rails = [nearbyRail, ...rails];
    }
  }

  const rendered = rails
    .map((rail) => {
      const ranked = rankRailPosts(filtered, rail, filter.regions);
      if (ranked.length === 0) return null;
      const districtLabel =
        filter.regions.length > 0
          ? filter.regions.map((r) => r.district).join(", ")
          : "선택 지역";
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
