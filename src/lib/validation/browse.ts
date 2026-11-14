import { z } from "zod";
import { CITIES } from "@/constants/site";
import type { BrowseFilters } from "@/types/donation";
import { CATEGORY_SLUGS, CONDITIONS } from "./schemas";

/**
 * Browse filters come from the URL, so they're untrusted. Invalid values are dropped (not errors):
 * a bad ?city=Atlantis simply shows unfiltered results instead of failing the page.
 */
const lenient = <T extends z.ZodType>(schema: T) => schema.optional().catch(undefined);

export const browseFiltersSchema = z.object({
  q: lenient(z.string().trim().min(1).max(60)),
  category: lenient(z.enum(CATEGORY_SLUGS)),
  city: lenient(z.enum(CITIES)),
  condition: lenient(z.enum(CONDITIONS)),
});

export function parseBrowseFilters(raw: Record<string, string | string[] | undefined>): BrowseFilters {
  const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
  const parsed = browseFiltersSchema.parse({
    q: first(raw.q),
    category: first(raw.category),
    city: first(raw.city),
    condition: first(raw.condition),
  });
  // Drop undefined keys so equal filters produce identical cache keys.
  return Object.fromEntries(Object.entries(parsed).filter(([, v]) => v !== undefined)) as BrowseFilters;
}
