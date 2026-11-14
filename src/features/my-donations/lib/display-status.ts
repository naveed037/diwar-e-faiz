import type { OwnerDonation } from "@/server/db/donations";

export type DisplayStatus = "live" | "review" | "changes" | "reserved" | "given" | "removed";

/** One owner-facing status combining moderation state and listing lifecycle. */
export function displayStatus(d: Pick<OwnerDonation, "status" | "moderation">): DisplayStatus {
  if (d.status === "removed") return "removed";
  if (d.status === "given") return "given";
  if (d.moderation.state === "pending") return "review";
  if (d.moderation.state === "rejected") return "changes";
  return d.status === "reserved" ? "reserved" : "live";
}

export const STATUS_META: Record<DisplayStatus, { label: string; dot: string; tone: string; help: string }> = {
  live: { label: "Live", dot: "bg-faiz-500", tone: "bg-faiz-50 text-faiz-800", help: "Visible to everyone and open for requests." },
  review: { label: "In review", dot: "bg-saffron-400", tone: "bg-saffron-100 text-saffron-600", help: "We're checking it — usually within a few hours." },
  changes: { label: "Needs changes", dot: "bg-red-500", tone: "bg-red-50 text-red-700", help: "Not published. Edit it to resubmit." },
  reserved: { label: "Reserved", dot: "bg-saffron-400", tone: "bg-saffron-100 text-saffron-600", help: "Promised to someone. Still visible, not open." },
  given: { label: "Given away", dot: "bg-sand-400", tone: "bg-cream-200 text-ink-700", help: "Handed over. Thank you!" },
  removed: { label: "Removed", dot: "bg-sand-400", tone: "bg-cream-200 text-sand-600", help: "Hidden from everyone else. You can relist it." },
};
