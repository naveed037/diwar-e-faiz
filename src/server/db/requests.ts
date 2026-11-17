import "server-only";
import type { Timestamp } from "firebase-admin/firestore";
import { COLLECTIONS, PRIVATE_PROFILE_DOC } from "@/lib/firebase/collections";
import { adminDb } from "@/server/firebase/admin";
import type { City } from "@/types/donation";
import type {
  ApplicationDoc,
  ApplicationStatus,
  ConversationDoc,
  DonationDoc,
  ListingStatus,
  RecipientType,
  UserDoc,
  UserPrivateDoc,
} from "@/types/firestore";

// Every function here takes the uid from the verified session (never from the request) and only
// returns documents that user is a party to. Callers render 404 when null is returned.

const iso = (t: Timestamp | null | undefined) => t?.toDate().toISOString() ?? null;
const validId = (id: string) => /^[A-Za-z0-9_-]{1,160}$/.test(id);

export type PersonSummary = { uid: string; displayName: string; photoURL: string | null; city: City | null; area: string | null };

async function people(uids: string[]): Promise<Map<string, PersonSummary>> {
  const unique = [...new Set(uids)];
  const map = new Map<string, PersonSummary>();
  if (unique.length === 0) return map;
  const db = adminDb();
  const snaps = await db.getAll(...unique.map((uid) => db.collection(COLLECTIONS.users).doc(uid)));
  for (const s of snaps) {
    const u = s.data() as UserDoc | undefined;
    map.set(s.id, {
      uid: s.id,
      displayName: u?.displayName ?? "Diwar-e-Faiz member",
      photoURL: u?.photoURL ?? null,
      city: u?.city ?? null,
      area: u?.area ?? null,
    });
  }
  return map;
}

// ---------- Requests received (donor side) ----------

export type ReceivedRequest = {
  id: string;
  applicant: PersonSummary;
  forWhom: RecipientType;
  message: string;
  status: ApplicationStatus;
  createdAt: string | null;
  /** Only present once the donor has accepted (the requester agreed to share it on acceptance). */
  phone: string | null;
};

/** Requests for one listing. Assumes the caller already verified that `donorUid` owns `donationId`. */
export async function listRequestsForDonation(donorUid: string, donationId: string): Promise<ReceivedRequest[]> {
  if (!validId(donationId)) return [];
  const db = adminDb();
  // Equality-only filters: served by single-field indexes, no composite index needed. Sorted in memory.
  const snap = await db
    .collection(COLLECTIONS.applications)
    .where("donorId", "==", donorUid)
    .where("donationId", "==", donationId)
    .limit(200)
    .get();
  const apps = snap.docs.map((d) => ({ id: d.id, ...(d.data() as ApplicationDoc<Timestamp>) }));
  const who = await people(apps.map((a) => a.applicantId));

  const accepted = apps.filter((a) => a.status === "accepted" || a.status === "completed");
  const phones = new Map<string, string | null>();
  if (accepted.length) {
    const snaps = await db.getAll(
      ...accepted.map((a) =>
        db.collection(COLLECTIONS.users).doc(a.applicantId).collection(COLLECTIONS.userPrivate).doc(PRIVATE_PROFILE_DOC),
      ),
    );
    snaps.forEach((s, i) => phones.set(accepted[i]!.applicantId, (s.data() as UserPrivateDoc | undefined)?.phone ?? null));
  }

  const order: Record<ApplicationStatus, number> = { accepted: 0, completed: 1, pending: 2, declined: 3, withdrawn: 4 };
  return apps
    .map((a) => ({
      id: a.id,
      applicant: who.get(a.applicantId)!,
      forWhom: a.forWhom,
      message: a.message,
      status: a.status,
      createdAt: iso(a.createdAt),
      phone: phones.get(a.applicantId) ?? null,
    }))
    .sort((x, y) => order[x.status] - order[y.status] || (y.createdAt ?? "").localeCompare(x.createdAt ?? ""));
}

// ---------- Requests sent (requester side) ----------

export type SentRequest = {
  id: string;
  donationId: string;
  title: string;
  image: string | null;
  donor: PersonSummary;
  listingStatus: ListingStatus | null;
  forWhom: RecipientType;
  message: string;
  status: ApplicationStatus;
  createdAt: string | null;
  decidedAt: string | null;
};

