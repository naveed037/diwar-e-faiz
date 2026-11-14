import { Mail, MapPin, Phone } from "lucide-react";
import Link from "next/link";
import { Container } from "@/components/ui/container";
import { Logo } from "@/components/ui/logo";
import { FacebookIcon, InstagramIcon, LinkedInIcon, XIcon } from "@/components/ui/social-icons";
import { ROUTES, SITE } from "@/constants/site";
import { CATEGORIES } from "@/constants/categories";
import { NewsletterForm } from "./newsletter-form";

const socials = [
  { label: "Facebook", href: SITE.social.facebook, Icon: FacebookIcon },
  { label: "Instagram", href: SITE.social.instagram, Icon: InstagramIcon },
  { label: "X", href: SITE.social.x, Icon: XIcon },
  { label: "LinkedIn", href: SITE.social.linkedin, Icon: LinkedInIcon },
];

export function Footer() {
  const categories = CATEGORIES.slice(0, 6);

  const columns = [
    {
      title: "Platform",
      links: [
        { label: "Browse donations", href: ROUTES.donations },
        { label: "Donate an item", href: ROUTES.donate },
        { label: "How it works", href: "/#how-it-works" },
        { label: "Success stories", href: "/#stories" },
      ],
    },
    {
      title: "Categories",
      links: categories.map((c) => ({ label: c.name, href: `${ROUTES.donations}?category=${c.slug}` })),
    },
    {
      title: "Organisation",
      links: [
        { label: "About us", href: ROUTES.about },
        { label: "Our values", href: `${ROUTES.about}#values` },
        { label: "Contact", href: ROUTES.contact },
        { label: "FAQs", href: `${ROUTES.contact}#faq` },
      ],
    },
  ];

  return (
    <footer className="relative mt-auto overflow-hidden bg-faiz-950 text-cream-50">
      <div aria-hidden className="absolute inset-0 bg-jaali opacity-[0.35] [mask-image:linear-gradient(to_bottom,black,transparent_70%)]" />
      <Container className="relative">
        {/* Newsletter band */}
        <div className="flex flex-col gap-6 border-b border-white/10 py-12 md:flex-row md:items-center md:justify-between">
          <div className="max-w-md">
            <h2 className="font-display text-2xl font-semibold">Stories of kindness, once a month.</h2>
            <p className="mt-2 text-sm text-cream-50/65">
              New features, city launches and the people your donations reached. No spam, ever.
            </p>
          </div>
          <div className="w-full md:max-w-md">
            <NewsletterForm />
          </div>
        </div>

        <div className="grid gap-12 py-14 md:grid-cols-12">
          <div className="md:col-span-4">
            <Logo tone="light" />
            <p className="mt-5 max-w-xs text-sm leading-relaxed text-cream-50/65">{SITE.tagline}</p>
            <p lang="ur" dir="rtl" className="mt-2 max-w-xs text-base text-faiz-200">
              {SITE.taglineUrdu}
            </p>
            <ul className="mt-6 flex gap-2">
              {socials.map(({ label, href, Icon }) => (
                <li key={label}>
                  <a
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`${SITE.name} on ${label}`}
                    className="flex size-10 items-center justify-center rounded-full bg-white/5 text-cream-50/80 ring-1 ring-white/10 transition hover:bg-faiz-700 hover:text-cream-50"
                  >
                    <Icon className="size-4" />
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div className="grid grid-cols-2 gap-8 sm:grid-cols-3 md:col-span-8 lg:grid-cols-4">
            {columns.map((col) => (
              <div key={col.title}>
                <h3 className="text-xs font-bold tracking-[0.16em] text-faiz-300 uppercase">{col.title}</h3>
                <ul className="mt-4 space-y-3">
                  {col.links.map((link) => (
                    <li key={link.label}>
                      <Link href={link.href} className="text-sm text-cream-50/70 transition hover:text-cream-50">
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
            <div className="col-span-2 sm:col-span-3 lg:col-span-1">
              <h3 className="text-xs font-bold tracking-[0.16em] text-faiz-300 uppercase">Reach us</h3>
              <ul className="mt-4 space-y-3 text-sm text-cream-50/70">
                <li>
                  <a href={`mailto:${SITE.contact.email}`} className="flex items-start gap-2 transition hover:text-cream-50">
                    <Mail className="mt-0.5 size-4 shrink-0" aria-hidden />
                    {SITE.contact.email}
                  </a>
                </li>
                <li>
                  <a href={SITE.contact.phoneHref} className="flex items-start gap-2 transition hover:text-cream-50">
                    <Phone className="mt-0.5 size-4 shrink-0" aria-hidden />
                    {SITE.contact.phone}
                  </a>
                </li>
                <li className="flex items-start gap-2">
                  <MapPin className="mt-0.5 size-4 shrink-0" aria-hidden />
                  Lahore, Pakistan
                </li>
              </ul>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-3 border-t border-white/10 py-6 text-xs text-cream-50/50 sm:flex-row sm:items-center sm:justify-between">
          <p>© 2026 {SITE.name}. A non-profit community initiative.</p>
          <p>Built with care in Pakistan · Every item is given free of charge</p>
        </div>
      </Container>
    </footer>
  );
}
