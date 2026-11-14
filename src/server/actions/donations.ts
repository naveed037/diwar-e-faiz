"use server";

import { FieldValue, type Transaction } from "firebase-admin/firestore";
import { COLLECTIONS, STORAGE_LIMITS, storagePaths } from "@/lib/firebase/collections";
import { AppError, type ActionResult } from "@/lib/errors";
import { buildKeywords } from "@/lib/search";
import {
  createDonationSchema,
  donationIdSchema,
  setDonationStatusSchema,
  updateDonationSchema,
} from "@/lib/validation/schemas";
import { requireUser, type SessionUser } from "@/server/auth/session";
import { invalidateDonation } from "@/server/cache-tags";
import { queueNotification } from "@/server/db/notify";
import { adminBucket, adminDb } from "@/server/firebase/admin";
import type { ApplicationDoc, DonationDoc, DonationImage, UserDoc } from "@/types/firestore";
import { runAction } from "./run-action";

/**
 * Donation listing actions. Every one of them:
 *  - authenticates from the httpOnly session cookie (never from client-supplied IDs),
 *  - re-validates input with zod on the server,
 *  - checks ownership inside a Firestore transaction before writing.
 * Listings are always free: no schema, type or document has a price field.
 */

const MAX_IN_REVIEW_PER_USER = 10;

// ---------- helpers ----------

/** A listing is counted in its category only while it is publicly visible and still up for grabs. */
const isCounted = (d: Pick<DonationDoc, "moderation" | "status">) =>
  d.moderation.state === "approved" && (d.status === "available" || d.status === "reserved");

function adjustCategoryCount(tx: Transaction, categoryId: string, before: boolean, after: boolean) {
  if (before === after) return;
  tx.update(adminDb().collection(COLLECTIONS.categories).doc(categoryId), { itemCount: FieldValue.increment(after ? 1 : -1) });
}

/** Loads a donation inside a transaction and asserts the caller owns it. */
async function getOwnedDonation(tx: Transaction, donationId: string, user: SessionUser) {
  const ref = adminDb().collection(COLLECTIONS.donations).doc(donationId);
  const snap = await tx.get(ref);
  if (!snap.exists) throw new AppError("not-found", "Listing not found.");
  const donation = snap.data() as DonationDoc;
  if (donation.donorId !== user.uid) throw new AppError("forbidden", "Only the person who posted this listing can change it.");
  return { ref, donation };
}

/** Confirms each uploaded file is in the caller's listing folder, is an image and is within the size limit. */
async function verifyUploadedImages(uid: string, donationId: string, paths: string[]): Promise<DonationImage[]> {
  const folder = storagePaths.donationFolder(uid, donationId);
  const bucket = adminBucket();
  return Promise.all(
    paths.map(async (path) => {
      if (!path.startsWith(folder)) throw new AppError("forbidden", "Photos must belong to this listing.");
      const file = bucket.file(path);
      const [exists] = await file.exists();
      if (!exists) throw new AppError("invalid-input", "A photo didn't finish uploading. Please add it again.");
      const [meta] = await file.getMetadata();
      if (!String(meta.contentType).startsWith("image/") || Number(meta.size) > STORAGE_LIMITS.donationImageBytes) {
        throw new AppError("invalid-input", "Photos must be images under 5 MB.");
      }
      // storage.rules grants public read on donations/**, so no download token is needed.
      return { path, url: `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(path)}?alt=media` };
    }),
  );
}

/** Deletes files in the listing folder that are no longer referenced (removed photos, abandoned uploads). */
async function cleanupListingFolder(uid: string, donationId: string, keep: string[]) {
  const [files] = await adminBucket().getFiles({ prefix: storagePaths.donationFolder(uid, donationId) });
  const keepSet = new Set(keep);
  await Promise.all(files.filter((f) => !keepSet.has(f.name)).map((f) => f.delete({ ignoreNotFound: true })));
}

async function donorSnapshot(tx: Transaction, uid: string) {
  const snap = await tx.get(adminDb().collection(COLLECTIONS.users).doc(uid));
  if (!snap.exists) throw new AppError("failed-precondition", "Please complete your profile before posting.");
  const p = snap.data() as UserDoc;
  return { displayName: p.displayName, photoURL: p.photoURL, verified: p.verified };
}

// ---------- create ----------

