/**
 * Discovery integration test against REAL Firestore data (the Firestore emulator) through the running app.
 * Requires Java 11+ for the Firestore emulator.
 *
 *   1. npx firebase emulators:start --only auth,firestore,storage --project demo-diwar-e-faiz
 *   2. Build & start the app with emulator env (README → Testing → "Emulator app server"), on port 3100
 *   3. npm run test:integration
 *
 * Seeds a uniquely-tagged dataset, then checks browse/search/filters/pagination, details visibility and
 * that donor public profiles never expose private data.
 */
import { deleteApp, initializeApp, type App } from "firebase-admin/app";
import { Timestamp, getFirestore, type Firestore } from "firebase-admin/firestore";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { buildKeywords } from "@/lib/search";
import type { DonationDoc } from "@/types/firestore";

const BASE = process.env.E2E_BASE_URL ?? "http://localhost:3100";
const PROJECT = process.env.FIREBASE_PROJECT_ID ?? "demo-diwar-e-faiz";
const RUN = `t${Date.now().toString(36)}`; // unique token so cached pages from earlier runs never interfere
const DONOR = `donor${RUN}`;

let app: App;
let db: Firestore;

function donation(i: number, over: Partial<DonationDoc> = {}): DonationDoc {
  const title = over.title ?? `${RUN} item ${i}`;
  const base: DonationDoc = {
    donorId: DONOR,
    donor: { displayName: "Test Donor", photoURL: null, verified: true },
    title,
    description: "A perfectly good item for someone who needs it.",
    categoryId: "books",
    condition: "good",
    status: "available",
    moderation: { state: "approved", reason: null, reviewedBy: "test", reviewedAt: null },
    city: "Lahore",
    area: "Model Town",
    pickupPreference: "either",
    notes: "",
    keywords: [],
    images: [{ path: "", url: "https://images.unsplash.com/photo-1512820790803-83ca734da794?w=400" }],
    applicationCount: 0,
    reservedFor: null,
    createdAt: Timestamp.fromMillis(Date.now() - i * 60_000),
    updatedAt: Timestamp.now(),
    givenAt: null,
    ...over,
  };
  base.keywords = buildKeywords({ title: base.title, categoryId: base.categoryId, city: base.city, area: base.area });
  return base;
}

const page = (path: string) => fetch(`${BASE}${path}`).then(async (r) => ({ status: r.status, html: await r.text() }));
const count = (html: string, text: string) => html.split(text).length - 1;

beforeAll(async () => {
  if (!process.env.FIRESTORE_EMULATOR_HOST) throw new Error("Set FIRESTORE_EMULATOR_HOST=127.0.0.1:8080");
  app = initializeApp({ projectId: PROJECT }, `it-${RUN}`);
  db = getFirestore(app);
  const batch = db.batch();
  // 15 plain available books in Lahore → 12 on page one + "Load more".
  for (let i = 0; i < 15; i++) batch.set(db.collection("donations").doc(`${RUN}-b${i}`), donation(i));
  batch.set(db.collection("donations").doc(`${RUN}-sofa`), donation(20, { title: `${RUN} leather sofa`, categoryId: "furniture", city: "Karachi", condition: "like-new" }));
  batch.set(db.collection("donations").doc(`${RUN}-pending`), donation(21, { title: `${RUN} pending secret`, moderation: { state: "pending", reason: null, reviewedBy: null, reviewedAt: null } }));
  batch.set(db.collection("donations").doc(`${RUN}-reserved`), donation(22, { title: `${RUN} reserved chair`, status: "reserved" }));
  batch.set(db.collection("donations").doc(`${RUN}-removed`), donation(23, { title: `${RUN} removed lamp`, status: "removed" }));
  batch.set(db.collection("donations").doc(`${RUN}-given`), donation(24, { title: `${RUN} given bicycle`, status: "given" }));
  batch.set(db.collection("users").doc(DONOR), {
    displayName: "Test Donor", photoURL: null, city: "Lahore", area: "Model Town", bio: "Hello!", verified: true,
    stats: { donated: 3, received: 1 }, createdAt: Timestamp.now(), updatedAt: Timestamp.now(),
  });
  batch.set(db.collection("users").doc(DONOR).collection("private").doc("profile"), {
    email: `secret-${RUN}@example.com`, phone: "+923001112233", notificationPrefs: { email: true }, updatedAt: Timestamp.now(),
  });
  await batch.commit();
});

afterAll(async () => {
  if (app) await deleteApp(app);
});

describe("browse shows only approved, available donations", () => {
  it("excludes pending, reserved, removed and given listings", async () => {
    const { html } = await page(`/donations?q=${RUN}`);
    expect(html).not.toContain(`${RUN} pending secret`);
    expect(html).not.toContain(`${RUN} reserved chair`);
    expect(html).not.toContain(`${RUN} removed lamp`);
    expect(html).not.toContain(`${RUN} given bicycle`);
  });

  it("paginates: 12 results on the first page and offers Load more", async () => {
    const { html } = await page(`/donations?q=${RUN}`);
    // Titles appear several times in the HTML (card text, alt text, RSC payload), so count distinct items.
    const titles = new Set(html.match(new RegExp(`${RUN} (item \\d+|leather sofa)`, "g")));
    expect(titles.size).toBe(12);
    expect(html).toContain("Load more items");
  });
});

describe("search and filters on Firestore data", () => {
  it("searches by item name, including partial words", async () => {
    expect((await page(`/donations?q=${RUN}+sofa`)).html).toContain(`${RUN} leather sofa`);
    const partial = await page(`/donations?q=${RUN}+leat`);
    expect(partial.html).toContain(`${RUN} leather sofa`);
    expect(partial.html).not.toContain(`${RUN} item 1<`);
  });

  it("filters by category, city and condition", async () => {
    for (const qs of ["category=furniture", "city=Karachi", "condition=like-new"]) {
      const { html } = await page(`/donations?q=${RUN}&${qs}`);
      expect(html, qs).toContain(`${RUN} leather sofa`);
      expect(count(html, `${RUN} item `), qs).toBe(0);
    }
  });
});

describe("details and donor profiles", () => {
  it("opens public donations and hides non-public ones", async () => {
    expect((await page(`/donations/${RUN}-sofa`)).html).toContain(`${RUN} leather sofa`);
    expect((await page(`/donations/${RUN}-given`)).html).toContain("Given away");
    for (const hidden of ["pending", "removed"]) {
      const { html } = await page(`/donations/${RUN}-${hidden}`);
      expect(html).not.toContain(`${RUN} ${hidden === "pending" ? "pending secret" : "removed lamp"}`);
    }
  });

  it("shows a public donor profile without private data", async () => {
    const { html } = await page(`/users/${DONOR}`);
    expect(html).toContain("Test Donor");
    expect(html).toContain("Hello!");
    expect(html).not.toContain(`secret-${RUN}@example.com`);
    expect(html).not.toContain("3001112233");
  });
});
