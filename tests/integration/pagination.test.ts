/**
 * Cursor pagination against the Firestore emulator, calling the real server-side reader directly.
 * Run with the same env as discovery.test.ts (FIRESTORE_EMULATOR_HOST, FIREBASE_PROJECT_ID, FIREBASE_STORAGE_BUCKET).
 */
import { Timestamp } from "firebase-admin/firestore";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { buildKeywords } from "@/lib/search";
import type { DonationDoc } from "@/types/firestore";

// `use cache` helpers only work inside a Next.js request; outside it they're no-ops for this test.
vi.mock("next/cache", () => ({ cacheLife: () => {}, cacheTag: () => {}, updateTag: () => {} }));

const RUN = `p${Date.now().toString(36)}`;
const TOTAL = 29; // > 2 pages of 12

type Browse = typeof import("@/server/db/public");
let browse: Browse["browseDonations"];

beforeAll(async () => {
  if (!process.env.FIRESTORE_EMULATOR_HOST) throw new Error("Set FIRESTORE_EMULATOR_HOST=127.0.0.1:8080");
  ({ browseDonations: browse } = await import("@/server/db/public"));
  const { adminDb } = await import("@/server/firebase/admin");
  const db = adminDb();
  const batch = db.batch();
  for (let i = 0; i < TOTAL; i++) {
    // Every 3rd item is "blue", so a two-word search ("RUN blue") must filter in memory across pages.
    const title = `${RUN} ${i % 3 === 0 ? "blue" : "red"} item ${i}`;
    const doc: DonationDoc = {
      donorId: "pager",
      donor: { displayName: "Pager", photoURL: null, verified: false },
      title,
      description: "Test item",
      categoryId: "kitchen",
      condition: "good",
      status: i === 5 ? "reserved" : "available", // one non-available item in the middle
      moderation: { state: "approved", reason: null, reviewedBy: null, reviewedAt: null },
      city: "Multan",
      area: "Gulgasht",
      pickupPreference: "pickup",
      notes: "",
      keywords: buildKeywords({ title, categoryId: "kitchen", city: "Multan", area: "Gulgasht" }),
      images: [],
      applicationCount: 0,
      reservedFor: null,
      createdAt: Timestamp.fromMillis(1_700_000_000_000 + (TOTAL - i) * 1000), // item 0 is newest
      updatedAt: Timestamp.now(),
      givenAt: null,
    };
    batch.set(db.collection("donations").doc(`${RUN}-${i}`), doc);
  }
  await batch.commit();
});

async function collectAll(q: string) {
  const pages: string[][] = [];
  let cursor: string | null = null;
  do {
    const page = await browse({ q }, cursor);
    pages.push(page.items.map((d) => d.title));
    cursor = page.nextCursor;
  } while (cursor && pages.length < 10);
  return pages;
}

describe("cursor pagination", () => {
  it("walks every available item exactly once, newest first, 12 per page", async () => {
    const pages = await collectAll(RUN);
    const all = pages.flat();
    const expected = Array.from({ length: TOTAL }, (_, i) => i)
      .filter((i) => i !== 5)
      .map((i) => `${RUN} ${i % 3 === 0 ? "blue" : "red"} item ${i}`);

    expect(pages.map((p) => p.length)).toEqual([12, 12, 4]);
    expect(all).toEqual(expected);
    expect(new Set(all).size).toBe(all.length);
  });

  it("paginates correctly when extra search words are filtered in memory", async () => {
    const all = (await collectAll(`${RUN} blue`)).flat();
    const expected = Array.from({ length: TOTAL }, (_, i) => i)
      .filter((i) => i % 3 === 0)
      .map((i) => `${RUN} blue item ${i}`);
    expect(all).toEqual(expected);
  });

  it("returns no cursor when everything fits on one page", async () => {
    const page = await browse({ q: `${RUN} blue`, city: "Multan", category: "kitchen" });
    expect(page.items.length).toBe(10);
    expect(page.nextCursor).toBeNull();
  });
});