/** Creates a listing in `pending` review. It becomes public after an admin approves it. */
export async function createDonation(input: unknown): Promise<ActionResult<{ donationId: string }>> {
  return runAction(createDonationSchema, input, async (data) => {
    const user = await requireUser();
    const db = adminDb();

    const inReview = await db
      .collection(COLLECTIONS.donations)
      .where("donorId", "==", user.uid)
      .where("moderation.state", "==", "pending")
      .count()
      .get();
    if (inReview.data().count >= MAX_IN_REVIEW_PER_USER) {
      throw new AppError("rate-limited", "You have several listings waiting for review. Please wait until they're approved.");
    }

    const images = await verifyUploadedImages(user.uid, data.donationId, data.imagePaths);
    const ref = db.collection(COLLECTIONS.donations).doc(data.donationId);

    await db.runTransaction(async (tx) => {
      const donor = await donorSnapshot(tx, user.uid);
      if ((await tx.get(ref)).exists) throw new AppError("conflict", "This listing was already submitted.");
      const now = FieldValue.serverTimestamp();
      const doc: DonationDoc = {
        donorId: user.uid,
        donor,
        title: data.title,
        description: data.description,
        categoryId: data.categoryId,
        condition: data.condition,
        status: "available",
        moderation: { state: "pending", reason: null, reviewedBy: null, reviewedAt: null },
        city: data.city,
        area: data.area,
        pickupPreference: data.pickupPreference,
        notes: data.notes,
        keywords: buildKeywords(data),
        images,
        applicationCount: 0,
        reservedFor: null,
        createdAt: now,
        updatedAt: now,
        givenAt: null,
      };
      tx.create(ref, doc);
    });

    await cleanupListingFolder(user.uid, data.donationId, data.imagePaths).catch((e) => console.error("[cleanup]", e));
    return { donationId: data.donationId };
  });
}

// ---------- edit ----------

/**
 * Updates a listing. Approved or rejected listings go back to `pending` review so a listing can't be
 * changed into something else after approval. Given or removed listings can't be edited.
 */
export async function updateDonation(input: unknown): Promise<ActionResult<{ reReview: boolean }>> {
  return runAction(updateDonationSchema, input, async (data) => {
    const user = await requireUser();
    const images = await verifyUploadedImages(user.uid, data.donationId, data.imagePaths);
    const db = adminDb();

    const reReview = await db.runTransaction(async (tx) => {
      const { ref, donation } = await getOwnedDonation(tx, data.donationId, user);
      if (donation.status === "given" || donation.status === "removed") {
        throw new AppError("failed-precondition", "Given or removed listings can't be edited.");
      }
      const donor = await donorSnapshot(tx, user.uid);
      const now = FieldValue.serverTimestamp();
      const wasReviewed = donation.moderation.state !== "pending";

      tx.update(ref, {
        donor,
        title: data.title,
        description: data.description,
        categoryId: data.categoryId,
        condition: data.condition,
        city: data.city,
        area: data.area,
        pickupPreference: data.pickupPreference,
        notes: data.notes,
        keywords: buildKeywords(data),
        images,
        moderation: { state: "pending", reason: null, reviewedBy: null, reviewedAt: null },
        updatedAt: now,
      });
      // Leaving "approved" removes it from the public count until it is approved again.
      adjustCategoryCount(tx, donation.categoryId, isCounted(donation), false);
      return wasReviewed;
    });

    invalidateDonation(data.donationId, user.uid);
    await cleanupListingFolder(user.uid, data.donationId, data.imagePaths).catch((e) => console.error("[cleanup]", e));
    return { reReview };
  });
}

// ---------- status ----------

/**
 * Owner status changes:
 *   available → reserved      (promised to someone)
 *   reserved  → available     (fell through; an accepted request is released)
 *   available | reserved → given   (final)
 *   removed   → relist        (back to available, re-reviewed)
 */
