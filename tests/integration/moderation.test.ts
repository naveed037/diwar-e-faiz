/**
 * Moderation logic against the Firestore emulator (server action + loaders called directly).
 * Env: FIRESTORE_EMULATOR_HOST, FIREBASE_PROJECT_ID, FIREBASE_STORAGE_BUCKET (see README → Testing).
 */
import { Timestamp } from "firebase-admin/firestore";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { AppError } from "@/lib/errors";
import type { DonationDoc } from "@/types/firestore";

vi.mock("next/cache", () => ({ cacheLife: () => {}, cacheTag: () => {}, updateTag: () => {} }));

// Simulated session: tests switch between an admin and a regular user.
const session = { isAdmin: true };
vi.mock("@/server/auth/session", () => ({
  requireAdmin: async () => {
    if (!session.isAdmin) throw new AppError("forbidden", "You don't have permission to do that.");
    return { uid: "admin1", email: "admin@example.com", emailVerified: true, isAdmin: true, name: null, picture: null };
  },
}));

const RUN = `m${Date.now().toString(36)}`;
const DONOR = `donor${RUN}`;
const CATEGORY = "footwear";

type Admin = typeof import("@/server/actions/admin");
type Loaders = typeof import("@/server/db/admin");
type Db = ReturnType<typeof import("@/server/firebase/admin")["adminDb"]>;
let moderate: Admin["moderateDonation"];
let loaders: Loaders;
let db: Db;

