"use server";

import { FieldValue } from "firebase-admin/firestore";
import { z } from "zod";
import { COLLECTIONS, STORAGE_LIMITS } from "@/lib/firebase/collections";
import { invalidateDonor } from "@/server/cache-tags";
import { AppError, type ActionResult } from "@/lib/errors";
import { completeRegistrationSchema, profileSchema } from "@/lib/validation/schemas";
import { getSessionUser, requireUser } from "@/server/auth/session";
import { privateProfileRef, userRef } from "@/server/db/users";
import { adminAuth, adminBucket, adminDb } from "@/server/firebase/admin";
import type { UserDoc, UserPrivateDoc } from "@/types/firestore";
import { runAction } from "./run-action";

/** Lets the client decide, right after sign-in, whether to show profile setup. */
export async function getProfileStatus(): Promise<ActionResult<{ signedIn: boolean; hasProfile: boolean }>> {
  return runAction(z.undefined(), undefined, async () => {
    const user = await getSessionUser();
    if (!user) return { signedIn: false, hasProfile: false };
    return { signedIn: true, hasProfile: (await userRef(user.uid).get()).exists };
  });
}

/**
 * Creates the profile for a new account (email or Google). Idempotent, so retries are safe.
 * Every account can both donate and request — there is no role to choose.
 */
export async function completeRegistration(input: unknown): Promise<ActionResult<{ created: boolean }>> {
  return runAction(completeRegistrationSchema, input, async ({ displayName, city, area, phone, bio }) => {
    const user = await requireUser({ verifiedEmail: false });
    const db = adminDb();

    const created = await db.runTransaction(async (tx) => {
      if ((await tx.get(userRef(user.uid))).exists) return false;
      const now = FieldValue.serverTimestamp();
      const profile: UserDoc = {
        displayName,
        photoURL: user.picture, // Google accounts start with their Google photo
        city,
        area,
        bio,
        verified: false,
        stats: { donated: 0, received: 0 },
        createdAt: now,
        updatedAt: now,
      };
      const privateProfile: UserPrivateDoc = {
        email: user.email ?? "",
        phone,
        notificationPrefs: { email: true },
        updatedAt: now,
      };
      tx.create(userRef(user.uid), profile);
      tx.create(privateProfileRef(user.uid), privateProfile);
      return true;
    });

    if (created) await adminAuth().updateUser(user.uid, { displayName });
    return { created };
  });
}

/** Verifies an uploaded avatar lives in the caller's folder and is a small image; returns its public URL. */
async function verifyAvatar(uid: string, path: string) {
  if (!path.startsWith(`users/${uid}/avatar/`)) throw new AppError("forbidden", "Invalid photo.");
  const file = adminBucket().file(path);
  const [exists] = await file.exists();
  if (!exists) throw new AppError("invalid-input", "Photo upload didn't finish. Please try again.");
  const [meta] = await file.getMetadata();
  if (!String(meta.contentType).startsWith("image/") || Number(meta.size) > STORAGE_LIMITS.avatarBytes) {
    throw new AppError("invalid-input", "Profile photos must be images under 2 MB.");
  }
  return `https://firebasestorage.googleapis.com/v0/b/${adminBucket().name}/o/${encodeURIComponent(path)}?alt=media`;
}

/** Deletes old avatar files so only the current photo is stored. */
async function cleanupAvatars(uid: string, keepPath: string | null) {
  const [files] = await adminBucket().getFiles({ prefix: `users/${uid}/avatar/` });
  await Promise.all(files.filter((f) => f.name !== keepPath).map((f) => f.delete({ ignoreNotFound: true })));
}

/** Listings carry a copy of the donor's public name/photo for fast cards; keep those copies current. */
async function syncDonorSnapshot(uid: string, donor: { displayName: string; photoURL: string | null; verified: boolean }) {
  const snap = await adminDb().collection(COLLECTIONS.donations).where("donorId", "==", uid).limit(450).get();
  if (snap.empty) return;
  const batch = adminDb().batch();
  snap.docs.forEach((d) => batch.update(d.ref, { donor }));
  await batch.commit();
}

export async function updateProfile(input: unknown): Promise<ActionResult<{ photoURL: string | null }>> {
  return runAction(profileSchema, input, async ({ displayName, city, area, phone, bio, photoPath }) => {
    const user = await requireUser({ verifiedEmail: false });
    const ref = userRef(user.uid);
    const snap = await ref.get();
    if (!snap.exists) throw new AppError("failed-precondition", "Please complete your profile setup first.");

    let photoURL = (snap.data() as UserDoc).photoURL;
    if (photoPath) photoURL = await verifyAvatar(user.uid, photoPath);
    if (photoPath === null) photoURL = null;

    const now = FieldValue.serverTimestamp();
    const batch = adminDb().batch();
    // Whitelisted fields only — `verified`, `stats` and timestamps can never be set by the user.
    batch.update(ref, { displayName, city, area, bio, photoURL, updatedAt: now });
    batch.set(privateProfileRef(user.uid), { phone, updatedAt: now }, { merge: true });
    await batch.commit();

    await adminAuth().updateUser(user.uid, { displayName, photoURL });
    await syncDonorSnapshot(user.uid, { displayName, photoURL, verified: (snap.data() as UserDoc).verified }).catch((e) =>
      console.error("[donor snapshot]", e),
    );
    invalidateDonor(user.uid);
    if (photoPath !== undefined) await cleanupAvatars(user.uid, photoPath).catch((e) => console.error("[avatar cleanup]", e));
    return { photoURL };
  });
}
