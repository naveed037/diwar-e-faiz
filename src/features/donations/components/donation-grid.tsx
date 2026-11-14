import { cn } from "@/lib/utils/cn";
import type { PublicDonation } from "@/types/donation";
import { DonationCard } from "./donation-card";

export function DonationGrid({
  donations,
  priorityCount = 0,
  columns = 4,
}: {
  donations: PublicDonation[];
  priorityCount?: number;
  /** Max columns on wide screens: 4 for full-width sections, 3 next to a sidebar. */
  columns?: 3 | 4;
}) {
  return (
    <ul className={cn("grid gap-5 sm:grid-cols-2 sm:gap-6", columns === 4 ? "lg:grid-cols-3 xl:grid-cols-4" : "xl:grid-cols-3")}>
      {donations.map((d, i) => (
        <li key={d.id} className="flex *:w-full">
          <DonationCard donation={d} priority={i < priorityCount} />
        </li>
      ))}
    </ul>
  );
}
