"use client";

import { Camera, HandHeart, Handshake, MessageCircle, Search, Truck, type LucideIcon } from "lucide-react";
import { useState } from "react";
import { ButtonLink } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { SectionHeading } from "@/components/ui/section-heading";
import { ROUTES } from "@/constants/site";
import { cn } from "@/lib/utils/cn";

type Step = { icon: LucideIcon; title: string; body: string };

const tracks: Record<"give" | "receive", { label: string; steps: Step[]; cta: { label: string; href: string } }> = {
  give: {
    label: "I want to give",
    steps: [
      { icon: Camera, title: "Snap and post", body: "Take a couple of photos, add a short description and choose your area. It takes under two minutes." },
      { icon: MessageCircle, title: "Choose who receives", body: "People nearby send you a short request. Read their notes and pick who it would help most." },
      { icon: Handshake, title: "Hand it over", body: "Agree on a pickup time. Mark the item as given — and see the impact you've made on your profile." },
    ],
    cta: { label: "Donate Something", href: ROUTES.donate },
  },
  receive: {
    label: "I need something",
    steps: [
      { icon: Search, title: "Browse the wall", body: "Search by category and city. Every item is free — no fees, no bidding, no questions about your income." },
      { icon: HandHeart, title: "Send a request", body: "Write a short note to the donor. Your phone number is only shared with them, never publicly." },
      { icon: Truck, title: "Collect with dignity", body: "Once accepted, arrange a pickup that suits you both. Many donors can drop items off nearby." },
    ],
    cta: { label: "Find Something", href: ROUTES.donations },
  },
};

export function HowItWorks() {
  const [track, setTrack] = useState<keyof typeof tracks>("give");
  const active = tracks[track];

  return (
    <section id="how-it-works" aria-labelledby="how-heading" className="scroll-mt-20 py-20 sm:py-24">
      <Container>
        <SectionHeading
          align="center"
          eyebrow="How it works"
          title={<span id="how-heading">Three simple steps, either way</span>}
          urdu="دینا بھی آسان، لینا بھی باعزت"
        />

        <div role="tablist" aria-label="Choose your path" className="mx-auto mt-10 flex w-fit rounded-full bg-white p-1.5 shadow-soft ring-1 ring-ink-900/5">
          {(Object.keys(tracks) as (keyof typeof tracks)[]).map((key) => (
            <button
              key={key}
              type="button"
              role="tab"
              id={`tab-${key}`}
              aria-selected={track === key}
              aria-controls="how-panel"
              onClick={() => setTrack(key)}
              className={cn(
                "cursor-pointer rounded-full px-5 py-2.5 text-sm font-semibold transition sm:px-7",
                track === key ? "bg-faiz-700 text-cream-50 shadow" : "text-ink-700 hover:text-faiz-700",
              )}
            >
              {tracks[key].label}
            </button>
          ))}
        </div>

        <div id="how-panel" role="tabpanel" aria-labelledby={`tab-${track}`} className="mt-12">
          <ol key={track} className="relative grid gap-5 md:grid-cols-3 md:gap-6">
            <div aria-hidden className="absolute top-12 right-[16%] left-[16%] hidden border-t-2 border-dashed border-faiz-200 md:block" />
            {active.steps.map((step, i) => (
              <li
                key={step.title}
                style={{ animationDelay: `${i * 90}ms` }}
                className="relative animate-fade-up rounded-4xl bg-white p-7 ring-1 ring-ink-900/5"
              >
                <div className="flex items-center justify-between">
                  <span className="flex size-14 items-center justify-center rounded-2xl bg-faiz-700 text-cream-50 shadow-[0_10px_24px_-10px_rgb(23_67_46/0.7)]">
                    <step.icon className="size-6" aria-hidden />
                  </span>
                  <span className="font-display text-5xl font-semibold text-faiz-100">0{i + 1}</span>
                </div>
                <h3 className="mt-6 text-lg font-semibold text-ink-900">{step.title}</h3>
                <p className="mt-2 leading-relaxed text-sand-600">{step.body}</p>
              </li>
            ))}
          </ol>
          <div className="mt-10 flex justify-center">
            <ButtonLink href={active.cta.href} size="lg">
              {active.cta.label}
            </ButtonLink>
          </div>
        </div>
      </Container>
    </section>
  );
}
