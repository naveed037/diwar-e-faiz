import { HandHeart, Heart, Leaf, ShieldCheck, Sprout, Users } from "lucide-react";
import type { Metadata } from "next";
import Image from "next/image";
import { PageHeader } from "@/components/layout/page-header";
import { Avatar } from "@/components/ui/avatar";
import { ButtonLink } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { SectionHeading } from "@/components/ui/section-heading";
import { ROUTES } from "@/constants/site";
import { ImpactStats } from "@/features/home/components/impact-stats";
import { photo } from "@/lib/utils/format";

export const metadata: Metadata = {
  title: "About Us",
  description: "Why we built Diwar-e-Faiz — a dignified, local way to pass on what you no longer need.",
};

const VALUES = [
  { icon: Heart, title: "Dignity first", body: "No one has to prove they are poor. Requests are private and every item is free — no bidding, no fees." },
  { icon: ShieldCheck, title: "Trust by design", body: "Donor verification, reviewed listings and clear safety guidance make every handover feel safe." },
  { icon: Users, title: "Local and personal", body: "Giving happens between neighbours. Items travel a few kilometres, not across the country." },
  { icon: Leaf, title: "Nothing wasted", body: "Every reused sofa or schoolbag is one less thing in a landfill and one less thing someone must buy." },
];

const TIMELINE = [
  { year: "2023", title: "A wall in Lahore", body: "Inspired by the 'walls of kindness' painted across Pakistani cities, we put the idea online for one neighbourhood." },
  { year: "2024", title: "Five cities", body: "Volunteers in Karachi, Islamabad, Rawalpindi and Faisalabad joined. Schools and masajid started posting needs." },
  { year: "2026", title: "38 cities and counting", body: "Over 12,000 items have found new homes. We're now building partner tools for NGOs and community schools." },
];

const TEAM = [
  { name: "Hira Shahid", initials: "HS", role: "Founder & Product" },
  { name: "Omar Farooq", initials: "OF", role: "Engineering" },
  { name: "Nadia Rehman", initials: "NR", role: "Community & Trust" },
  { name: "Kamran Javed", initials: "KJ", role: "Partnerships" },
];

export default function AboutPage() {
  return (
    <>
      <PageHeader
        crumbs={[{ label: "Home", href: "/" }, { label: "About us" }]}
        eyebrow="Our story"
        title="A wall where kindness changes hands"
        urdu="دیوارِ فیض — نیکی کی دیوار"
        description="Diwar-e-Faiz means “the wall of generosity”. We turned a beautiful street tradition into a simple, safe platform anyone in Pakistan can use."
      />

      {/* Mission */}
      <section className="py-20 sm:py-24">
        <Container className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
          <div className="relative">
            <div className="relative aspect-[5/4] overflow-hidden rounded-4xl shadow-lift">
              <Image
                src={photo("1509062522246-3755977927d7", 1200)}
                alt="Children studying together in a community school"
                fill
                sizes="(min-width: 1024px) 45vw, 100vw"
                className="object-cover"
              />
            </div>
            <div className="absolute -right-3 -bottom-8 flex max-w-60 items-start gap-3 rounded-3xl bg-white p-4 shadow-lift ring-1 ring-ink-900/5 sm:-right-6">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-saffron-100 text-saffron-600">
                <Sprout className="size-5" aria-hidden />
              </span>
              <p className="text-sm leading-snug text-ink-700">
                <span className="font-semibold text-ink-900">312 schools</span> furnished with donated books and desks.
              </p>
            </div>
          </div>

          <div>
            <SectionHeading
              eyebrow="Our mission"
              title="Make giving as easy as throwing something away"
              description="Most homes hold things that are too good to throw out but no longer used. Meanwhile, families nearby go without. We connect the two — quickly, respectfully and for free."
            />
            <ul className="mt-8 space-y-4">
              {[
                "Free for everyone, forever — we're a non-profit initiative.",
                "Built for Pakistan: Urdu-friendly, mobile-first and light on data.",
                "Run with volunteers, NGOs and community schools in every city.",
              ].map((point) => (
                <li key={point} className="flex gap-3 text-ink-700">
                  <HandHeart className="mt-0.5 size-5 shrink-0 text-faiz-600" aria-hidden />
                  {point}
                </li>
              ))}
            </ul>
          </div>
        </Container>
      </section>

      <ImpactStats />

      {/* Values */}
      <section id="values" className="scroll-mt-20 py-20 sm:py-24">
        <Container>
          <SectionHeading align="center" eyebrow="What we stand for" title="Our values" urdu="ہماری اقدار" />
          <ul className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {VALUES.map((v) => (
              <li key={v.title} className="rounded-4xl bg-white p-7 ring-1 ring-ink-900/5">
                <span className="flex size-12 items-center justify-center rounded-2xl bg-faiz-50 text-faiz-700">
                  <v.icon className="size-6" aria-hidden />
                </span>
                <h3 className="mt-5 text-lg font-semibold text-ink-900">{v.title}</h3>
                <p className="mt-2 leading-relaxed text-sand-600">{v.body}</p>
              </li>
            ))}
          </ul>
        </Container>
      </section>

      {/* Timeline */}
      <section className="border-y border-ink-900/5 bg-cream-50 py-20 sm:py-24">
        <Container className="grid gap-12 lg:grid-cols-[1fr_1.4fr]">
          <SectionHeading eyebrow="How we got here" title="From one wall to a nationwide movement" />
          <ol className="relative space-y-10 border-l-2 border-faiz-100 pl-8">
            {TIMELINE.map((t) => (
              <li key={t.year} className="relative">
                <span aria-hidden className="absolute top-1 -left-[41px] size-4 rounded-full border-4 border-cream-50 bg-faiz-600" />
                <p className="font-display text-sm font-semibold text-faiz-600">{t.year}</p>
                <h3 className="mt-1 text-xl font-semibold text-ink-900">{t.title}</h3>
                <p className="mt-2 leading-relaxed text-sand-600">{t.body}</p>
              </li>
            ))}
          </ol>
        </Container>
      </section>

      {/* Team */}
      <section className="py-20 sm:py-24">
        <Container>
          <SectionHeading
            align="center"
            eyebrow="The people behind it"
            title="A small team with a big network of volunteers"
          />
          <ul className="mx-auto mt-12 grid max-w-4xl grid-cols-2 gap-5 md:grid-cols-4">
            {TEAM.map((m) => (
              <li key={m.name} className="flex flex-col items-center rounded-4xl bg-white p-6 text-center ring-1 ring-ink-900/5">
                <Avatar initials={m.initials} size="lg" className="size-20 text-xl" />
                <p className="mt-4 font-semibold text-ink-900">{m.name}</p>
                <p className="text-sm text-sand-600">{m.role}</p>
              </li>
            ))}
          </ul>
          <div className="mt-14 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <ButtonLink href={ROUTES.contact} size="lg">
              Volunteer with us
            </ButtonLink>
            <ButtonLink href={ROUTES.donations} size="lg" variant="outline">
              Browse donations
            </ButtonLink>
          </div>
        </Container>
      </section>
    </>
  );
}
