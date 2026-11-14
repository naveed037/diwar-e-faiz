import "server-only";
import type { Timestamp } from "firebase-admin/firestore";
import { COLLECTIONS, PRIVATE_PROFILE_DOC } from "@/lib/firebase/collections";
import { requireAdmin } from "@/server/auth/session";
import { adminDb } from "@/server/firebase/admin";
import type { CategorySlug, City, ItemCondition } from "@/types/donation";
import type { DonationDoc, ListingStatus, ModerationState, PickupPreference, UserDoc, UserPrivateDoc } from "@/types/firestore";

/**
 * Moderation data. Every loader re-checks admin rights itself (defence in depth): even if a page forgot
 * to, these functions can never return private donor data to a non-admin.
 */

export type ModerationDonor = {
  id: string;
  displayName: string;
  photoURL: string | null;
  verified: boolean;
  email: string | null;
  memberSince: string | null;
  approvedCount: number;
  rejectedCount: number;
};

export type ModerationItem = {
  id: string;
  title: string;
  description: string;
  notes: string;
  categoryId: CategorySlug;
  condition: ItemCondition;
  status: ListingStatus;
  city: City;
  area: string;
  pickupPreference: PickupPreference;
  images: string[];
  createdAt: string | null;
  updatedAt: string | null;
  /** True when the listing was changed well after it was first posted (re-review after an edit). */
  edited: boolean;
  moderation: { state: ModerationState; reason: string | null; reviewedAt: string | null };
  donor: ModerationDonor;
};

const iso = (t: Timestamp | null | undefined) => t?.toDate().toISOString() ?? null;
const EDIT_THRESHOLD_MS = 5 * 60 * 1000;

async function loadDonors(ids: string[]): Promise<Map<string, ModerationDonor>> {
  const db = adminDb();
  const unique = [...new Set(ids)];
  const entries = await Promise.all(
    unique.map(async (uid) => {
      const userRef = db.collection(COLLECTIONS.users).doc(uid);
      const donations = db.collection(COLLECTIONS.donations).where("donorId", "==", uid);
      const [[pub, priv], approved, rejected] = await Promise.all([
        db.getAll(userRef, userRef.collection(COLLECTIONS.userPrivate).doc(PRIVATE_PROFILE_DOC)),
        donations.where("moderation.state", "==", "approved").count().get(),
        donations.where("moderation.state", "==", "rejected").count().get(),
      ]);
      const p = pub.data() as UserDoc<Timestamp> | undefined;
      const s = priv.data() as UserPrivateDoc<Timestamp> | undefined;
      const donor: ModerationDonor = {
        id: uid,
        displayName: p?.displayName ?? "Unknown member",
        photoURL: p?.photoURL ?? null,
        verified: p?.verified ?? false,
        email: s?.email || null,
        memberSince: iso(p?.createdAt),
        approvedCount: approved.data().count,
        rejectedCount: rejected.data().count,
      };
      return [uid, donor] as const;
    }),
  );
  return new Map(entries);
}

function toItem(id: string, d: DonationDoc<Timestamp>, donors: Map<string, ModerationDonor>): ModerationItem {
  const created = d.createdAt?.toMillis() ?? 0;
  const updated = d.updatedAt?.toMillis() ?? 0;
  return {
    id,
    title: d.title,
    description: d.description,
    notes: d.notes ?? "",
    categoryId: d.categoryId,
    condition: d.condition,
    status: d.status,
    city: d.city,
    area: d.area,
    pickupPreference: d.pickupPreference,
    images: d.images.map((i) => i.url),
    createdAt: iso(d.createdAt),
    updatedAt: iso(d.updatedAt),
    edited: updated - created > EDIT_THRESHOLD_MS,
    moderation: { state: d.moderation.state, reason: d.moderation.reason, reviewedAt: iso(d.moderation.reviewedAt) },
    donor: donors.get(d.donorId)!,
  };
}

/** Listings waiting for review, oldest first (first come, first served). */
export async function listPendingDonations(limit = 50): Promise<{ items: ModerationItem[]; total: number }> {
  await requireAdmin();
  const query = adminDb().collection(COLLECTIONS.donations).where("moderation.state", "==", "pending");
  const [snap, total] = await Promise.all([query.orderBy("createdAt", "asc").limit(limit).get(), query.count().get()]);
  const docs = snap.docs.map((d) => ({ id: d.id, data: d.data() as DonationDoc<Timestamp> }));
  const donors = await loadDonors(docs.map((d) => d.data.donorId));
  return { items: docs.map((d) => toItem(d.id, d.data, donors)), total: total.data().count };
}

/** The most recent decisions, newest first. */
export async function listRecentlyReviewed(limit = 10): Promise<ModerationItem[]> {
  await requireAdmin();
  const snap = await adminDb()
    .collection(COLLECTIONS.donations)
    .orderBy("moderation.reviewedAt", "desc")
    .limit(limit * 2)
    .get();
  const docs = snap.docs
    .map((d) => ({ id: d.id, data: d.data() as DonationDoc<Timestamp> }))
    .filter((d) => d.data.moderation?.reviewedAt && d.data.moderation.state !== "pending")
    .slice(0, limit);
  const donors = await loadDonors(docs.map((d) => d.data.donorId));
  return docs.map((d) => toItem(d.id, d.data, donors));
}
