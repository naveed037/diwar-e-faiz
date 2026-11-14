import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import type { DocumentSnapshot, Query, Timestamp } from "firebase-admin/firestore";
import { AppError } from "@/lib/errors";
import { COLLECTIONS } from "@/lib/firebase/collections";
import { matchesRest, planSearch } from "@/lib/search";
import { TAGS } from "@/server/cache-tags";
import { adminDb } from "@/server/firebase/admin";
import type { BrowseFilters, BrowsePage, CategorySlug, PublicDonation, PublicProfile, PublicStatus, SuccessStory } from "@/types/donation";
import type { CategoryDoc, DonationDoc, SuccessStoryDoc, UserDoc } from "@/types/firestore";

/**
 * Public, cached Firestore reads. Every function here:
 *  - only returns approved, public listings and public profile fields (never email/phone/moderation data),
 *  - is cached with `use cache` and tagged so server actions can expire it after writes,
 *  - degrades gracefully (empty results, available=false) when Firebase isn't configured yet.
 */

export const PAGE_SIZE = 12;
const MAX_SCAN_ROUNDS = 4; // bounds work when multi-word search filters out results in memory

const iso = (t: Timestamp | null | undefined) => t?.toDate().toISOString() ?? null;

function isPublicStatus(status: string): status is PublicStatus {
  return status === "available" || status === "reserved" || status === "given";
}

export function toPublicDonation(id: string, d: DonationDoc<Timestamp>): PublicDonation | null {
  if (d.moderation?.state !== "approved" || !isPublicStatus(d.status)) return null;
  return {
    id,
    title: d.title,
    description: d.description,
    categoryId: d.categoryId,
    condition: d.condition,
    status: d.status,
    city: d.city,
    area: d.area,
    pickupPreference: d.pickupPreference,
    notes: d.notes ?? "",
    images: d.images.map((i) => i.url),
    donor: { id: d.donorId, displayName: d.donor.displayName, photoURL: d.donor.photoURL, verified: d.donor.verified },
    applicationCount: d.applicationCount,
    createdAt: iso(d.createdAt),
  };
}

function logAndNull(error: unknown) {
  console.error("[public data]", error);
  return null;
}

function isNotConfigured(error: unknown) {
  return error instanceof AppError && error.code === "not-configured";
}

/** The base query for the main browse section: approved and *available* only, newest first. */
function availableQuery(): Query {
  return adminDb()
    .collection(COLLECTIONS.donations)
    .where("moderation.state", "==", "approved")
    .where("status", "==", "available");
}

/**
 * One page of available donations matching the filters. Cursor = ID of the last document scanned.
 * Indexes for every filter combination are declared in firestore.indexes.json.
 */
export async function browseDonations(filters: BrowseFilters, cursor: string | null = null): Promise<BrowsePage> {
  "use cache";
  cacheLife("minutes");
  cacheTag(TAGS.donations);

  try {
    let query = availableQuery();
    if (filters.category) query = query.where("categoryId", "==", filters.category);
    if (filters.city) query = query.where("city", "==", filters.city);
    if (filters.condition) query = query.where("condition", "==", filters.condition);
    const { primary, rest } = planSearch(filters.q);
    if (primary) query = query.where("keywords", "array-contains", primary);
    query = query.orderBy("createdAt", "desc");

    let after: DocumentSnapshot | null = null;
    if (cursor) {
      const snap = await adminDb().collection(COLLECTIONS.donations).doc(cursor).get();
      if (snap.exists) after = snap;
    }

    const items: PublicDonation[] = [];
    let exhausted = false;
    for (let round = 0; round < MAX_SCAN_ROUNDS && items.length < PAGE_SIZE; round++) {
      const batchSize = rest.length ? PAGE_SIZE * 2 : PAGE_SIZE + 1 - items.length;
      const page = await (after ? query.startAfter(after) : query).limit(batchSize).get();
      for (const doc of page.docs) {
        after = doc;
        const donation = toPublicDonation(doc.id, doc.data() as DonationDoc<Timestamp>);
        if (!donation) continue;
        if (!matchesRest(rest, `${donation.title} ${donation.description} ${donation.area}`)) continue;
        items.push(donation);
        if (items.length === PAGE_SIZE + 1) break;
      }
      if (page.size < batchSize) {
        exhausted = true;
        break;
      }
      if (!rest.length) break;
    }

    const pageItems = items.slice(0, PAGE_SIZE);
    // More results exist if we found an extra item, or if the scan stopped (round limit) before the end.
    // In the latter case the cursor is the last *scanned* document so the next page continues from there.
    let nextCursor: string | null = null;
    if (items.length > PAGE_SIZE) nextCursor = pageItems.at(-1)!.id;
    else if (!exhausted && after) nextCursor = after.id;
    return { items: pageItems, nextCursor, available: true };
  } catch (error) {
    if (isNotConfigured(error)) return { items: [], nextCursor: null, available: false };
    throw error;
  }
}