function listing(i: number, over: Partial<DonationDoc> = {}): DonationDoc {
  return {
    donorId: DONOR,
    donor: { displayName: "Mod Donor", photoURL: null, verified: false },
    title: `${RUN} shoes ${i}`,
    description: "Gently used school shoes.",
    categoryId: CATEGORY,
    condition: "good",
    status: "available",
    moderation: { state: "pending", reason: null, reviewedBy: null, reviewedAt: null },
    city: "Peshawar",
    area: "Hayatabad",
    pickupPreference: "pickup",
    notes: "",
    keywords: [],
    images: [{ path: "", url: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400" }],
    applicationCount: 0,
    reservedFor: null,
    createdAt: Timestamp.fromMillis(1_600_000_000_000 + i * 1000),
    updatedAt: Timestamp.fromMillis(1_600_000_000_000 + i * 1000),
    givenAt: null,
    ...over,
  };
}

const categoryCount = async () => ((await db.collection("categories").doc(CATEGORY).get()).get("itemCount") as number) ?? 0;
const notifications = async () =>
  (await db.collection("users").doc(DONOR).collection("notifications").get()).docs.map((d) => d.data() as { type: string; body: string });

beforeAll(async () => {
  if (!process.env.FIRESTORE_EMULATOR_HOST) throw new Error("Set FIRESTORE_EMULATOR_HOST=127.0.0.1:8080");
  ({ moderateDonation: moderate } = await import("@/server/actions/admin"));
  loaders = await import("@/server/db/admin");
  db = (await import("@/server/firebase/admin")).adminDb();
  await db.collection("users").doc(DONOR).set({ displayName: "Mod Donor", photoURL: null, verified: false, createdAt: Timestamp.now() });
  await db.collection("users").doc(DONOR).collection("private").doc("profile").set({ email: `${RUN}@example.com`, phone: null });
  await db.collection("categories").doc(CATEGORY).set({ name: "Footwear", itemCount: 0 }, { merge: true });
});

beforeEach(() => {
  session.isAdmin = true;
});

describe("moderateDonation", () => {
  it("refuses non-admins and changes nothing", async () => {
    await db.collection("donations").doc(`${RUN}-a`).set(listing(1));
    session.isAdmin = false;
    const result = await moderate({ donationId: `${RUN}-a`, decision: "approve" });
    expect(result).toMatchObject({ ok: false, code: "forbidden" });
    expect((await db.collection("donations").doc(`${RUN}-a`).get()).get("moderation.state")).toBe("pending");
  });

  it("approves: listing goes live, category count +1, donor notified", async () => {
    const before = await categoryCount();
    const result = await moderate({ donationId: `${RUN}-a`, decision: "approve" });
    expect(result.ok).toBe(true);
    const doc = (await db.collection("donations").doc(`${RUN}-a`).get()).data() as DonationDoc<Timestamp>;
    expect(doc.moderation.state).toBe("approved");
    expect(doc.moderation.reviewedBy).toBe("admin1");
    expect(doc.moderation.reviewedAt).toBeTruthy();
    expect(await categoryCount()).toBe(before + 1);
    expect((await notifications()).some((n) => n.type === "donation_approved")).toBe(true);
  });

  it("rejects with a reason the donor can see; count unchanged", async () => {
    await db.collection("donations").doc(`${RUN}-b`).set(listing(2));
    const before = await categoryCount();
    const reason = "Photos are missing, unclear or don't show the item.";
    expect((await moderate({ donationId: `${RUN}-b`, decision: "reject", reason })).ok).toBe(true);
    const doc = (await db.collection("donations").doc(`${RUN}-b`).get()).data() as DonationDoc<Timestamp>;
    expect(doc.moderation).toMatchObject({ state: "rejected", reason });
    expect(await categoryCount()).toBe(before);
    expect((await notifications()).some((n) => n.type === "donation_rejected" && n.body.includes(reason))).toBe(true);
  });

  it("can't review the same listing twice", async () => {
    expect(await moderate({ donationId: `${RUN}-a`, decision: "reject", reason: "late" })).toMatchObject({ ok: false, code: "conflict" });
  });

  it("doesn't count a listing the owner removed while it waited for review", async () => {
    await db.collection("donations").doc(`${RUN}-c`).set(listing(3, { status: "removed" }));
    const before = await categoryCount();
    expect((await moderate({ donationId: `${RUN}-c`, decision: "approve" })).ok).toBe(true);
    expect(await categoryCount()).toBe(before);
  });

  it("validates input", async () => {
    expect(await moderate({ donationId: "../etc", decision: "approve" })).toMatchObject({ ok: false, code: "invalid-input" });
    expect(await moderate({ donationId: `${RUN}-x`, decision: "delete" })).toMatchObject({ ok: false, code: "invalid-input" });
    expect(await moderate({ donationId: `${RUN}-missing`, decision: "approve" })).toMatchObject({ ok: false, code: "not-found" });
  });
});

describe("moderation loaders", () => {
  it("list the queue oldest first, with donor details for admins", async () => {
    await db.collection("donations").doc(`${RUN}-new`).set(listing(9));
    await db.collection("donations").doc(`${RUN}-old`).set(listing(0));
    const { items, total } = await loaders.listPendingDonations(500);
    const mine = items.filter((i) => i.id.startsWith(RUN)).map((i) => i.id);
    expect(mine).toEqual([`${RUN}-old`, `${RUN}-new`]);
    expect(total).toBeGreaterThanOrEqual(2);
    const donor = items.find((i) => i.id === `${RUN}-old`)!.donor;
    expect(donor).toMatchObject({ email: `${RUN}@example.com`, approvedCount: 2, rejectedCount: 1 });
  });

  it("refuse non-admins", async () => {
    session.isAdmin = false;
    await expect(loaders.listPendingDonations()).rejects.toMatchObject({ code: "forbidden" });
    await expect(loaders.listRecentlyReviewed()).rejects.toMatchObject({ code: "forbidden" });
  });

  it("show recent decisions newest first", async () => {
    const recent = await loaders.listRecentlyReviewed(50);
    const states = recent.filter((r) => r.id.startsWith(RUN)).map((r) => r.moderation.state);
    expect(states.length).toBe(3);
    expect(recent.every((r) => r.moderation.state !== "pending")).toBe(true);
  });
});
