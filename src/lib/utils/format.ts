import type { ItemCondition } from "@/types/donation";

const dateFormatter = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "Asia/Karachi",
});

/** Deterministic absolute date (no "x hours ago") so prerendered HTML never drifts from hydration. */
export function formatDate(iso: string) {
  return dateFormatter.format(new Date(iso));
}

export const CONDITION_LABEL: Record<ItemCondition, string> = {
  new: "New",
  "like-new": "Like new",
  good: "Good",
  fair: "Fair",
};

export function formatNumber(value: number) {
  return new Intl.NumberFormat("en-US").format(value);
}

/** Build a sized Unsplash URL from a base photo URL. */
export function photo(id: string, width = 1200) {
  return `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${width}&q=80`;
}

const dateTimeFormatter = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  hour: "numeric",
  minute: "2-digit",
  hour12: true,
  timeZone: "Asia/Karachi",
});

/** "17 Nov, 4:05 pm" in Pakistan time (deterministic on server and client). */
export function formatDateTime(iso: string) {
  return dateTimeFormatter.format(new Date(iso));
}
