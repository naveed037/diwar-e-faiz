import "server-only";
import { updateTag } from "next/cache";

/** Cache tags for public Firestore reads (see src/server/db/public.ts). */
export const TAGS = {
  donations: "donations", // any list of public donations (browse, home, related)
  donation: (id: string) => `donation-${id}`,
  donor: (uid: string) => `donor-${uid}`,
  categories: "categories",
  stories: "stories",
  stats: "stats",
} as const;

/**
 * Expire public caches after a write so the change is visible on the next request (read-your-own-writes).
 * Must be called from a Server Action. Safe to call outside a request (e.g. tests): errors are ignored.
 */
export function invalidateDonation(id: string, donorId?: string) {
  const tags = [TAGS.donations, TAGS.donation(id), TAGS.categories, TAGS.stats];
  if (donorId) tags.push(TAGS.donor(donorId));
  for (const tag of tags) {
    try {
      updateTag(tag);
    } catch {
      // Not inside a Server Action — cache entries will expire via cacheLife instead.
    }
  }
}

export function invalidateDonor(uid: string) {
  try {
    updateTag(TAGS.donor(uid));
    updateTag(TAGS.donations);
  } catch {
    // see above
  }
}
