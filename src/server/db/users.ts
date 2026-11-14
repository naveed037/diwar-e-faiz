import "server-only";
import type { Timestamp } from "firebase-admin/firestore";
import { COLLECTIONS, PRIVATE_PROFILE_DOC } from "@/lib/firebase/collections";
import { adminDb } from "@/server/firebase/admin";
import type { City } from "@/types/donation";
import type { UserDoc, UserPrivateDoc } from "@/types/firestore";

/** Serializable view of the signed-in user's own profile (public + private fields). */
export type OwnProfile = {
  uid: string;
  displayName: string;
  email: string;
  phone: string | null;
  city: City | null;
  area: string | null;
  bio: string;
  photoURL: string | null;
  verified: boolean;
  stats: { donated: number; received: number };
  memberSince: string | null;
};

export const userRef = (uid: string) => adminDb().collection(COLLECTIONS.users).doc(uid);
export const privateProfileRef = (uid: string) => userRef(uid).collection(COLLECTIONS.userPrivate).doc(PRIVATE_PROFILE_DOC);

/**
 * Loads a profile for its OWNER. Callers must pass the uid from the verified session —
 * never a uid from the URL or request body — so one user can't read another's private data.
 */
export async function getOwnProfile(uid: string): Promise<OwnProfile | null> {
  const [pub, priv] = await adminDb().getAll(userRef(uid), privateProfileRef(uid));
  if (!pub.exists) return null;
  const p = pub.data() as UserDoc<Timestamp>;
  const s = (priv.data() as UserPrivateDoc<Timestamp> | undefined) ?? null;
  return {
    uid,
    displayName: p.displayName,
    email: s?.email ?? "",
    phone: s?.phone ?? null,
    city: p.city,
    area: p.area,
    bio: p.bio,
    photoURL: p.photoURL,
    verified: p.verified,
    stats: p.stats,
    memberSince: p.createdAt?.toDate().toISOString() ?? null,
  };
}
