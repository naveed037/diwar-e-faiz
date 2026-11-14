import type { CITIES } from "@/constants/site";

export type City = (typeof CITIES)[number];

export type CategorySlug =
  | "clothing"
  | "books"
  | "furniture"
  | "electronics"
  | "kids"
  | "kitchen"
  | "footwear"
  | "mobility";

export type Category = {
  slug: CategorySlug;
  name: string;
  nameUrdu: string;
  description: string;
  /** Lucide icon name, resolved in the UI layer so data stays serialisable. */
  icon: string;
};

export type ItemCondition = "new" | "like-new" | "good" | "fair";

/** Statuses a member of the public can see. Pending, rejected and removed listings are never public. */
export type PublicStatus = "available" | "reserved" | "given";

/** Serializable, public-safe view of a Firestore donation (no moderation data, no private donor data). */
export type PublicDonation = {
  id: string;
  title: string;
  description: string;
  categoryId: CategorySlug;
  condition: ItemCondition;
  status: PublicStatus;
  city: City;
  area: string;
  pickupPreference: "pickup" | "delivery" | "either";
  notes: string;
  images: string[];
  donor: { id: string; displayName: string; photoURL: string | null; verified: boolean };
  applicationCount: number;
  /** ISO string; rendered as an absolute date so server and client output match. */
  createdAt: string | null;
};

/** Public profile of a member. Email, phone and preferences are private and never included. */
export type PublicProfile = {
  uid: string;
  displayName: string;
  photoURL: string | null;
  city: City | null;
  area: string | null;
  bio: string;
  verified: boolean;
  stats: { donated: number; received: number };
  memberSince: string | null;
};

export type BrowseFilters = {
  q?: string;
  category?: CategorySlug;
  city?: City;
  condition?: ItemCondition;
};

export type BrowsePage = {
  items: PublicDonation[];
  /** Pass back to load the next page; null when there is nothing more. */
  nextCursor: string | null;
  /** False when Firebase isn't configured yet (UI shows a friendly notice). */
  available: boolean;
};

export type SuccessStory = {
  id: string;
  quote: string;
  name: string;
  initials: string;
  role: string;
  city: City;
  item: string;
};
