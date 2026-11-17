/**
 * Request → accept → chat → withdraw flow against the Firestore emulator (server actions + loaders called directly).
 * Env: FIRESTORE_EMULATOR_HOST, FIREBASE_PROJECT_ID (see README → Testing).
 */
import { Timestamp } from "firebase-admin/firestore";
import { beforeAll, describe, expect, it, vi } from "vitest";
import type { DonationDoc } from "@/types/firestore";

vi.mock("next/cache", () => ({ cacheLife: () => {}, cacheTag: () => {}, updateTag: () => {} }));

// Simulated session: tests switch the signed-in user.
const session = { uid: "" };
vi.mock("@/server/auth/session", () => ({
  requireUser: async () => ({ uid: session.uid, email: `${session.uid}@example.com`, emailVerified: true, isAdmin: false, name: null, picture: null }),
}));

const RUN = `r${Date.now().toString(36)}`;
const DONOR = `donor${RUN}`;
const ASKER = `asker${RUN}`;
const OTHER = `other${RUN}`;
const ITEM = `${RUN}-item`;
const APP = `${ITEM}_${ASKER}`;
const NOTE = "Assalam o alaikum, my daughter starts school next month and needs this.";

type Apps = typeof import("@/server/actions/applications");
type Msgs = typeof import("@/server/actions/messages");
type Loaders = typeof import("@/server/db/requests");
let apps: Apps;
let msgs: Msgs;
let loaders: Loaders;
let db: ReturnType<typeof import("@/server/firebase/admin")["adminDb"]>;

const as = (uid: string) => (session.uid = uid);
const donation = async () => (await db.collection("donations").doc(ITEM).get()).data() as DonationDoc;
const notes = async (uid: string) =>
  (await db.collection("users").doc(uid).collection("notifications").get()).docs.map((d) => d.data() as { type: string; link: string });

beforeAll(async () => {
  if (!process.env.FIRESTORE_EMULATOR_HOST) throw new Error("Set FIRESTORE_EMULATOR_HOST=127.0.0.1:8080");
  apps = await import("@/server/actions/applications");
  msgs = await import("@/server/actions/messages");
  loaders = await import("@/server/db/requests");
  db = (await import("@/server/firebase/admin")).adminDb();

  for (const [uid, name, city] of [
    [DONOR, "Ayesha Donor", "Lahore"],
    [ASKER, "Bilal Asker", "Lahore"],
    [OTHER, "Chand Other", "Karachi"],
  ] as const) {
    await db.collection("users").doc(uid).set({ displayName: name, photoURL: null, city, area: "Gulberg", verified: false, createdAt: Timestamp.now() });
    await db.collection("users").doc(uid).collection("private").doc("profile").set({ email: `${uid}@example.com`, phone: null });
  }
  const now = Timestamp.now();
  const doc: DonationDoc = {
    donorId: DONOR,
    donor: { displayName: "Ayesha Donor", photoURL: null, verified: false },
    title: `${RUN} school bag`,
    description: "Blue school bag in good condition.",
    categoryId: "books",
    condition: "good",
    status: "available",
    moderation: { state: "approved", reason: null, reviewedBy: "admin", reviewedAt: now },
    city: "Lahore",
    area: "Gulberg",
    pickupPreference: "pickup",
    notes: "",
    keywords: [],
    images: [{ path: "", url: "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=400" }],
    applicationCount: 0,
    reservedFor: null,
    createdAt: now,
    updatedAt: now,
    givenAt: null,
  };
  await db.collection("donations").doc(ITEM).set(doc);
});

