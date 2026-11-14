"use server";

import { FieldValue } from "firebase-admin/firestore";
import { COLLECTIONS, PRIVATE_PROFILE_DOC, applicationId as makeApplicationId } from "@/lib/firebase/collections";
import { AppError, type ActionResult } from "@/lib/errors";
import { applicationIdSchema, applySchema, decideApplicationSchema } from "@/lib/validation/schemas";
import { requireUser } from "@/server/auth/session";
import { invalidateDonation } from "@/server/cache-tags";
import { queueNotification } from "@/server/db/notify";
import { adminDb } from "@/server/firebase/admin";
import type { ApplicationDoc, ConversationDoc, DonationDoc, UserDoc } from "@/types/firestore";
import { runAction } from "./run-action";

const MAX_OPEN_REQUESTS = 10;

/** Request a donation. One request per person per item (enforced by the deterministic document ID). */
export async function applyForDonation(input: unknown): Promise<ActionResult<{ applicationId: string }>> {
  return runAction(applySchema, input, async ({ donationId, forWhom, message, phone }) => {
    const user = await requireUser();
    const db = adminDb();

    const open = await db
      .collection(COLLECTIONS.applications)
      .where("applicantId", "==", user.uid)
      .where("status", "==", "pending")
      .count()
      .get();
    if (open.data().count >= MAX_OPEN_REQUESTS) {
      throw new AppError("rate-limited", "You have many open requests. Please wait for donors to reply first.");
    }

    const id = makeApplicationId(donationId, user.uid);
    const donationRef = db.collection(COLLECTIONS.donations).doc(donationId);
    const appRef = db.collection(COLLECTIONS.applications).doc(id);
    const userRef = db.collection(COLLECTIONS.users).doc(user.uid);

    await db.runTransaction(async (tx) => {
      const [donationSnap, appSnap, userSnap] = await Promise.all([tx.get(donationRef), tx.get(appRef), tx.get(userRef)]);
      if (!donationSnap.exists) throw new AppError("not-found", "This item no longer exists.");
      if (!userSnap.exists) throw new AppError("failed-precondition", "Please complete your profile first.");
      const donation = donationSnap.data() as DonationDoc;
      if (donation.moderation.state !== "approved" || donation.status !== "available") {
        throw new AppError("failed-precondition", "This item isn't available right now.");
      }
      if (donation.donorId === user.uid) throw new AppError("forbidden", "You can't request your own donation.");
      if (appSnap.exists) {
        const status = (appSnap.data() as ApplicationDoc).status;
        if (status !== "withdrawn") throw new AppError("conflict", "You've already requested this item.");
      }

      const applicant = userSnap.data() as UserDoc;
      const now = FieldValue.serverTimestamp();
      const doc: ApplicationDoc = {
        donationId,
        donorId: donation.donorId,
        applicantId: user.uid,
        donation: { title: donation.title, image: donation.images[0]?.url ?? null },
        applicant: { displayName: applicant.displayName, photoURL: applicant.photoURL },
        forWhom,
        message,
        status: "pending",
        createdAt: now,
        updatedAt: now,
        decidedAt: null,
      };
      tx.set(appRef, doc);
      tx.update(donationRef, { applicationCount: FieldValue.increment(1), updatedAt: now });
      tx.set(userRef.collection(COLLECTIONS.userPrivate).doc(PRIVATE_PROFILE_DOC), { phone, updatedAt: now }, { merge: true });
      queueNotification(tx, donation.donorId, {
        type: "application_received",
        title: "New request for your item",
        body: `${applicant.displayName} would like “${donation.title}”.`,
        link: `/donations/${donationId}`,
        actorId: user.uid,
      });
    });

    invalidateDonation(donationId);
    return { applicationId: id };
  });
}

