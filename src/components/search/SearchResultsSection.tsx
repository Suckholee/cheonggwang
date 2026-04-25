import { ProviderSearchCard } from "./ProviderSearchCard";
import { SearchEmptyState } from "./SearchEmptyState";
import type { Provider } from "@/types/provider";
import type {
  ProviderSearchCardDTO,
  SearchFilters,
} from "@/types/search";
import { hasAnyFilter } from "@/types/search";

function toProviderSearchCardDTO(p: Provider): ProviderSearchCardDTO {
  const firstRegion = p.regions[0];
  const regionCount = p.regions.length;
  const regionLabel = firstRegion
    ? regionCount > 1
      ? `${firstRegion.city} ${firstRegion.district} 외 ${regionCount - 1}곳`
      : `${firstRegion.city} ${firstRegion.district}`
    : "전국";
  const categoriesShown = p.categories.slice(0, 3);
  const categoriesOverflow = Math.max(0, p.categories.length - 3);
  return {
    providerId: p.id,
    companyName: p.companyName,
    profileImage: p.profileImage ?? null,
    rating: p.rating ?? null,
    reviewCount: p.reviewCount ?? null,
    repeatRate: p.repeatRate ?? null,
    categories: categoriesShown,
    categoriesOverflow,
    regionLabel,
    insured: p.insured,
    insuranceAmount: p.insuranceAmount ?? null,
    responseTimeMinutes: p.responseTimeMinutes ?? null,
  };
}

interface Props {
  providers: Provider[];
  filters: SearchFilters;
}

export function SearchResultsSection({ providers, filters }: Props) {
  if (providers.length === 0) {
    return <SearchEmptyState hasFilters={hasAnyFilter(filters)} />;
  }
  const dtos = providers.map(toProviderSearchCardDTO);
  return (
    <div role="list" className="space-y-3">
      {dtos.map((dto) => (
        <ProviderSearchCard key={dto.providerId} provider={dto} />
      ))}
    </div>
  );
}
