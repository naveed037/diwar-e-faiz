import { Suspense } from "react";
import { Container } from "@/components/ui/container";
import { CITIES } from "@/constants/site";
import { formatNumber } from "@/lib/utils/format";
import { getImpactStats } from "@/server/db/public";

/** Real platform numbers from Firestore aggregate queries (cached for an hour). Hidden until there's data. */
export function ImpactStats({ className }: { className?: string }) {
  return (
    <Suspense fallback={null}>
      <ImpactStatsContent className={className} />
    </Suspense>
  );
}

async function ImpactStatsContent({ className }: { className?: string }) {
  const stats = await getImpactStats();
  if (!stats || stats.given + stats.live === 0) return null;

  const items = [
    { label: "Items given away", value: stats.given },
    { label: "Available right now", value: stats.live },
    { label: "Community members", value: stats.members },
    { label: "Cities served", value: CITIES.length },
  ];

  return (
    <section aria-label="Our impact" className={className}>
      <Container>
        <div className="relative overflow-hidden rounded-4xl bg-faiz-800 px-6 py-12 text-cream-50 sm:px-12">
          <div aria-hidden className="absolute inset-0 bg-jaali opacity-30 invert" />
          <div aria-hidden className="absolute -right-20 -bottom-24 size-72 rounded-full bg-faiz-500/30 blur-3xl" />
          <dl className="relative grid grid-cols-2 gap-x-6 gap-y-10 lg:grid-cols-4">
            {items.map((stat) => (
              <div key={stat.label} className="border-l border-white/15 pl-5">
                <dt className="text-sm text-cream-50/70">{stat.label}</dt>
                <dd className="mt-2 font-display text-4xl font-semibold tracking-tight sm:text-5xl">{formatNumber(stat.value)}</dd>
              </div>
            ))}
          </dl>
        </div>
      </Container>
    </section>
  );
}