/** Donor accepts or declines a request. Accepting reserves the item and opens a private conversation. */
export async function decideApplication(input: unknown): Promise<ActionResult> {
  return runAction(decideApplicationSchema, input, async ({ applicationId, decision }) => {
    const user = await requireUser();
    const db = adminDb();
    const appRef = db.collection(COLLECTIONS.applications).doc(applicationId);

    await db.runTransaction(async (tx) => {
      const appSnap = await tx.get(appRef);
      if (!appSnap.exists) throw new AppError("not-found", "Request not found.");
      const app = appSnap.data() as ApplicationDoc;
      if (app.donorId !== user.uid) throw new AppError("forbidden", "Only the donor can decide on this request.");
      if (app.status !== "pending") throw new AppError("conflict", "This request has already been answered.");

      const donationRef = db.collection(COLLECTIONS.donations).doc(app.donationId);
      const donationSnap = await tx.get(donationRef);
      const donation = donationSnap.data() as DonationDoc | undefined;
      const now = FieldValue.serverTimestamp();

      if (decision === "decline") {
        tx.update(appRef, { status: "declined", decidedAt: now, updatedAt: now });
        queueNotification(tx, app.applicantId, {
          type: "application_declined",
          title: "Request not accepted",
          body: `The donor chose someone else for “${app.donation.title}”. Keep looking — new items arrive daily.`,
          link: "/donations",
          actorId: user.uid,
        });
        return;
      }

      if (!donation || donation.status !== "available") {
        throw new AppError("failed-precondition", "This item is already reserved or no longer available.");
      }

      const conversationRef = db.collection(COLLECTIONS.conversations).doc(applicationId);
      const conversation: ConversationDoc = {
        participantIds: [app.donorId, app.applicantId],
        donorId: app.donorId,
        applicantId: app.applicantId,
        donationId: app.donationId,
        applicationId,
        donationTitle: app.donation.title,
        lastMessage: null,
        unread: { [app.donorId]: 0, [app.applicantId]: 0 },
        createdAt: now,
        updatedAt: now,
      };

      tx.update(appRef, { status: "accepted", decidedAt: now, updatedAt: now });
      tx.update(donationRef, { status: "reserved", reservedFor: app.applicantId, updatedAt: now });
      tx.set(conversationRef, conversation);
      queueNotification(tx, app.applicantId, {
        type: "application_accepted",
        title: "Your request was accepted 🎉",
        body: `${donation.donor.displayName} accepted your request for “${app.donation.title}”. Say salaam and arrange the pickup.`,
        link: `/messages/${applicationId}`,
        actorId: user.uid,
      });
    });
    invalidateDonation(applicationId.slice(0, applicationId.lastIndexOf("_")));
  });
}

/** Applicant withdraws. If it was already accepted, the item becomes available again. */
export async function withdrawApplication(input: unknown): Promise<ActionResult> {
  return runAction(applicationIdSchema, input, async ({ applicationId }) => {
    const user = await requireUser();
    const db = adminDb();
    const appRef = db.collection(COLLECTIONS.applications).doc(applicationId);

    await db.runTransaction(async (tx) => {
      const appSnap = await tx.get(appRef);
      if (!appSnap.exists) throw new AppError("not-found", "Request not found.");
      const app = appSnap.data() as ApplicationDoc;
      if (app.applicantId !== user.uid) throw new AppError("forbidden", "Only the requester can withdraw this.");
      if (app.status !== "pending" && app.status !== "accepted") {
        throw new AppError("failed-precondition", "This request can no longer be withdrawn.");
      }

      const now = FieldValue.serverTimestamp();
      if (app.status === "accepted") {
        const donationRef = db.collection(COLLECTIONS.donations).doc(app.donationId);
        tx.update(donationRef, { status: "available", reservedFor: null, updatedAt: now });
      }
      tx.update(appRef, { status: "withdrawn", updatedAt: now });
      queueNotification(tx, app.donorId, {
        type: "application_declined",
        title: "A request was withdrawn",
        body: `${app.applicant.displayName} withdrew their request for “${app.donation.title}”.`,
        link: `/donations/${app.donationId}`,
        actorId: user.uid,
      });
    });
    invalidateDonation(applicationId.slice(0, applicationId.lastIndexOf("_")));
  });
}
