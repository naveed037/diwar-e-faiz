/**
 * Seeds reference data:      npm run firebase:seed
 *   - categories (from src/constants/categories.ts) and recomputed live item counts
 * Optional demo data:        npm run firebase:seed -- --demo
 *   - one demo donor + sample listings (approved) and sample success stories (published).
 *     The stories use made-up names, so NEVER use --demo on a production project.
 * Sample listings only:      npm run firebase:seed -- --demo-listings
 *   - the demo donor + sample listings, without the made-up success stories.
 * Remove demo data:          npm run firebase:seed -- --remove-demo
 *
 * Idempotent: re-running updates the same documents.
 */
import "./load-env";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { CATEGORIES } from "@/constants/categories";
import { sampleDonations } from "@/data/mock/donations";
import { stories } from "@/data/mock/stories";
import { COLLECTIONS, PRIVATE_PROFILE_DOC } from "@/lib/firebase/collections";
import { buildKeywords } from "@/lib/search";
import { adminDb } from "@/server/firebase/admin";
import type { DonationDoc, UserDoc } from "@/types/firestore";

const DEMO_DONOR_ID = "demoDonor";

async function seedReferenceData() {
  const db = adminDb();
  const batch = db.batch();
  CATEGORIES.forEach((c, order) => {
    const { slug, ...rest } = c;
    batch.set(db.collection(COLLECTIONS.categories).doc(slug), { ...rest, order, active: true }, { merge: true });
  });
  await batch.commit();
  console.log(`✔ ${CATEGORIES.length} categories`);
}

async function seedDemoStories() {
  const db = adminDb();
  const batch = db.batch();
  for (const s of stories) {
    batch.set(
      db.collection(COLLECTIONS.successStories).doc(`seed-${s.id}`),
      {
        authorId: "seed",
        donationId: null,
        quote: s.quote,
        displayName: s.name,
        initials: s.initials,
        role: s.role,
        city: s.city,
        itemLabel: s.item,
        status: "published",
        featured: s.id === stories[0]!.id,
        createdAt: FieldValue.serverTimestamp(),
        publishedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
  }
  await batch.commit();
  console.log(`✔ ${stories.length} demo success stories`);
}

async function seedDemoListings() {
  const db = adminDb();
  const batch = db.batch();
  const now = FieldValue.serverTimestamp();
  const donor: UserDoc = {
    displayName: "Diwar-e-Faiz Demo",
    photoURL: null,
    city: "Lahore",
    area: "Model Town",
    bio: "Demo account with sample listings. Remove with: npm run firebase:seed -- --remove-demo",
    verified: true,
    stats: { donated: 0, received: 0 },
    createdAt: now,
    updatedAt: now,
  };
  const userRef = db.collection(COLLECTIONS.users).doc(DEMO_DONOR_ID);
  batch.set(userRef, donor);
  batch.set(userRef.collection(COLLECTIONS.userPrivate).doc(PRIVATE_PROFILE_DOC), { email: "", phone: null, notificationPrefs: { email: false }, updatedAt: now });

  for (const s of sampleDonations) {
    const doc: DonationDoc = {
      donorId: DEMO_DONOR_ID,
      donor: { displayName: donor.displayName, photoURL: null, verified: true },
      title: s.title,
      description: s.description,
      categoryId: s.category,
      condition: s.condition,
      status: s.status,
      moderation: { state: "approved", reason: null, reviewedBy: "seed", reviewedAt: now },
      city: s.city,
      area: s.area,
      pickupPreference: "either",
      notes: s.pickup,
      keywords: buildKeywords({ title: s.title, categoryId: s.category, city: s.city, area: s.area }),
      images: s.images.map((url) => ({ path: "", url })),
      applicationCount: 0,
      reservedFor: null,
      createdAt: Timestamp.fromDate(new Date(s.postedAt)),
      updatedAt: now,
      givenAt: s.status === "given" ? now : null,
    };
    batch.set(db.collection(COLLECTIONS.donations).doc(`demo-${s.id}`), doc);
  }
  await batch.commit();
  console.log(`✔ demo donor + ${sampleDonations.length} demo listings`);
}

async function removeDemoListings() {
  const db = adminDb();
  const snap = await db.collection(COLLECTIONS.donations).where("donorId", "==", DEMO_DONOR_ID).get();
  const batch = db.batch();
  snap.docs.forEach((d) => batch.delete(d.ref));
  batch.delete(db.collection(COLLECTIONS.users).doc(DEMO_DONOR_ID).collection(COLLECTIONS.userPrivate).doc(PRIVATE_PROFILE_DOC));
  batch.delete(db.collection(COLLECTIONS.users).doc(DEMO_DONOR_ID));
  for (const s of stories) batch.delete(db.collection(COLLECTIONS.successStories).doc(`seed-${s.id}`));
  await batch.commit();
  console.log(`✔ removed ${snap.size} demo listings`);
}

/** Recomputes categories/{slug}.itemCount from real data (approved and available/reserved). */
async function recountCategories() {
  const db = adminDb();
  for (const c of CATEGORIES) {
    const count = await db
      .collection(COLLECTIONS.donations)
      .where("moderation.state", "==", "approved")
      .where("categoryId", "==", c.slug)
      .where("status", "in", ["available", "reserved"])
      .count()
      .get();
    await db.collection(COLLECTIONS.categories).doc(c.slug).set({ itemCount: count.data().count }, { merge: true });
  }
  console.log("✔ category counts recomputed");
}

async function main() {
  const args = new Set(process.argv.slice(2));
  await seedReferenceData();
  if (args.has("--demo")) {
    await seedDemoListings();
    await seedDemoStories();
  }
  // Listings only (no made-up success stories) — acceptable on a live site; removable with --remove-demo.
  if (args.has("--demo-listings") && !args.has("--demo")) await seedDemoListings();
  if (args.has("--remove-demo")) await removeDemoListings();
  await recountCategories();
}

main().catch((error) => {
  console.error("Seeding failed:", (error as Error).message);
  process.exit(1);
});
