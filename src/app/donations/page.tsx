import type { Metadata } from "next";
import { Suspense } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { Container } from "@/components/ui/container";
import { CATEGORIES } from "@/constants/categories";
import { BrowseDonations } from "@/features/donations/components/browse-donations";
import { parseBrowseFilters } from "@/lib/validation/browse";
import { browseDonations } from "@/server/db/public";

export const metadata: Metadata = {
  title: "Browse Donations",
  description: "Find free clothes, books, furniture, electronics and more donated by people in your city.",
};

function BrowseFallback() {
  return (
    <div aria-hidden className="animate-pulse">
      <div className="h-16 rounded-full bg-white" />
      <div className="mt-6 flex gap-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-9 w-28 rounded-full bg-white" />
        ))}
      </div>
      <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="aspect-[4/5] rounded-3xl bg-white" />
        ))}
      </div>
    </div>
  );
}

export default function DonationsPage({ searchParams }: PageProps<"/donations">) {
  return (
    <>
      <PageHeader
        crumbs={[{ label: "Home", href: "/" }, { label: "Browse donations" }]}
        eyebrow="Everything here is free"
        title="Find something you need"
        urdu="جو چاہیے، یہاں تلاش کریں"
        description="Search by item name, then narrow down by category, city and condition. Send a short request to the donor — no money ever changes hands."
      />
      <Container className="py-10 sm:py-14">
        {/* Search params are request-time data, so results stream in behind a Suspense boundary. */}
        <Suspense fallback={<BrowseFallback />}>
          <BrowseResults searchParams={searchParams} />
        </Suspense>
      </Container>
    </>
  );
}

async function BrowseResults({ searchParams }: { searchParams: PageProps<"/donations">["searchParams"] }) {
  const filters = parseBrowseFilters(await searchParams);
  const initialPage = await browseDonations(filters);
  return <BrowseDonations key={JSON.stringify(filters)} filters={filters} initialPage={initialPage} categories={CATEGORIES} />;
}