describe("requests", () => {
  it("a donor can't request their own item", async () => {
    as(DONOR);
    const r = await apps.applyForDonation({ donationId: ITEM, forWhom: "myself", message: NOTE, phone: "03001234567" });
    expect(r).toMatchObject({ ok: false, code: "forbidden" });
  });

  it("requests appear in the donor's inbox and the requester's list, phone hidden until accepted", async () => {
    as(ASKER);
    expect(await apps.applyForDonation({ donationId: ITEM, forWhom: "family", message: NOTE, phone: "03001234567" })).toMatchObject({ ok: true });
    as(OTHER);
    expect(await apps.applyForDonation({ donationId: ITEM, forWhom: "myself", message: NOTE, phone: "03111111111" })).toMatchObject({ ok: true });

    const inbox = await loaders.listRequestsForDonation(DONOR, ITEM);
    expect(inbox.map((r) => r.applicant.displayName).sort()).toEqual(["Bilal Asker", "Chand Other"]);
    expect(inbox.every((r) => r.status === "pending" && r.phone === null)).toBe(true);
    expect(inbox[0]!.applicant.city).toBeTruthy();

    const mine = await loaders.listMyRequests(ASKER);
    expect(mine).toHaveLength(1);
    expect(mine[0]).toMatchObject({ donationId: ITEM, status: "pending", listingStatus: "available", donor: { displayName: "Ayesha Donor" } });

    expect((await donation()).applicationCount).toBe(2);
    expect((await notes(DONOR)).filter((n) => n.type === "application_received").map((n) => n.link)).toEqual([
      `/my-donations/${ITEM}/requests`,
      `/my-donations/${ITEM}/requests`,
    ]);
  });

  it("another user's inbox query returns nothing for this item", async () => {
    expect(await loaders.listRequestsForDonation(OTHER, ITEM)).toEqual([]);
  });

  it("only the donor can accept", async () => {
    as(OTHER);
    expect(await apps.decideApplication({ applicationId: APP, decision: "accept" })).toMatchObject({ ok: false, code: "forbidden" });
  });

  it("accepting reserves the item, reveals the phone and opens a chat", async () => {
    as(DONOR);
    expect(await apps.decideApplication({ applicationId: APP, decision: "accept" })).toMatchObject({ ok: true });
    expect(await donation()).toMatchObject({ status: "reserved", reservedFor: ASKER });

    const inbox = await loaders.listRequestsForDonation(DONOR, ITEM);
    const accepted = inbox.find((r) => r.id === APP)!;
    expect(accepted).toMatchObject({ status: "accepted", phone: "+923001234567" });
    expect(inbox.find((r) => r.id !== APP)).toMatchObject({ status: "pending", phone: null });
    expect(inbox[0]!.id).toBe(APP); // accepted first

    // A second acceptance while reserved is refused.
    expect(await apps.decideApplication({ applicationId: `${ITEM}_${OTHER}`, decision: "accept" })).toMatchObject({ ok: false });

    expect(await loaders.getConversation(ASKER, APP)).toMatchObject({ role: "requester", open: true, other: { displayName: "Ayesha Donor" } });
    expect(await loaders.getConversation(DONOR, APP)).toMatchObject({ role: "donor", open: true });
    expect(await loaders.getConversation(OTHER, APP)).toBeNull();
    expect((await notes(ASKER)).find((n) => n.type === "application_accepted")?.link).toBe(`/messages/${APP}`);
  });

  it("participants can chat; unread counts track and reset; outsiders are refused", async () => {
    as(ASKER);
    expect(await msgs.sendMessage({ conversationId: APP, text: "JazakAllah! When can I collect it?" })).toMatchObject({ ok: true });
    as(DONOR);
    expect(await msgs.sendMessage({ conversationId: APP, text: "Tomorrow after Asr, near Liberty Market." })).toMatchObject({ ok: true });
    as(ASKER);
    expect(await msgs.sendMessage({ conversationId: APP, text: "Perfect, see you then." })).toMatchObject({ ok: true });

    const donorList = await loaders.listMyConversations(DONOR);
    expect(donorList).toHaveLength(1);
    expect(donorList[0]).toMatchObject({ id: APP, unread: 2, role: "donor", lastMessage: { text: "Perfect, see you then.", mine: false } });
    expect((await loaders.listMyConversations(ASKER))[0]).toMatchObject({ unread: 1, lastMessage: { mine: true } });

    as(DONOR);
    await msgs.markConversationRead({ conversationId: APP });
    expect((await loaders.listMyConversations(DONOR))[0]!.unread).toBe(0);

    const stored = await db.collection("conversations").doc(APP).collection("messages").orderBy("createdAt").get();
    expect(stored.docs.map((d) => d.get("text"))).toHaveLength(3);

    as(OTHER);
    expect(await msgs.sendMessage({ conversationId: APP, text: "Let me in" })).toMatchObject({ ok: false, code: "forbidden" });
    expect(await msgs.markConversationRead({ conversationId: APP })).toMatchObject({ ok: false });
    expect(await loaders.listMyConversations(OTHER)).toEqual([]);
  });

  it("withdrawing releases the item, closes the chat and lowers the request count", async () => {
    as(ASKER);
    expect(await apps.withdrawApplication({ applicationId: APP })).toMatchObject({ ok: true });
    expect(await donation()).toMatchObject({ status: "available", reservedFor: null, applicationCount: 1 });
    expect(await loaders.getConversation(ASKER, APP)).toMatchObject({ open: false });
    expect(await msgs.sendMessage({ conversationId: APP, text: "Hello?" })).toMatchObject({ ok: false });
    expect((await loaders.listMyRequests(ASKER))[0]!.status).toBe("withdrawn");
    expect((await notes(DONOR)).some((n) => n.link === `/my-donations/${ITEM}/requests` && n.type === "application_declined")).toBe(true);
  });

  it("declining tells the requester and points them to My requests", async () => {
    as(DONOR);
    expect(await apps.decideApplication({ applicationId: `${ITEM}_${OTHER}`, decision: "decline" })).toMatchObject({ ok: true });
    expect((await loaders.listMyRequests(OTHER))[0]!.status).toBe("declined");
    expect((await notes(OTHER)).find((n) => n.type === "application_declined")?.link).toBe("/requests");
  });
});
