/**
 * Firestore security rules tests (run inside the emulator):
 *   npm run test:rules
 * Model under test: clients may only READ; every client WRITE is denied (writes go through server actions).
 */
import { readFileSync } from "node:fs";
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from "@firebase/rules-unit-testing";
import { collection, deleteDoc, doc, getDoc, getDocs, query, setDoc, updateDoc, where } from "firebase/firestore";
import { afterAll, beforeAll, beforeEach, describe, it } from "vitest";

let env: RulesTestEnvironment;

const ALICE = "alice";
const BOB = "bob";
const MALLORY = "mallory";

const donation = (over: Record<string, unknown> = {}) => ({
  donorId: ALICE,
  title: "Winter jackets",
  status: "available",
  moderation: { state: "approved" },
  ...over,
});

beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: "demo-diwar-rules",
    firestore: { rules: readFileSync("firestore.rules", "utf8") },
  });
});

afterAll(async () => {
  await env?.cleanup();
});

beforeEach(async () => {
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    await setDoc(doc(db, "users/alice"), { displayName: "Alice", city: "Lahore", verified: false });
    await setDoc(doc(db, "users/alice/private/profile"), { email: "alice@example.com", phone: "+923001234567" });
    await setDoc(doc(db, "users/alice/notifications/n1"), { title: "Hi", read: false });
    await setDoc(doc(db, "categories/books"), { name: "Books", itemCount: 3 });
    await setDoc(doc(db, "donations/approved"), donation());
    await setDoc(doc(db, "donations/pending"), donation({ moderation: { state: "pending" } }));
    await setDoc(doc(db, "donations/rejected"), donation({ moderation: { state: "rejected" } }));
    await setDoc(doc(db, "donations/removed"), donation({ status: "removed" }));
    await setDoc(doc(db, "donations/given"), donation({ status: "given" }));
    await setDoc(doc(db, "applications/approved_bob"), { donationId: "approved", donorId: ALICE, applicantId: BOB, status: "pending" });
    await setDoc(doc(db, "conversations/approved_bob"), { participantIds: [ALICE, BOB], donorId: ALICE, applicantId: BOB });
    await setDoc(doc(db, "conversations/approved_bob/messages/m1"), { senderId: BOB, text: "Salaam!" });
    await setDoc(doc(db, "reports/bob_donation_approved"), { reporterId: BOB, targetType: "donation", targetId: "approved", status: "open" });
    await setDoc(doc(db, "successStories/published"), { authorId: BOB, status: "published", quote: "Thank you" });
    await setDoc(doc(db, "successStories/pending"), { authorId: BOB, status: "pending", quote: "Draft" });
    await setDoc(doc(db, "_healthchecks/x"), { ok: true });
  });
});

const anon = () => env.unauthenticatedContext().firestore();
const as = (uid: string, claims: Record<string, unknown> = {}) => env.authenticatedContext(uid, claims).firestore();

describe("users", () => {
  it("public profiles are readable by anyone", async () => {
    await assertSucceeds(getDoc(doc(anon(), "users/alice")));
  });

  it("private profile (email, phone) is readable only by its owner or an admin", async () => {
    await assertSucceeds(getDoc(doc(as(ALICE), "users/alice/private/profile")));
    await assertSucceeds(getDoc(doc(as(MALLORY, { admin: true }), "users/alice/private/profile")));
    await assertFails(getDoc(doc(as(BOB), "users/alice/private/profile")));
    await assertFails(getDoc(doc(anon(), "users/alice/private/profile")));
  });

  it("a fake admin claim name doesn't work — only admin == true", async () => {
    await assertFails(getDoc(doc(as(MALLORY, { admin: "true" }), "users/alice/private/profile")));
    await assertFails(getDoc(doc(as(MALLORY, { role: "admin" }), "users/alice/private/profile")));
  });

  it("notifications are readable only by their owner", async () => {
    await assertSucceeds(getDoc(doc(as(ALICE), "users/alice/notifications/n1")));
    await assertFails(getDoc(doc(as(BOB), "users/alice/notifications/n1")));
  });

  it("nobody can write profiles directly — not even the owner (e.g. to set verified: true)", async () => {
    await assertFails(updateDoc(doc(as(ALICE), "users/alice"), { verified: true }));
    await assertFails(setDoc(doc(as(BOB), "users/bob"), { displayName: "Bob" }));
    await assertFails(setDoc(doc(as(ALICE), "users/alice/private/profile"), { phone: "x" }));
    await assertFails(updateDoc(doc(as(ALICE), "users/alice/notifications/n1"), { read: true }));
  });
});