export async function setDonationStatus(input: unknown): Promise<ActionResult> {
  return runAction(setDonationStatusSchema, input, async ({ donationId, status }) => {
    const user = await requireUser();
    const db = adminDb();

    await db.runTransaction(async (tx) => {
      const { ref, donation } = await getOwnedDonation(tx, donationId, user);
      const reservedApp = donation.reservedFor
        ? await tx.get(db.collection(COLLECTIONS.applications).doc(`${donationId}_${donation.reservedFor}`))
        : null;
      const now = FieldValue.serverTimestamp();
      const approved = donation.moderation.state === "approved";
      const invalid = () => {
        throw new AppError("failed-precondition", "That status change isn't possible for this listing.");
      };

      if (status === "relist") {
        if (donation.status !== "removed") invalid();
        tx.update(ref, {
          status: "available",
          reservedFor: null,
          moderation: { state: "pending", reason: null, reviewedBy: null, reviewedAt: null },
          updatedAt: now,
        });
        return; // not counted until approved again
      }

      if (!approved) throw new AppError("failed-precondition", "You can change the status once the listing is approved.");

      if (status === "reserved") {
        if (donation.status !== "available") invalid();
        tx.update(ref, { status: "reserved", updatedAt: now });
        return; // still counted
      }

      if (status === "available") {
        if (donation.status !== "reserved") invalid();
        tx.update(ref, { status: "available", reservedFor: null, updatedAt: now });
        if (reservedApp?.exists && (reservedApp.data() as ApplicationDoc).status === "accepted") {
          const app = reservedApp.data() as ApplicationDoc;
          tx.update(reservedApp.ref, { status: "declined", updatedAt: now });
          queueNotification(tx, app.applicantId, {
            type: "application_declined",
            title: "Reservation released",
            body: `The donor made “${donation.title}” available again.`,
            link: "/donations",
            actorId: user.uid,
          });
        }
        return;
      }

      // status === "given"
      if (donation.status !== "available" && donation.status !== "reserved") invalid();
      tx.update(ref, { status: "given", givenAt: now, updatedAt: now });
      tx.update(db.collection(COLLECTIONS.users).doc(user.uid), { "stats.donated": FieldValue.increment(1) });
      adjustCategoryCount(tx, donation.categoryId, isCounted(donation), false);
      if (reservedApp?.exists && (reservedApp.data() as ApplicationDoc).status === "accepted") {
        const app = reservedApp.data() as ApplicationDoc;
        tx.update(reservedApp.ref, { status: "completed", updatedAt: now });
        tx.update(db.collection(COLLECTIONS.users).doc(app.applicantId), { "stats.received": FieldValue.increment(1) });
        queueNotification(tx, app.applicantId, {
          type: "donation_given",
          title: "Handover complete",
          body: `${donation.donor.displayName} marked “${donation.title}” as given to you. Enjoy it!`,
          link: `/donations/${donationId}`,
          actorId: user.uid,
        });
      }
    });
    invalidateDonation(donationId, user.uid);
  });
}

// ---------- remove / delete ----------

/** Soft-removes a listing: hidden from everyone else, kept in the owner's dashboard, can be relisted. */
export async function removeDonation(input: unknown): Promise<ActionResult> {
  return runAction(donationIdSchema, input, async ({ donationId }) => {
    const user = await requireUser({ verifiedEmail: false });
    const db = adminDb();
    const openApps = db
      .collection(COLLECTIONS.applications)
      .where("donationId", "==", donationId)
      .where("status", "in", ["pending", "accepted"]);

    await db.runTransaction(async (tx) => {
      const { ref, donation } = await getOwnedDonation(tx, donationId, user);
      const apps = await tx.get(openApps);
      if (donation.status === "given" || donation.status === "removed") {
        throw new AppError("failed-precondition", "This listing can no longer be removed.");
      }

      const now = FieldValue.serverTimestamp();
      tx.update(ref, { status: "removed", reservedFor: null, updatedAt: now });
      adjustCategoryCount(tx, donation.categoryId, isCounted(donation), false);
      for (const app of apps.docs) {
        const a = app.data() as ApplicationDoc;
        tx.update(app.ref, { status: "declined", decidedAt: now, updatedAt: now });
        queueNotification(tx, a.applicantId, {
          type: "application_declined",
          title: "Item no longer available",
          body: `“${donation.title}” was removed by the donor.`,
          link: "/donations",
          actorId: user.uid,
        });
      }
    });
    invalidateDonation(donationId, user.uid);
  });
}

/**
 * Permanently deletes a listing and its photos. Only allowed while nobody has requested it,
 * so no one else's history ever points at a missing listing. Otherwise use removeDonation.
 */
export async function deleteDonation(input: unknown): Promise<ActionResult> {
  return runAction(donationIdSchema, input, async ({ donationId }) => {
    const user = await requireUser({ verifiedEmail: false });
    const db = adminDb();

    await db.runTransaction(async (tx) => {
      const { ref, donation } = await getOwnedDonation(tx, donationId, user);
      if (donation.applicationCount > 0 || donation.status === "given") {
        throw new AppError("failed-precondition", "People have requested this item, so it can only be removed, not deleted.");
      }
      adjustCategoryCount(tx, donation.categoryId, isCounted(donation), false);
      tx.delete(ref);
    });

    invalidateDonation(donationId, user.uid);
    await cleanupListingFolder(user.uid, donationId, []).catch((e) => console.error("[cleanup]", e));
  });
}
