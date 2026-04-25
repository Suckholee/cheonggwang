import type { Category } from "@/types/page";
import type { CategoryTemplate } from "./types";
import { restaurantTemplate } from "./restaurant";
import { salonTemplate } from "./salon";
import { cafeTemplate } from "./cafe";

export const templates: Record<Category, CategoryTemplate> = {
  restaurant: restaurantTemplate,
  salon: salonTemplate,
  cafe: cafeTemplate,
};

export function getTemplate(category: Category): CategoryTemplate {
  return templates[category];
}

export type { CategoryTemplate, SectionHint } from "./types";
