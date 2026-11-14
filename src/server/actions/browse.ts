"use server";

import { z } from "zod";
import type { ActionResult } from "@/lib/errors";
import { browseFiltersSchema } from "@/lib/validation/browse";
import { browseDonations } from "@/server/db/public";
import type { BrowsePage } from "@/types/donation";
import { runAction } from "./run-action";

const loadMoreSchema = z.object({
  filters: browseFiltersSchema,
  cursor: z.string().regex(/^[A-Za-z0-9_-]{1,128}$/),
});

/** Public "Load more" for the browse page. Reads only approved, available listings (see browseDonations). */
export async function loadMoreDonations(input: unknown): Promise<ActionResult<BrowsePage>> {
  return runAction(loadMoreSchema, input, async ({ filters, cursor }) => {
    const clean = Object.fromEntries(Object.entries(filters).filter(([, v]) => v !== undefined));
    return browseDonations(clean, cursor);
  });
}
