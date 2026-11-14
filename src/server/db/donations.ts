import "server-only";
import type { Timestamp } from "firebase-admin/firestore";
import { COLLECTIONS } from "@/lib/firebase/collections";
import { adminDb } from "@/server/firebase/admin";
import type { CategorySlug, City, ItemCondition } from "@/types/donation";
import type { DonationDoc, DonationImage, ListingStatus, ModerationState, PickupPreference } from "@/types/firestore";

/** Serializable listing as its owner sees it (includes moderation details). */
export type OwnerDonation = {
  id: string;
  title: string;
  description: string;
  categoryId: CategorySlug;
  condition: ItemCondition;
  status: ListingStatus;
  moderation: { state: ModerationState; reason: string | null };
  city: City;
  area: string;
  pickupPreference: PickupPreference;
  notes: string;
  images: DonationImage[];
  applicationCount: number;
  createdAt: string | null;
  updatedAt: string | null;
};

const iso = (t: Timestamp | null | undefined) => t?.toDate().toISOString() ?? null;

function toOwnerDonation(id: string, d: DonationDoc<Timestamp>): OwnerDonation {
  return {
    id,
    title: d.title,
    description: d.description,
    categoryId: d.categoryId,
    condition: d.condition,
    status: d.status,
    moderation: { state: d.moderation.state, reason: d.moderation.reason },
    city: d.city,
    area: d.area,
    pickupPreference: d.pickupPreference,
    notes: d.notes ?? "",
    images: d.images,
    applicationCount: d.applicationCount,
    createdAt: iso(d.createdAt),
    updatedAt: iso(d.updatedAt),
  };
}

/** All listings owned by `uid` (from the verified session), newest first. */
export async function listMyDonations(uid: string): Promise<OwnerDonation[]> {
  const snap = await adminDb()
    .collection(COLLECTIONS.donations)
    .where("donorId", "==", uid)
    .orderBy("createdAt", "desc")
    .limit(200)
    .get();
  return snap.docs.map((doc) => toOwnerDonation(doc.id, doc.data() as DonationDoc<Timestamp>));
}

/** A single listing, only if `uid` owns it. Returns null otherwise (callers render 404, never leak existence). */
export async function getMyDonation(uid: string, id: string): Promise<OwnerDonation | null> {
  if (!/^[A-Za-z0-9_-]{1,128}$/.test(id)) return null;
  const snap = await adminDb().collection(COLLECTIONS.donations).doc(id).get();
  if (!snap.exists) return null;
  const data = snap.data() as DonationDoc<Timestamp>;
  return data.donorId === uid ? toOwnerDonation(snap.id, data) : null;
}
