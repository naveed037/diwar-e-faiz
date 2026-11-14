"use client";

import { HandHeart, Inbox, MapPin, MessageSquareText, PackageOpen } from "lucide-react";
import Image from "next/image";
import { useMemo, useState } from "react";
import { ButtonLink } from "@/components/ui/button";
import { CategoryIcon } from "@/components/ui/category-icon";
import { cn } from "@/lib/utils/cn";
import { CONDITION_LABEL, formatDate } from "@/lib/utils/format";
import type { OwnerDonation } from "@/server/db/donations";
import type { Category } from "@/types/donation";
import { STATUS_META, displayStatus, type DisplayStatus } from "../lib/display-status";
import { ListingActions } from "./listing-actions";

type Tab = "all" | DisplayStatus;
const TABS: { key: Tab; label: string }[] = [
  { key: "all", label: "All" },
  { key: "live", label: "Live" },
  { key: "review", label: "In review" },
  { key: "reserved", label: "Reserved" },
  { key: "given", label: "Given" },
  { key: "changes", label: "Needs changes" },
  { key: "removed", label: "Removed" },
];

const PICKUP_LABEL = { pickup: "Pickup", delivery: "Delivery", either: "Pickup or delivery" } as const;

export function MyDonationsDashboard({
  donations,
  categories,
  highlightId,
}: {
  donations: OwnerDonation[];
  categories: Category[];
  highlightId?: string | null;
}) {
  const [tab, setTab] = useState<Tab>("all");
  const categoryById = useMemo(() => new Map(categories.map((c) => [c.slug, c])), [categories]);

  const counts = useMemo(() => {
    const c: Record<Tab, number> = { all: donations.length, live: 0, review: 0, changes: 0, reserved: 0, given: 0, removed: 0 };
    donations.forEach((d) => c[displayStatus(d)]++);
    return c;
  }, [donations]);

  const visible = tab === "all" ? donations : donations.filter((d) => displayStatus(d) === tab);
  const requests = donations.reduce((sum, d) => sum + d.applicationCount, 0);

  if (donations.length === 0) {
    return (
      <div className="flex flex-col items-center rounded-4xl border border-dashed border-ink-900/15 bg-white/60 px-6 py-20 text-center">
        <span className="flex size-16 items-center justify-center rounded-2xl bg-faiz-50 text-faiz-700">
          <PackageOpen className="size-8" aria-hidden />
        </span>
        <h2 className="mt-6 font-display text-2xl font-semibold text-ink-900">You haven&apos;t listed anything yet</h2>
        <p className="mt-2 max-w-sm text-sand-600">That jacket, those books, the chair in the corner — someone nearby could really use them.</p>
        <ButtonLink href="/donate" size="lg" className="mt-8">
          <HandHeart className="size-5" aria-hidden />
          Donate your first item
        </ButtonLink>
      </div>
    );
  }

  return (
    <div>
      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "Listings", value: counts.all },
          { label: "Live now", value: counts.live + counts.reserved },
          { label: "Given away", value: counts.given },
          { label: "Requests received", value: requests },
        ].map((s) => (
          <div key={s.label} className="rounded-3xl bg-white p-5 ring-1 ring-ink-900/5">
            <dt className="text-sm text-sand-600">{s.label}</dt>
            <dd className="mt-1 font-display text-3xl font-semibold text-ink-900">{s.value}</dd>
          </div>
        ))}
      </dl>

      <div role="tablist" aria-label="Filter listings" className="scrollbar-none -mx-4 mt-8 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:flex-wrap sm:px-0">
        {TABS.filter((t) => t.key === "all" || counts[t.key] > 0).map((t) => (
          <button
            key={t.key}
            type="button"
            role="tab"
            aria-selected={tab === t.key}
            onClick={() => setTab(t.key)}
            className={cn(
              "inline-flex shrink-0 cursor-pointer items-center gap-2 rounded-full px-4 py-2 text-sm font-medium ring-1 transition",
              tab === t.key ? "bg-faiz-700 text-cream-50 ring-faiz-700" : "bg-white text-ink-700 ring-ink-900/10 hover:ring-ink-900/25",
            )}
          >
            {t.label}
            <span className={cn("rounded-full px-1.5 text-xs", tab === t.key ? "bg-white/20" : "bg-cream-200")}>{counts[t.key]}</span>
          </button>
        ))}
      </div>

      <ul className="mt-6 space-y-4">
        {visible.map((d) => {
          const status = displayStatus(d);
          const meta = STATUS_META[status];
          const category = categoryById.get(d.categoryId);
          return (
            <li
              key={d.id}
              className={cn(
                "flex flex-col gap-5 rounded-4xl bg-white p-4 ring-1 ring-ink-900/5 transition sm:flex-row sm:p-5",
                highlightId === d.id && "ring-2 ring-faiz-500",
                (status === "removed" || status === "given") && "bg-white/70",
              )}
            >
              <div className="relative aspect-[4/3] w-full shrink-0 overflow-hidden rounded-3xl bg-cream-200 sm:w-48">
                {d.images[0] && (
                  <Image
                    src={d.images[0].url}
                    alt={d.title}
                    fill
                    sizes="(min-width: 640px) 192px, 100vw"
                    className={cn("object-cover", (status === "removed" || status === "given") && "grayscale-[50%]")}
                  />
                )}
                {d.images.length > 1 && (
                  <span className="absolute right-2 bottom-2 rounded-full bg-ink-900/70 px-2 py-0.5 text-[11px] font-semibold text-cream-50">
                    {d.images.length} photos
                  </span>
                )}
              </div>

              <div className="flex min-w-0 flex-1 flex-col">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold", meta.tone)}>
                    <span aria-hidden className={cn("size-1.5 rounded-full", meta.dot)} />
                    {meta.label}
                  </span>
                  {category && (
                    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-faiz-700">
                      <CategoryIcon name={category.icon} className="size-3.5" />
                      {category.name}
                    </span>
                  )}
                </div>
                <h2 className="mt-2 text-lg leading-snug font-semibold text-ink-900">{d.title}</h2>
                <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-sand-600">
                  <span className="inline-flex items-center gap-1">
                    <MapPin className="size-3.5" aria-hidden />
                    {d.area}, {d.city}
                  </span>
                  <span>{CONDITION_LABEL[d.condition]}</span>
                  <span>{PICKUP_LABEL[d.pickupPreference]}</span>
                  {d.createdAt && <span>Posted {formatDate(d.createdAt)}</span>}
                </p>

                <p className="mt-2 text-xs text-sand-500">{meta.help}</p>
                {status === "changes" && d.moderation.reason && (
                  <p className="mt-2 rounded-2xl bg-red-50 px-3 py-2 text-sm text-red-700">Reviewer note: {d.moderation.reason}</p>
                )}

                <div className="mt-4 flex flex-col gap-4 border-t border-ink-900/5 pt-4 lg:flex-row lg:items-center lg:justify-between">
                  <p className="inline-flex items-center gap-1.5 text-sm text-ink-700">
                    {d.applicationCount > 0 ? (
                      <>
                        <MessageSquareText className="size-4 text-faiz-600" aria-hidden />
                        {d.applicationCount} {d.applicationCount === 1 ? "request" : "requests"}
                      </>
                    ) : (
                      <>
                        <Inbox className="size-4 text-sand-400" aria-hidden />
                        No requests yet
                      </>
                    )}
                  </p>
                  <ListingActions donation={d} />
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