describe("donations", () => {
  it("approved, non-removed listings are public", async () => {
    await assertSucceeds(getDoc(doc(anon(), "donations/approved")));
    await assertSucceeds(getDoc(doc(anon(), "donations/given")));
  });

  it("pending, rejected and removed listings are hidden from the public and other users", async () => {
    for (const id of ["pending", "rejected", "removed"]) {
      await assertFails(getDoc(doc(anon(), `donations/${id}`)));
      await assertFails(getDoc(doc(as(BOB), `donations/${id}`)));
    }
  });

  it("the donor and admins can see their non-public listings", async () => {
    for (const id of ["pending", "rejected", "removed"]) {
      await assertSucceeds(getDoc(doc(as(ALICE), `donations/${id}`)));
      await assertSucceeds(getDoc(doc(as(MALLORY, { admin: true }), `donations/${id}`)));
    }
  });

  it("public list queries must be constrained to approved listings", async () => {
    await assertSucceeds(getDocs(query(collection(anon(), "donations"), where("moderation.state", "==", "approved"), where("status", "==", "available"))));
    await assertFails(getDocs(collection(anon(), "donations")));
    await assertSucceeds(getDocs(query(collection(as(ALICE), "donations"), where("donorId", "==", ALICE))));
  });

  it("no client can create, edit, approve or delete listings (server actions only)", async () => {
    await assertFails(setDoc(doc(as(ALICE), "donations/new"), donation()));
    await assertFails(updateDoc(doc(as(ALICE), "donations/approved"), { title: "changed" }));
    await assertFails(updateDoc(doc(as(ALICE), "donations/pending"), { moderation: { state: "approved" } }));
    await assertFails(updateDoc(doc(as(BOB), "donations/approved"), { status: "removed" }));
    await assertFails(deleteDoc(doc(as(ALICE), "donations/approved")));
    await assertFails(setDoc(doc(as(ALICE), "donations/priced"), donation({ price: 5000 })));
  });
});

describe("applications, conversations and messages", () => {
  it("requests are visible only to the donor and the applicant", async () => {
    await assertSucceeds(getDoc(doc(as(ALICE), "applications/approved_bob")));
    await assertSucceeds(getDoc(doc(as(BOB), "applications/approved_bob")));
    await assertFails(getDoc(doc(as(MALLORY), "applications/approved_bob")));
    await assertFails(getDoc(doc(anon(), "applications/approved_bob")));
  });

  it("conversations and messages are visible only to participants", async () => {
    await assertSucceeds(getDoc(doc(as(BOB), "conversations/approved_bob")));
    await assertSucceeds(getDoc(doc(as(ALICE), "conversations/approved_bob/messages/m1")));
    await assertFails(getDoc(doc(as(MALLORY), "conversations/approved_bob")));
    await assertFails(getDoc(doc(as(MALLORY), "conversations/approved_bob/messages/m1")));
  });

  it("clients cannot accept requests or send messages directly", async () => {
    await assertFails(updateDoc(doc(as(ALICE), "applications/approved_bob"), { status: "accepted" }));
    await assertFails(setDoc(doc(as(MALLORY), "applications/approved_mallory"), { donationId: "approved", applicantId: MALLORY }));
    await assertFails(setDoc(doc(as(BOB), "conversations/approved_bob/messages/m2"), { senderId: BOB, text: "hi" }));
  });
});

describe("reports, stories, categories and unknown collections", () => {
  it("reports are visible only to the reporter and admins", async () => {
    await assertSucceeds(getDoc(doc(as(BOB), "reports/bob_donation_approved")));
    await assertSucceeds(getDoc(doc(as(MALLORY, { admin: true }), "reports/bob_donation_approved")));
    await assertFails(getDoc(doc(as(ALICE), "reports/bob_donation_approved")));
  });

  it("only published stories are public", async () => {
    await assertSucceeds(getDoc(doc(anon(), "successStories/published")));
    await assertFails(getDoc(doc(anon(), "successStories/pending")));
    await assertSucceeds(getDoc(doc(as(BOB), "successStories/pending")));
  });

  it("categories are public read-only", async () => {
    await assertSucceeds(getDoc(doc(anon(), "categories/books")));
    await assertFails(updateDoc(doc(as(MALLORY, { admin: true }), "categories/books"), { itemCount: 999 }));
  });

  it("anything else is denied", async () => {
    await assertFails(getDoc(doc(as(ALICE, { admin: true }), "_healthchecks/x")));
    await assertFails(setDoc(doc(as(ALICE), "random/doc"), { a: 1 }));
  });
});
