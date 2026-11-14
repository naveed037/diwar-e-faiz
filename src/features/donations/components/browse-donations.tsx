"use client";

import { ArrowDownWideNarrow, PackageSearch, Search, SlidersHorizontal, X } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button, ButtonLink } from "@/components/ui/button";
import { CategoryIcon } from "@/components/ui/category-icon";
import { Select } from "@/components/ui/form";
import { CITIES, ROUTES } from "@/constants/site";
import { FormAlert, Spinner } from "@/features/auth/components/auth-bits";
import { cn } from "@/lib/utils/cn";
import { loadMoreDonations } from "@/server/actions/browse";
import type { BrowseFilters, BrowsePage, Category, ItemCondition } from "@/types/donation";
import { DonationGrid } from "./donation-grid";

const CONDITIONS: { value: ItemCondition; label: string }[] = [
  { value: "new", label: "New" },
  { value: "like-new", label: "Like new" },
  { value: "good", label: "Good" },
  { value: "fair", label: "Fair" },
];

/**
 * Browse UI. The URL (?q=&category=&city=&condition=) is the source of truth: changing a filter updates
 * the URL, the server renders the first page from Firestore, and "Load more" fetches further pages
 * with a cursor. The parent re-mounts this component (via `key`) whenever filters change.
 */
