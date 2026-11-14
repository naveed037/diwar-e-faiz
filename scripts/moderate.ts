/**
 * Listing moderation from the command line (admins only; uses the Admin SDK — no admin code in the browser):
 *   npm run admin:moderate -- list
 *   npm run admin:moderate -- approve <donationId>
 *   npm run admin:moderate -- reject <donationId> "Reason shown to the donor"
 */
import "./load-env";
import { FieldValue, type Timestamp } from "firebase-admin/firestore";
import { COLLECTIONS } from "@/lib/firebase/collections";
import { queueNotification } from "@/server/db/notify";
import { adminDb } from "@/server/firebase/admin";
import type { DonationDoc } from "@/types/firestore";

async function list() {
  const snap = await adminDb().collection(COLLECTIONS.donations).where("moderation.state", "==", "pending").limit(50).get();
  if (snap.empty) return console.log("No listings waiting for review.");
  for (const doc of snap.docs) {
    const d = doc.data() as DonationDoc<Timestamp>;
    console.log(`\n${doc.id}\n  ${d.title} — ${d.categoryId}, ${d.condition}, ${d.area}, ${d.city}\n  by ${d.donor.displayName} · ${d.images.length} photo(s)\n  ${d.description.slice(0, 160)}`);
    if (d.notes) console.log(`  notes: ${d.notes.slice(0, 160)}`);
    d.images.forEach((img) => console.log(`  ${img.url}`));
  }
}

async function decide(donationId: string, approve: boolean, reason?: string) {
  const db = adminDb();
  const ref = db.collection(COLLECTIONS.donations).doc(donationId);
  await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists) throw new Error("Listing not found.");
    const d = snap.data() as DonationDoc;
    if (d.moderation.state !== "pending") throw new Error(`Already ${d.moderation.state}.`);
    const now = FieldValue.serverTimestamp();
    tx.update(ref, { moderation: { state: approve ? "approved" : "rejected", reason: reason ?? null, reviewedBy: "cli", reviewedAt: now }, updatedAt: now });
    if (approve && (d.status === "available" || d.status === "reserved")) {
      tx.update(db.collection(COLLECTIONS.categories).doc(d.categoryId), { itemCount: FieldValue.increment(1) });
    }
    queueNotification(tx, d.donorId, approve
      ? { type: "donation_approved", title: "Your item is live", body: `“${d.title}” is now visible to people nearby.`, link: "/my-donations", actorId: null }
      : { type: "donation_rejected", title: "Your item needs changes", body: reason ? `“${d.title}”: ${reason}` : `“${d.title}” couldn't be published.`, link: "/my-donations", actorId: null });
  });
  console.log(`${approve ? "Approved" : "Rejected"} ${donationId}.`);
}

async function main() {
  const [command, id, ...reason] = process.argv.slice(2);
  if (command === "list") return list();
  if ((command === "approve" || command === "reject") && id) return decide(id, command === "approve", reason.join(" ") || undefined);
  console.error('Usage: npm run admin:moderate -- list | approve <id> | reject <id> "reason"');
  process.exit(1);
}

main().catch((error) => {
  console.error("Failed:", (error as Error).message);
  process.exit(1);
});
