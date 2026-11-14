import { BadgeCheck, HandHeart, ShieldCheck } from "lucide-react";
import Image from "next/image";
import type { ReactNode } from "react";
import { Container } from "@/components/ui/container";
import { SITE } from "@/constants/site";
import { photo } from "@/lib/utils/format";

const POINTS = [
  { icon: HandHeart, text: "Give and receive with one account — no roles to choose." },
  { icon: ShieldCheck, text: "Your phone and email stay private until you choose to share." },
  { icon: BadgeCheck, text: "Every listing is reviewed before it goes live." },
];

/** Split layout for sign-in, registration and password reset. */
export function AuthShell({ title, subtitle, children }: { title: string; subtitle: ReactNode; children: ReactNode }) {
  return (
    <Container className="py-8 sm:py-12">
      <div className="grid overflow-hidden rounded-4xl bg-white shadow-lift ring-1 ring-ink-900/5 lg:grid-cols-[1fr_1.1fr]">
        <aside className="relative hidden overflow-hidden bg-faiz-900 p-10 text-cream-50 lg:flex lg:flex-col">
          <Image
            src={photo("1469571486292-0ba58a3f068b", 1000)}
            alt=""
            fill
            sizes="45vw"
            className="object-cover opacity-25 mix-blend-luminosity"
          />
          <div aria-hidden className="absolute inset-0 bg-gradient-to-b from-faiz-900/60 via-faiz-900/80 to-faiz-950" />
          <div className="relative mt-auto">
            <p lang="ur" dir="rtl" className="text-left text-2xl text-saffron-400">
              {SITE.taglineUrdu}
            </p>
            <p className="mt-4 font-display text-3xl leading-tight font-semibold">{SITE.tagline}</p>
            <ul className="mt-8 space-y-4">
              {POINTS.map(({ icon: Icon, text }) => (
                <li key={text} className="flex gap-3 text-sm text-cream-50/80">
                  <Icon className="mt-0.5 size-5 shrink-0 text-faiz-300" aria-hidden />
                  {text}
                </li>
              ))}
            </ul>
          </div>
        </aside>

        <div className="px-5 py-10 sm:px-12 sm:py-14">
          <div className="mx-auto max-w-md">
            <h1 className="font-display text-3xl font-semibold tracking-tight text-ink-900 sm:text-4xl">{title}</h1>
            <div className="mt-2 text-sand-600">{subtitle}</div>
            <div className="mt-8">{children}</div>
          </div>
        </div>
      </div>
    </Container>
  );
}
