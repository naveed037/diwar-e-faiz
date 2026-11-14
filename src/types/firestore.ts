/**
 * Firestore document shapes. These mirror firestore.rules and the server-side zod schemas.
 * `T` is the timestamp type: Firestore `Timestamp` when reading, `FieldValue` (serverTimestamp) when writing.
 */
import type { CategorySlug, City, ItemCondition } from "./donation";

export type ModerationState = "pending" | "approved" | "rejected";
export type PickupPreference = "pickup" | "delivery" | "either";
/** Lifecycle of a listing. Every listing is free — there is deliberately no price field anywhere. */
export type ListingStatus = "available" | "reserved" | "given" | "removed";
export type ApplicationStatus = "pending" | "accepted" | "declined" | "withdrawn" | "completed";
export type RecipientType = "myself" | "family" | "organisation" | "someone";
export type ReportTarget = "donation" | "user" | "message";
export type ReportReason = "spam" | "scam" | "prohibited" | "inappropriate" | "harassment" | "other";
export type ReportStatus = "open" | "reviewing" | "resolved" | "dismissed";
export type NotificationType =
  | "application_received"
  | "application_accepted"
  | "application_declined"
  | "message"
  | "donation_approved"
  | "donation_rejected"
  | "donation_given"
  | "report_update";

/** users/{uid} — public profile. */
export type UserDoc<T = unknown> = {
  displayName: string;
  photoURL: string | null;
  city: City | null;
  area: string | null;
  bio: string;
  verified: boolean;
  stats: { donated: number; received: number };
  createdAt: T;
  updatedAt: T;
};

/** users/{uid}/private/profile — owner and server only. */
export type UserPrivateDoc<T = unknown> = {
  email: string;
  phone: string | null;
  notificationPrefs: { email: boolean };
  updatedAt: T;
};

export type DonationImage = { path: string; url: string };

/** donations/{donationId} */
export type DonationDoc<T = unknown> = {
  donorId: string;
  donor: { displayName: string; photoURL: string | null; verified: boolean };
  title: string;
  description: string;
  categoryId: CategorySlug;
  condition: ItemCondition;
  status: ListingStatus;
  moderation: { state: ModerationState; reason: string | null; reviewedBy: string | null; reviewedAt: T | null };
  city: City;
  area: string;
  pickupPreference: PickupPreference;
  /** Optional extra info from the donor (pickup times, sizes, etc.). */
  notes: string;
  keywords: string[];
  images: DonationImage[];
  applicationCount: number;
  reservedFor: string | null;
  createdAt: T;
  updatedAt: T;
  givenAt: T | null;
};

/** applications/{donationId}_{applicantId} */
export type ApplicationDoc<T = unknown> = {
  donationId: string;
  donorId: string;
  applicantId: string;
  donation: { title: string; image: string | null };
  applicant: { displayName: string; photoURL: string | null };
  forWhom: RecipientType;
  message: string;
  status: ApplicationStatus;
  createdAt: T;
  updatedAt: T;
  decidedAt: T | null;
};

/** conversations/{applicationId} */
export type ConversationDoc<T = unknown> = {
  participantIds: [string, string];
  donorId: string;
  applicantId: string;
  donationId: string;
  applicationId: string;
  donationTitle: string;
  lastMessage: { text: string; senderId: string; sentAt: T } | null;
  unread: Record<string, number>;
  createdAt: T;
  updatedAt: T;
};

/** conversations/{conversationId}/messages/{messageId} */
export type MessageDoc<T = unknown> = {
  senderId: string;
  text: string;
  createdAt: T;
};

/** users/{uid}/notifications/{notificationId} */
export type NotificationDoc<T = unknown> = {
  type: NotificationType;
  title: string;
  body: string;
  link: string;
  actorId: string | null;
  read: boolean;
  createdAt: T;
};

/** categories/{slug} */
export type CategoryDoc = {
  name: string;
  nameUrdu: string;
  description: string;
  icon: string;
  order: number;
  active: boolean;
  itemCount: number;
};

/** reports/{reporterId}_{targetType}_{targetId} */
export type ReportDoc<T = unknown> = {
  reporterId: string;
  targetType: ReportTarget;
  targetId: string;
  reason: ReportReason;
  details: string;
  status: ReportStatus;
  resolution: string | null;
  resolvedBy: string | null;
  createdAt: T;
  updatedAt: T;
};

/** successStories/{storyId} */
export type SuccessStoryDoc<T = unknown> = {
  authorId: string;
  donationId: string | null;
  quote: string;
  displayName: string;
  initials: string;
  role: string;
  city: City;
  itemLabel: string;
  status: "pending" | "published";
  featured: boolean;
  createdAt: T;
  publishedAt: T | null;
};
