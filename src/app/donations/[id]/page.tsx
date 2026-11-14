import { Calendar, MapPin, ShieldCheck, Sparkles, StickyNote, Truck, Users } from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Breadcrumbs } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { CategoryIcon } from "@/components/ui/category-icon";
import { Container } from "@/components/ui/container";
import { SectionHeading } from "@/components/ui/section-heading";
import { getCategory } from "@/constants/categories";
import { ROUTES } from "@/constants/site";
import { DonationGallery } from "@/features/donations/components/donation-gallery";
import { DonationGrid } from "@/features/donations/components/donation-grid";
import { RequestItemPanel } from "@/features/donations/components/request-item-panel";
import { StatusBadge } from "@/features/donations/components/status-badge";
import { CONDITION_LABEL, formatDate } from "@/lib/utils/format";
import { getPublicDonation, getPublicProfile, getRelatedDonations } from "@/server/db/public";

const PICKUP_LABEL = { pickup: "Receiver picks up", delivery: "Donor can deliver nearby", either: "Pickup or delivery" } as const;

const SAFETY_TIPS = [
  "Meet in a public place or bring someone along for pickups.",
  "Never pay anyone — every item on Diwar-e-Faiz is free.",
  "Report a listing if something doesn't feel right.",
];

export async function generateMetadata({ params }: PageProps<"/donations/[id]">): Promise<Metadata> {
  const donation = await getPublicDonation((await params).id);
  if (!donation) return { title: "Item not found" };
  return {
    title: donation.title,
    description: donation.description.slice(0, 155),
    openGraph: donation.images[0] ? { images: [donation.images[0]] } : undefined,
  };
}

export default function DonationDetailsPage({ params }: PageProps<"/donations/[id]">) {
  return (
    <Suspense fallback={<DetailSkeleton />}>
      <DonationDetails id={params.then((p) => p.id)} />
    </Suspense>
  );
}

async function DonationDetails({ id }: { id: Promise<string> }) {
  const donation = await getPublicDonation(await id);
  if (!donation) notFound();

  const [donor, related] = await Promise.all([getPublicProfile(donation.donor.id), getRelatedDonations(donation)]);
  const category = getCategory(donation.categoryId);

  const facts = [
    { icon: Sparkles, label: "Condition", value: CONDITION_LABEL[donation.condition] },
    { icon: Truck, label: "Handover", value: PICKUP_LABEL[donation.pickupPreference] },
    { icon: MapPin, label: "Location", value: `${donation.area}, ${donation.city}` },
    { icon: Calendar, label: "Posted", value: donation.createdAt ? formatDate(donation.createdAt) : "—" },
  ];

  return (
    <>
      <Container className="pt-8 pb-16 sm:pb-20">
        <Breadcrumbs
          items={[
            { label: "Home", href: ROUTES.home },
            { label: "Browse", href: ROUTES.donations },
            ...(category ? [{ label: category.name, href: `${ROUTES.donations}?category=${category.slug}` }] : []),
            { label: donation.title },
          ]}
        />

        {/* Mobile order: gallery → title & request panel → details. Desktop: two columns with a sticky panel. */}
        <div className="mt-8 grid grid-cols-1 gap-10 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)] lg:grid-rows-[auto_1fr] lg:gap-x-14">
          <div className="min-w-0 lg:col-start-1 lg:row-start-1">
            <DonationGallery images={donation.images} title={donation.title} />
          </div>

          <div className="min-w-0 space-y-10 lg:col-start-1 lg:row-start-2">
            <section aria-labelledby="about-item">
              <h2 id="about-item" className="font-display text-2xl font-semibold text-ink-900">
                About this item
              </h2>
              <p className="mt-4 text-[17px] leading-relaxed whitespace-pre-line text-ink-700">{donation.description}</p>
            </section>

            {donation.notes && (
              <section aria-labelledby="notes" className="rounded-3xl bg-white p-6 ring-1 ring-ink-900/5">
                <h2 id="notes" className="flex items-center gap-2 font-semibold text-ink-900">
                  <StickyNote className="size-5 text-faiz-600" aria-hidden />
                  Notes from the donor
                </h2>
                <p className="mt-2 leading-relaxed whitespace-pre-line text-ink-700">{donation.notes}</p>
              </section>
            )}
          </div>

          <aside className="lg:sticky lg:top-24 lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:self-start">
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge status={donation.status} className="bg-white" />
              {category && (
                <Badge tone="green">
                  <CategoryIcon name={category.icon} className="size-3.5" />
                  {category.name}
                </Badge>
              )}
              {donation.applicationCount > 0 && donation.status === "available" && (
                <Badge tone="saffron">
                  <Users className="size-3.5" aria-hidden />
                  {donation.applicationCount} {donation.applicationCount === 1 ? "request" : "requests"}
                </Badge>
              )}
            </div>
            <h1 className="mt-4 font-display text-3xl leading-tight font-semibold tracking-tight text-ink-900 sm:text-4xl">{donation.title}</h1>
            <p className="mt-2 text-sm font-semibold text-faiz-700">Free — no payment, ever.</p>

            <dl className="mt-6 grid grid-cols-2 gap-3">
              {facts.map((f) => (
                <div key={f.label} className="rounded-2xl bg-cream-50 p-4 ring-1 ring-ink-900/5">
                  <dt className="flex items-center gap-1.5 text-xs font-medium text-sand-500">
                    <f.icon className="size-3.5" aria-hidden />
                    {f.label}
                  </dt>
                  <dd className="mt-1 text-sm font-semibold text-ink-900">{f.value}</dd>
                </div>
              ))}
            </dl>

            <div className="mt-6">
              <RequestItemPanel donation={donation} donor={donor} />
            </div>

            <div className="mt-6 rounded-3xl border border-faiz-700/10 bg-faiz-50/60 p-5">
              <h2 className="flex items-center gap-2 text-sm font-semibold text-faiz-800">
                <ShieldCheck className="size-4" aria-hidden />
                Staying safe
              </h2>
              <ul className="mt-3 space-y-2 text-sm text-ink-700">
                {SAFETY_TIPS.map((tip) => (
                  <li key={tip} className="flex gap-2">
                    <span aria-hidden className="mt-2 size-1 shrink-0 rounded-full bg-faiz-500" />
                    {tip}
                  </li>
                ))}
              </ul>
            </div>
          </aside>
        </div>
      </Container>

      {related.length > 0 && (
        <section aria-labelledby="related-heading" className="border-t border-ink-900/5 bg-cream-50 py-16 sm:py-20">
          <Container>
            <SectionHeading eyebrow="Keep exploring" title={<span id="related-heading">You might also need</span>} />
            <div className="mt-10">
              <DonationGrid donations={related} />
            </div>
          </Container>
        </section>
      )}
    </>
  );
}

function DetailSkeleton() {
  return (
    <Container aria-hidden className="animate-pulse pt-8 pb-20">
      <div className="h-5 w-64 rounded-full bg-white" />
      <div className="mt-8 grid gap-10 lg:grid-cols-[1.35fr_1fr]">
        <div className="aspect-[4/3] rounded-4xl bg-white" />
        <div className="space-y-4">
          <div className="h-10 w-3/4 rounded-2xl bg-white" />
          <div className="h-40 rounded-3xl bg-white" />
          <div className="h-56 rounded-4xl bg-white" />
        </div>
      </div>
    </Container>
  );
}
