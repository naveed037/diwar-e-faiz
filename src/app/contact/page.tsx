import { Clock, Mail, MapPin, MessageCircle, Phone, Plus } from "lucide-react";
import type { Metadata } from "next";
import { PageHeader } from "@/components/layout/page-header";
import { Container } from "@/components/ui/container";
import { SectionHeading } from "@/components/ui/section-heading";
import { SITE } from "@/constants/site";
import { ContactForm } from "@/features/contact/components/contact-form";

export const metadata: Metadata = {
  title: "Contact Us",
  description: "Questions, partnerships or feedback — the Diwar-e-Faiz team is here to help.",
};

const CHANNELS = [
  { icon: Mail, label: "Email us", value: SITE.contact.email, href: `mailto:${SITE.contact.email}`, note: "Replies within one working day" },
  { icon: MessageCircle, label: "WhatsApp", value: SITE.contact.whatsapp, href: SITE.contact.whatsappHref, note: "Quickest for urgent help", external: true },
  { icon: Phone, label: "Call us", value: SITE.contact.phone, href: SITE.contact.phoneHref, note: SITE.contact.hours },
];

const FAQS = [
  {
    q: "Is everything on Diwar-e-Faiz really free?",
    a: "Yes. Donors give items free of charge and we never take a fee. If anyone asks you for money, please report the listing to us immediately.",
  },
  {
    q: "Who can request an item?",
    a: "Anyone. We don't ask you to prove your income — we believe in dignity. Donors read short notes from people who request and choose who receives.",
  },
  {
    q: "What can't be donated?",
    a: "Medicines, food past its expiry, weapons, broken electrical items, and anything unsafe or illegal. Clothes should be washed and in wearable condition.",
  },
  {
    q: "Can our NGO, school or masjid partner with you?",
    a: "Absolutely. Partners get a verified profile, can post collective needs and receive bulk donations. Choose “Partnering” in the form above and we'll be in touch.",
  },
  {
    q: "How do pickups work?",
    a: "Once a donor accepts your request you'll be able to message each other to agree on a time and place. We recommend public places or bringing someone along.",
  },
];

export default function ContactPage() {
  return (
    <>
      <PageHeader
        crumbs={[{ label: "Home", href: "/" }, { label: "Contact" }]}
        eyebrow="We're here to help"
        title="Get in touch"
        urdu="ہم سے رابطہ کریں"
        description="Whether you're donating, looking for something, or want to bring Diwar-e-Faiz to your community — we'd love to hear from you."
      />

      <section className="py-16 sm:py-20">
        <Container className="grid gap-10 lg:grid-cols-[1fr_1.6fr] lg:gap-14">
          <div className="space-y-4">
            {CHANNELS.map((c) => (
              <a
                key={c.label}
                href={c.href}
                {...(c.external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                className="group flex items-start gap-4 rounded-3xl bg-white p-5 ring-1 ring-ink-900/5 transition hover:-translate-y-0.5 hover:shadow-soft hover:ring-faiz-500/30"
              >
                <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-faiz-50 text-faiz-700 transition group-hover:bg-faiz-700 group-hover:text-cream-50">
                  <c.icon className="size-5" aria-hidden />
                </span>
                <span>
                  <span className="block text-sm text-sand-600">{c.label}</span>
                  <span className="block font-semibold text-ink-900">{c.value}</span>
                  <span className="mt-1 block text-xs text-sand-500">{c.note}</span>
                </span>
              </a>
            ))}
            <div className="rounded-3xl bg-faiz-800 p-6 text-cream-50">
              <p className="flex items-center gap-2 text-sm font-semibold text-faiz-200">
                <MapPin className="size-4" aria-hidden />
                Our office
              </p>
              <p className="mt-2 leading-relaxed">{SITE.contact.address}</p>
              <p className="mt-3 flex items-center gap-2 text-sm text-cream-50/70">
                <Clock className="size-4" aria-hidden />
                {SITE.contact.hours}
              </p>
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(SITE.contact.address)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-5 inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm font-semibold transition hover:bg-white/20"
              >
                Open in Google Maps
              </a>
            </div>
          </div>

          <div className="rounded-4xl bg-white p-6 shadow-soft ring-1 ring-ink-900/5 sm:p-10">
            <h2 className="font-display text-2xl font-semibold text-ink-900">Send us a message</h2>
            <p className="mt-2 mb-8 text-sand-600">Fill in the form and the right person from our team will reply.</p>
            <ContactForm />
          </div>
        </Container>
      </section>

      <section id="faq" className="scroll-mt-20 border-t border-ink-900/5 bg-cream-50 py-20 sm:py-24">
        <Container className="max-w-3xl">
          <SectionHeading align="center" eyebrow="FAQ" title="Questions people often ask" urdu="اکثر پوچھے جانے والے سوالات" />
          <div className="mt-12 divide-y divide-ink-900/10 rounded-4xl bg-white px-6 ring-1 ring-ink-900/5 sm:px-8">
            {FAQS.map((f, i) => (
              <details key={f.q} className="group py-5" open={i === 0}>
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-semibold text-ink-900 [&::-webkit-details-marker]:hidden">
                  {f.q}
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-faiz-50 text-faiz-700 transition group-open:rotate-45">
                    <Plus className="size-4" aria-hidden />
                  </span>
                </summary>
                <p className="mt-3 pr-10 leading-relaxed text-sand-600">{f.a}</p>
              </details>
            ))}
          </div>
        </Container>
      </section>
    </>
  );
}
