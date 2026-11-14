"use server";

import { FieldValue } from "firebase-admin/firestore";
import { COLLECTIONS } from "@/lib/firebase/collections";
import { AppError, type ActionResult } from "@/lib/errors";
import { moderateDonationSchema, publishStorySchema, resolveReportSchema } from "@/lib/validation/schemas";
import { requireAdmin } from "@/server/auth/session";
import { invalidateDonation } from "@/server/cache-tags";
import { queueNotification } from "@/server/db/notify";
import { adminDb } from "@/server/firebase/admin";
import type { DonationDoc, ReportDoc } from "@/types/firestore";
import { runAction } from "./run-action";

/**
 * Admin-only actions. Authorisation happens HERE on the server via the `admin` custom claim
 * (verified from the session cookie). Hiding buttons in the UI is never relied upon for security.
 */

export async function moderateDonation(input: unknown): Promise<ActionResult> {
  return runAction(moderateDonationSchema, input, async ({ donationId, decision, reason }) => {
    const admin = await requireAdmin();
    const db = adminDb();
    const ref = db.collection(COLLECTIONS.donations).doc(donationId);

    const donorId = await db.runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      if (!snap.exists) throw new AppError("not-found", "Donation not found.");
      const donation = snap.data() as DonationDoc;
      if (donation.moderation.state !== "pending") throw new AppError("conflict", "This donation was already reviewed.");

      const now = FieldValue.serverTimestamp();
      const approved = decision === "approve";
      tx.update(ref, {
        moderation: { state: approved ? "approved" : "rejected", reason: reason ?? null, reviewedBy: admin.uid, reviewedAt: now },
        updatedAt: now,
      });
      // Count it only if it's still up for grabs (the owner may have removed it while it waited for review).
      if (approved && (donation.status === "available" || donation.status === "reserved")) {
        tx.update(db.collection(COLLECTIONS.categories).doc(donation.categoryId), { itemCount: FieldValue.increment(1) });
      }
      queueNotification(tx, donation.donorId, approved
        ? { type: "donation_approved", title: "Your item is live", body: `“${donation.title}” is now visible to people nearby.`, link: `/donations/${donationId}`, actorId: null }
        : { type: "donation_rejected", title: "Your item needs changes", body: reason ? `“${donation.title}”: ${reason}` : `“${donation.title}” couldn't be published. Please review our guidelines.`, link: "/contact#faq", actorId: null });
      return donation.donorId;
    });
    invalidateDonation(donationId, donorId);
  });
}

export async function resolveReport(input: unknown): Promise<ActionResult> {
  return runAction(resolveReportSchema, input, async ({ reportId, status, resolution }) => {
    const admin = await requireAdmin();
    const db = adminDb();
    const ref = db.collection(COLLECTIONS.reports).doc(reportId);

    await db.runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      if (!snap.exists) throw new AppError("not-found", "Report not found.");
      const report = snap.data() as ReportDoc;
      const now = FieldValue.serverTimestamp();
      tx.update(ref, { status, resolution: resolution ?? null, resolvedBy: admin.uid, updatedAt: now });
      if (status !== "reviewing") {
        queueNotification(tx, report.reporterId, {
          type: "report_update",
          title: "Update on your report",
          body: status === "resolved" ? "Thank you — we've taken action on what you reported." : "We reviewed your report and found no violation.",
          link: "/contact",
          actorId: null,
        });
      }
    });
  });
}

export async function publishStory(input: unknown): Promise<ActionResult> {
  return runAction(publishStorySchema, input, async ({ storyId, featured }) => {
    await requireAdmin();
    const ref = adminDb().collection(COLLECTIONS.successStories).doc(storyId);
    const snap = await ref.get();
    if (!snap.exists) throw new AppError("not-found", "Story not found.");
    await ref.update({ status: "published", featured, publishedAt: FieldValue.serverTimestamp() });
  });
}