export async function getRecentDonations(limit = 8): Promise<PublicDonation[]> {
  "use cache";
  cacheLife("minutes");
  cacheTag(TAGS.donations);
  const page = await browseDonations({}).catch(logAndNull);
  return page?.items.slice(0, limit) ?? [];
}

/** Details for a public listing (available, reserved or given). Pending/rejected/removed → null (404). */
export async function getPublicDonation(id: string): Promise<PublicDonation | null> {
  "use cache";
  cacheLife("minutes");
  cacheTag(TAGS.donation(id));
  if (!/^[A-Za-z0-9_-]{1,128}$/.test(id)) return null;
  try {
    const snap = await adminDb().collection(COLLECTIONS.donations).doc(id).get();
    return snap.exists ? toPublicDonation(snap.id, snap.data() as DonationDoc<Timestamp>) : null;
  } catch (error) {
    if (isNotConfigured(error)) return null;
    throw error;
  }
}

export async function getRelatedDonations(donation: Pick<PublicDonation, "id" | "categoryId">, limit = 4): Promise<PublicDonation[]> {
  "use cache";
  cacheLife("minutes");
  cacheTag(TAGS.donations);
  const page = await browseDonations({ category: donation.categoryId }).catch(logAndNull);
  return (page?.items ?? []).filter((d) => d.id !== donation.id).slice(0, limit);
}

/** Public profile fields only — the private subcollection (email, phone) is never read here. */
export async function getPublicProfile(uid: string): Promise<PublicProfile | null> {
  "use cache";
  cacheLife("minutes");
  cacheTag(TAGS.donor(uid));
  if (!/^[A-Za-z0-9]{1,128}$/.test(uid)) return null;
  try {
    const snap = await adminDb().collection(COLLECTIONS.users).doc(uid).get();
    if (!snap.exists) return null;
    const u = snap.data() as UserDoc<Timestamp>;
    return {
      uid,
      displayName: u.displayName,
      photoURL: u.photoURL,
      city: u.city,
      area: u.area,
      bio: u.bio,
      verified: u.verified,
      stats: u.stats,
      memberSince: iso(u.createdAt),
    };
  } catch (error) {
    if (isNotConfigured(error)) return null;
    throw error;
  }
}

/** A donor's currently available listings, newest first. */
export async function getDonorDonations(uid: string, limit = 24): Promise<PublicDonation[]> {
  "use cache";
  cacheLife("minutes");
  cacheTag(TAGS.donor(uid), TAGS.donations);
  try {
    const snap = await availableQuery().where("donorId", "==", uid).orderBy("createdAt", "desc").limit(limit).get();
    return snap.docs.flatMap((d) => toPublicDonation(d.id, d.data() as DonationDoc<Timestamp>) ?? []);
  } catch (error) {
    if (isNotConfigured(error)) return [];
    throw error;
  }
}

/** Live item counts per category (maintained transactionally by server actions). */
export async function getCategoryCounts(): Promise<Partial<Record<CategorySlug, number>>> {
  "use cache";
  cacheLife("minutes");
  cacheTag(TAGS.categories);
  try {
    const snap = await adminDb().collection(COLLECTIONS.categories).get();
    return Object.fromEntries(snap.docs.map((d) => [d.id, Math.max(0, (d.data() as CategoryDoc).itemCount ?? 0)]));
  } catch (error) {
    if (isNotConfigured(error)) return {};
    throw error;
  }
}

export async function getPublishedStories(limit = 3): Promise<SuccessStory[]> {
  "use cache";
  cacheLife("hours");
  cacheTag(TAGS.stories);
  try {
    const snap = await adminDb().collection(COLLECTIONS.successStories).where("status", "==", "published").limit(20).get();
    const stories = snap.docs.map((d) => ({ id: d.id, ...(d.data() as SuccessStoryDoc<Timestamp>) }));
    stories.sort((a, b) => Number(b.featured) - Number(a.featured));
    return stories.slice(0, limit).map((s) => ({
      id: s.id,
      quote: s.quote,
      name: s.displayName,
      initials: s.initials,
      role: s.role,
      city: s.city,
      item: s.itemLabel,
    }));
  } catch (error) {
    if (isNotConfigured(error)) return [];
    throw error;
  }
}

/** Real platform numbers (aggregate count queries — cheap: 1 read per 1000 docs). */
export async function getImpactStats(): Promise<{ given: number; live: number; members: number } | null> {
  "use cache";
  cacheLife("hours");
  cacheTag(TAGS.stats);
  try {
    const db = adminDb();
    const donations = db.collection(COLLECTIONS.donations).where("moderation.state", "==", "approved");
    const [given, live, members] = await Promise.all([
      donations.where("status", "==", "given").count().get(),
      donations.where("status", "==", "available").count().get(),
      db.collection(COLLECTIONS.users).count().get(),
    ]);
    return { given: given.data().count, live: live.data().count, members: members.data().count };
  } catch (error) {
    if (isNotConfigured(error)) return null;
    throw error;
  }
}