export async function listMyRequests(uid: string): Promise<SentRequest[]> {
  const db = adminDb();
  const snap = await db
    .collection(COLLECTIONS.applications)
    .where("applicantId", "==", uid)
    .orderBy("createdAt", "desc")
    .limit(100)
    .get();
  const apps = snap.docs.map((d) => ({ id: d.id, ...(d.data() as ApplicationDoc<Timestamp>) }));
  const who = await people(apps.map((a) => a.donorId));
  const donationSnaps = apps.length
    ? await db.getAll(...[...new Set(apps.map((a) => a.donationId))].map((id) => db.collection(COLLECTIONS.donations).doc(id)))
    : [];
  const listing = new Map(donationSnaps.map((s) => [s.id, (s.data() as DonationDoc | undefined)?.status ?? null]));

  return apps.map((a) => ({
    id: a.id,
    donationId: a.donationId,
    title: a.donation.title,
    image: a.donation.image,
    donor: who.get(a.donorId)!,
    listingStatus: listing.get(a.donationId) ?? null,
    forWhom: a.forWhom,
    message: a.message,
    status: a.status,
    createdAt: iso(a.createdAt),
    decidedAt: iso(a.decidedAt),
  }));
}

// ---------- Conversations ----------

export type ConversationSummary = {
  id: string;
  donationId: string;
  donationTitle: string;
  other: PersonSummary;
  role: "donor" | "requester";
  lastMessage: { text: string; mine: boolean; sentAt: string | null } | null;
  unread: number;
  updatedAt: string | null;
};

export async function listMyConversations(uid: string): Promise<ConversationSummary[]> {
  const snap = await adminDb()
    .collection(COLLECTIONS.conversations)
    .where("participantIds", "array-contains", uid)
    .orderBy("updatedAt", "desc")
    .limit(100)
    .get();
  const convs = snap.docs.map((d) => ({ id: d.id, ...(d.data() as ConversationDoc<Timestamp>) }));
  const who = await people(convs.map((c) => c.participantIds.find((p) => p !== uid)!));
  return convs.map((c) => ({
    id: c.id,
    donationId: c.donationId,
    donationTitle: c.donationTitle,
    other: who.get(c.participantIds.find((p) => p !== uid)!)!,
    role: c.donorId === uid ? "donor" : "requester",
    lastMessage: c.lastMessage
      ? { text: c.lastMessage.text, mine: c.lastMessage.senderId === uid, sentAt: iso(c.lastMessage.sentAt) }
      : null,
    unread: c.unread?.[uid] ?? 0,
    updatedAt: iso(c.updatedAt),
  }));
}

export type ConversationDetail = {
  id: string;
  donationId: string;
  donationTitle: string;
  donationImage: string | null;
  listingStatus: ListingStatus | null;
  role: "donor" | "requester";
  other: PersonSummary;
  /** Whether new messages can be sent (the request is still accepted/completed). */
  open: boolean;
};

export async function getConversation(uid: string, conversationId: string): Promise<ConversationDetail | null> {
  if (!validId(conversationId)) return null;
  const db = adminDb();
  const snap = await db.collection(COLLECTIONS.conversations).doc(conversationId).get();
  const conv = snap.data() as ConversationDoc<Timestamp> | undefined;
  if (!conv || !conv.participantIds.includes(uid)) return null;

  const otherId = conv.participantIds.find((p) => p !== uid)!;
  const [who, appSnap, donationSnap] = await Promise.all([
    people([otherId]),
    db.collection(COLLECTIONS.applications).doc(conv.applicationId).get(),
    db.collection(COLLECTIONS.donations).doc(conv.donationId).get(),
  ]);
  const app = appSnap.data() as ApplicationDoc | undefined;
  const donation = donationSnap.data() as DonationDoc | undefined;
  return {
    id: snap.id,
    donationId: conv.donationId,
    donationTitle: conv.donationTitle,
    donationImage: donation?.images[0]?.url ?? app?.donation.image ?? null,
    listingStatus: donation?.status ?? null,
    role: conv.donorId === uid ? "donor" : "requester",
    other: who.get(otherId)!,
    open: app?.status === "accepted" || app?.status === "completed",
  };
}
