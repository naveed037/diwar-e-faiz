import { ArrowRight, HandHeart } from "lucide-react";
import { Suspense } from "react";
import { ButtonLink } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { SectionHeading } from "@/components/ui/section-heading";
import { ROUTES } from "@/constants/site";
import { DonationGrid } from "@/features/donations/components/donation-grid";
import { getRecentDonations } from "@/server/db/public";

export function RecentDonations() {
  return (
    <section aria-labelledby="recent-heading" className="border-y border-ink-900/5 bg-cream-50 py-20 sm:py-24">
      <Container>
        <SectionHeading
          eyebrow="Fresh on the wall"
          title={<span id="recent-heading">Recently donated items</span>}
          description="Real items from real people. Request one and arrange the handover directly with the donor."
          action={
            <ButtonLink href={ROUTES.donations} variant="outline">
              View all donations
              <ArrowRight className="size-4" aria-hidden />
            </ButtonLink>
          }
        />
        <div className="mt-12">
          <Suspense fallback={<GridSkeleton />}>
            <RecentGrid />
          </Suspense>
        </div>
      </Container>
    </section>
  );
}

async function RecentGrid() {
  const donations = await getRecentDonations(8);
  if (donations.length === 0) {
    return (
      <div className="flex flex-col items-center rounded-4xl border border-dashed border-ink-900/15 bg-white/60 px-6 py-14 text-center">
        <p className="font-display text-xl font-semibold text-ink-900">The wall is waiting for its first gift</p>
        <p className="mt-2 max-w-sm text-sm text-sand-600">Post something you no longer need — it will appear here once reviewed.</p>
        <ButtonLink href={ROUTES.donate} className="mt-6">
          <HandHeart className="size-4" aria-hidden />
          Donate something
        </ButtonLink>
      </div>
    );
  }
  return <DonationGrid donations={donations} />;
}

function GridSkeleton() {
  return (
    <div aria-hidden className="grid animate-pulse gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="aspect-[4/5] rounded-3xl bg-white" />
      ))}
    </div>
  );
}