export function BrowseDonations({
  filters,
  initialPage,
  categories,
}: {
  filters: BrowseFilters;
  initialPage: BrowsePage;
  categories: Category[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [navigating, startNavigation] = useTransition();
  const [query, setQuery] = useState(filters.q ?? "");
  const [items, setItems] = useState(initialPage.items);
  const [cursor, setCursor] = useState(initialPage.nextCursor);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadError, setLoadError] = useState<string>();
  const [filtersOpen, setFiltersOpen] = useState(false);

  function update(next: Partial<Record<keyof BrowseFilters, string | null>>) {
    const merged = { ...filters, ...next };
    const sp = new URLSearchParams();
    for (const [key, value] of Object.entries(merged)) if (value) sp.set(key, value);
    const qs = sp.toString();
    startNavigation(() => router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false }));
  }

  function reset() {
    setQuery("");
    startNavigation(() => router.replace(pathname, { scroll: false }));
  }

  async function loadMore() {
    if (!cursor) return;
    setLoadingMore(true);
    setLoadError(undefined);
    const result = await loadMoreDonations({ filters, cursor });
    setLoadingMore(false);
    if (!result.ok) return setLoadError(result.message);
    // De-duplicate in case a listing moved between pages while browsing.
    setItems((prev) => {
      const seen = new Set(prev.map((d) => d.id));
      return [...prev, ...result.data.items.filter((d) => !seen.has(d.id))];
    });
    setCursor(result.data.nextCursor);
  }

  const activeFilterCount = [filters.category, filters.city, filters.condition].filter(Boolean).length;
  const hasAnyFilter = activeFilterCount > 0 || Boolean(filters.q);

  if (!initialPage.available) {
    return (
      <FormAlert tone="info">
        Donations are temporarily unavailable. Please try again a little later.
        {process.env.NODE_ENV === "development" && (
          <> (Developer: the server-side FIREBASE_* variables are missing — add them to .env.local or your host&apos;s settings.)</>
        )}
      </FormAlert>
    );
  }

  return (
    <div>
      {/* Search + sort bar */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center">
        <form
          role="search"
          onSubmit={(e) => {
            e.preventDefault();
            update({ q: query.trim() || null });
          }}
          className="flex flex-1 items-center gap-2 rounded-full bg-white p-1.5 pl-5 shadow-soft ring-1 ring-ink-900/5 focus-within:ring-2 focus-within:ring-faiz-500"
        >
          <Search className="size-5 shrink-0 text-sand-500" aria-hidden />
          <label htmlFor="browse-search" className="sr-only">
            Search donations by item name
          </label>
          <input
            id="browse-search"
            type="search"
            value={query}
            maxLength={60}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search for books, sofa, winter jacket…"
            className="h-11 min-w-0 flex-1 bg-transparent text-[15px] text-ink-900 placeholder:text-sand-400 focus:outline-none [&::-webkit-search-cancel-button]:hidden"
          />
          {query && (
            <button
              type="button"
              onClick={() => {
                setQuery("");
                update({ q: null });
              }}
              className="cursor-pointer rounded-full p-2 text-sand-500 hover:bg-cream-200"
              aria-label="Clear search"
            >
              <X className="size-4" />
            </button>
          )}
          <Button type="submit" size="md">
            Search
          </Button>
        </form>

        <div className="flex gap-3">
          <Button
            variant="outline"
            size="md"
            className="h-14 flex-1 md:hidden"
            onClick={() => setFiltersOpen((v) => !v)}
            aria-expanded={filtersOpen}
            aria-controls="browse-filters"
          >
            <SlidersHorizontal className="size-4" aria-hidden />
            Filters{activeFilterCount > 0 && ` (${activeFilterCount})`}
          </Button>
          <p className="flex h-14 flex-1 items-center justify-center gap-2 rounded-full bg-white px-5 text-sm font-medium text-ink-700 ring-1 ring-ink-900/5 md:flex-none">
            <ArrowDownWideNarrow className="size-4 text-sand-500" aria-hidden />
            Newest first
          </p>
        </div>
      </div>

      {/* Category chips */}
      <div className="scrollbar-none -mx-4 mt-6 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0">
        <Chip active={!filters.category} onClick={() => update({ category: null })}>
          All items
        </Chip>
        {categories.map((c) => (
          <Chip
            key={c.slug}
            active={filters.category === c.slug}
            onClick={() => update({ category: filters.category === c.slug ? null : c.slug })}
          >
            <CategoryIcon name={c.icon} className="size-4" />
            {c.name}
          </Chip>
        ))}
      </div>

      <div className="mt-8 grid gap-8 md:grid-cols-[240px_1fr] lg:gap-10">
        <aside id="browse-filters" className={cn("md:block", filtersOpen ? "block" : "hidden")} aria-label="Filters">
          <div className="space-y-6 rounded-3xl bg-white p-5 ring-1 ring-ink-900/5 md:sticky md:top-24">
            <div>
              <label htmlFor="filter-city" className="text-sm font-semibold text-ink-800">
                City
              </label>
              <Select id="filter-city" value={filters.city ?? ""} onChange={(e) => update({ city: e.target.value || null })} className="mt-2">
                <option value="">All cities</option>
                {CITIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </Select>
            </div>

            <fieldset>
              <legend className="text-sm font-semibold text-ink-800">Condition</legend>
              <div className="mt-3 flex flex-wrap gap-2">
                {CONDITIONS.map((c) => (
                  <button
                    key={c.value}
                    type="button"
                    aria-pressed={filters.condition === c.value}
                    onClick={() => update({ condition: filters.condition === c.value ? null : c.value })}
                    className={cn(
                      "cursor-pointer rounded-full px-3 py-1.5 text-sm font-medium ring-1 transition",
                      filters.condition === c.value
                        ? "bg-faiz-700 text-cream-50 ring-faiz-700"
                        : "bg-cream-100 text-ink-700 ring-ink-900/10 hover:ring-ink-900/25",
                    )}
                  >
                    {c.label}
                  </button>
                ))}
              </div>
            </fieldset>

            <p className="rounded-2xl bg-faiz-50 px-3 py-2.5 text-xs leading-relaxed text-faiz-800">
              Showing items that are <strong>available now</strong>. Every item is free.
            </p>

            {hasAnyFilter && (
              <Button variant="secondary" size="sm" className="w-full" onClick={reset}>
                Clear all filters
              </Button>
            )}
          </div>
        </aside>

        <section aria-labelledby="results-heading" aria-busy={navigating} className={cn("transition-opacity", navigating && "opacity-50")}>
          <div className="mb-5 flex items-center gap-3">
            <h2 id="results-heading" className="text-sm text-sand-600" aria-live="polite">
              {filters.q ? (
                <>
                  Results for <span className="font-semibold text-ink-900">“{filters.q}”</span>
                </>
              ) : (
                <>
                  Showing <span className="font-semibold text-ink-900">{items.length}</span> {items.length === 1 ? "item" : "items"}
                  {cursor && " · more below"}
                </>
              )}
            </h2>
            {navigating && <Spinner className="text-faiz-600" />}
          </div>

          {items.length === 0 ? (
            <div className="flex flex-col items-center rounded-3xl border border-dashed border-ink-900/15 bg-white/60 px-6 py-16 text-center">
              <span className="flex size-14 items-center justify-center rounded-2xl bg-faiz-50 text-faiz-700">
                <PackageSearch className="size-7" aria-hidden />
              </span>
              <h3 className="mt-5 font-display text-xl font-semibold text-ink-900">
                {hasAnyFilter ? "Nothing matches yet" : "No items available right now"}
              </h3>
              <p className="mt-2 max-w-sm text-sm text-sand-600">
                {hasAnyFilter
                  ? "Try a different word or clear your filters. New items are added every day."
                  : "Be the first to give something — someone nearby will be grateful."}
              </p>
              <div className="mt-6 flex flex-wrap justify-center gap-3">
                {hasAnyFilter && (
                  <Button variant="outline" onClick={reset}>
                    Clear filters
                  </Button>
                )}
                <ButtonLink href={ROUTES.donate}>Donate an item</ButtonLink>
              </div>
            </div>
          ) : (
            <>
              <DonationGrid donations={items} priorityCount={3} columns={3} />
              {loadError && (
                <div className="mt-6">
                  <FormAlert>{loadError}</FormAlert>
                </div>
              )}
              {cursor ? (
                <div className="mt-10 flex justify-center">
                  <Button variant="outline" size="lg" onClick={loadMore} disabled={loadingMore}>
                    {loadingMore && <Spinner />}
                    {loadingMore ? "Loading…" : "Load more items"}
                  </Button>
                </div>
              ) : (
                items.length > 6 && <p className="mt-10 text-center text-sm text-sand-500">You&apos;ve seen everything for now.</p>
              )}
            </>
          )}
        </section>
      </div>
    </div>
  );
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "inline-flex shrink-0 cursor-pointer items-center gap-2 rounded-full px-4 py-2 text-sm font-medium ring-1 transition",
        active
          ? "bg-faiz-700 text-cream-50 shadow-[0_6px_16px_-8px_rgb(23_67_46/0.6)] ring-faiz-700"
          : "bg-white text-ink-700 ring-ink-900/10 hover:ring-ink-900/25",
      )}
    >
      {children}
    </button>
  );
}
