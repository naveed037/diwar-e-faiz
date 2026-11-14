import { ArrowRight, BadgeCheck, Gift, HandHeart, Lock, MapPin, Search } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { ButtonLink } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { ROUTES, SITE } from "@/constants/site";
import { photo } from "@/lib/utils/format";
import { Suspense } from "react";
import { getRecentDonations } from "@/server/db/public";

export function Hero() {
  return (
    <section className="relative -mt-18 overflow-hidden pt-18">
      <div aria-hidden className="absolute inset-0 bg-jaali [mask-image:radial-gradient(ellipse_80%_70%_at_70%_30%,black,transparent)]" />
      <div aria-hidden className="absolute -top-24 right-[-10%] size-[36rem] rounded-full bg-faiz-200/50 blur-3xl" />
      <div aria-hidden className="absolute bottom-0 left-[-10%] size-[24rem] rounded-full bg-saffron-100/70 blur-3xl" />

      <Container className="relative grid grid-cols-1 items-center gap-14 pt-10 pb-20 lg:grid-cols-[1.05fr_1fr] lg:gap-10 lg:pt-16 lg:pb-28">
        <div className="animate-fade-up">
          <Link
            href={ROUTES.about}
            className="group inline-flex items-center gap-2 rounded-full bg-white/80 py-1.5 pr-3 pl-1.5 text-sm text-ink-700 shadow-soft ring-1 ring-ink-900/5 backdrop-blur transition hover:ring-faiz-500/40"
          >
            <span className="rounded-full bg-faiz-700 px-2.5 py-0.5 text-xs font-semibold text-cream-50">New</span>
            Free giving, open across Pakistan
            <ArrowRight className="size-3.5 transition group-hover:translate-x-0.5" aria-hidden />
          </Link>

          <h1 className="mt-7 font-display text-[2.4rem] leading-[1.04] min-[400px]:text-[2.75rem] font-semibold tracking-tight text-ink-900 sm:text-6xl lg:text-[4.25rem]">
            Your extra can be someone&apos;s{" "}
            <span className="relative whitespace-nowrap text-faiz-700 italic">
              blessing.
              <svg aria-hidden viewBox="0 0 300 20" preserveAspectRatio="none" className="absolute -bottom-2 left-0 h-3 w-full text-saffron-400">
                <path d="M4 14C70 5 160 3 296 10" fill="none" stroke="currentColor" strokeWidth="6" strokeLinecap="round" />
              </svg>
            </span>
          </h1>

          <p lang="ur" dir="rtl" className="mt-6 text-right text-lg text-faiz-800 min-[400px]:text-xl sm:text-2xl lg:text-left">
            {SITE.taglineUrdu}
          </p>

          <p className="mt-5 max-w-xl text-lg leading-relaxed text-sand-600">
            Diwar-e-Faiz is a community wall for giving. Post the clothes, books, furniture and electronics you no longer
            need — and someone nearby who does will collect them. Free, local and always with dignity.
          </p>

          <div className="mt-9 flex flex-col gap-3 sm:flex-row">
            <ButtonLink href={ROUTES.donate} size="lg" className="h-14 px-8">
              <HandHeart className="size-5" aria-hidden />
              Donate Something
            </ButtonLink>
            <ButtonLink href={ROUTES.donations} size="lg" variant="outline" className="h-14 px-8">
              <Search className="size-5" aria-hidden />
              Find Something
            </ButtonLink>
          </div>

          <ul className="mt-10 flex flex-wrap gap-x-6 gap-y-3 text-sm text-sand-600">
            <li className="flex items-center gap-2">
              <Gift className="size-4 text-faiz-600" aria-hidden /> Always free
            </li>
            <li className="flex items-center gap-2">
              <BadgeCheck className="size-4 text-faiz-600" aria-hidden /> Every listing reviewed
            </li>
            <li className="flex items-center gap-2">
              <Lock className="size-4 text-faiz-600" aria-hidden /> Contact details stay private
            </li>
          </ul>
        </div>

        {/* Visual: an arched "wall niche" holding the community photo */}
        <div className="relative mx-auto w-full max-w-md animate-fade-up [animation-delay:150ms] lg:max-w-none">
          <div className="relative mx-auto aspect-[4/5] w-[86%] overflow-hidden rounded-t-full rounded-b-4xl bg-faiz-100 shadow-lift ring-8 ring-white">
            <Image
              src={photo("1488521787991-ed7bbaae773c", 1000)}
              alt="Children smiling together at a community gathering"
              fill
              priority
              sizes="(min-width: 1024px) 40vw, 90vw"
              className="object-cover"
            />
            <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-faiz-950/30 via-transparent" />
          </div>

          <div className="absolute -bottom-6 -left-2 hidden size-36 overflow-hidden rounded-3xl shadow-lift ring-[6px] ring-white sm:block lg:-left-6">
            <Image
              src={photo("1469571486292-0ba58a3f068b", 400)}
              alt="Hands forming a heart together"
              fill
              sizes="144px"
              className="object-cover"
            />
          </div>

          <Suspense fallback={null}>
            <FeaturedDonation />
          </Suspense>

          <div className="absolute right-2 bottom-[14%] flex items-center gap-2.5 rounded-2xl bg-faiz-800 px-4 py-3 text-cream-50 shadow-lift sm:-right-2">
            <BadgeCheck className="size-5 text-faiz-300" aria-hidden />
            <span className="text-sm leading-tight">
              <span className="block font-semibold">Verified donors</span>
              <span className="text-xs text-cream-50/70">Every listing reviewed</span>
            </span>
          </div>
        </div>
      </Container>
    </section>
  );
}

/** Latest live listing from Firestore (cached). Renders nothing until there is one. */
async function FeaturedDonation() {
  const featured = (await getRecentDonations(1))[0];
  if (!featured?.images[0]) return null;
  return (
        <Link
          href={ROUTES.donation(featured.id)}
          className="absolute top-[12%] -right-1 flex max-w-[15rem] items-center gap-3 rounded-2xl bg-white/95 p-3 pr-4 shadow-lift ring-1 ring-ink-900/5 backdrop-blur transition hover:-translate-y-0.5 sm:-right-4"
        >
          <span className="relative size-12 shrink-0 overflow-hidden rounded-xl">
            <Image src={featured.images[0]} alt="" fill sizes="48px" className="object-cover" />
          </span>
          <span className="min-w-0">
            <span className="flex items-center gap-1.5 text-[11px] font-bold tracking-wider text-faiz-600 uppercase">
              <span className="relative flex size-2">
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-faiz-400 opacity-75" />
                <span className="relative inline-flex size-2 rounded-full bg-faiz-500" />
              </span>
              Just posted
            </span>
            <span className="mt-0.5 block truncate text-sm font-semibold text-ink-900">{featured.title}</span>
            <span className="flex items-center gap-1 text-xs text-sand-600">
              <MapPin className="size-3" aria-hidden />
              {featured.city}
            </span>
          </span>
        </Link>
  );
}
