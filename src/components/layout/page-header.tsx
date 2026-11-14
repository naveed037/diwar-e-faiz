import { ChevronRight } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { Container } from "@/components/ui/container";

type Crumb = { label: string; href?: string };

export function Breadcrumbs({ items }: { items: Crumb[] }) {
  return (
    <nav aria-label="Breadcrumb">
      <ol className="flex flex-wrap items-center gap-1.5 text-sm text-sand-600">
        {items.map((item, i) => (
          <li key={item.label} className="flex items-center gap-1.5">
            {i > 0 && <ChevronRight aria-hidden className="size-3.5 text-sand-400" />}
            {item.href ? (
              <Link href={item.href} className="transition hover:text-faiz-700">
                {item.label}
              </Link>
            ) : (
              <span aria-current="page" className="font-medium text-ink-800">
                {item.label}
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}

/** Intro band used at the top of inner pages. */
export function PageHeader({
  eyebrow,
  title,
  urdu,
  description,
  crumbs,
  children,
}: {
  eyebrow?: string;
  title: ReactNode;
  urdu?: string;
  description?: ReactNode;
  crumbs?: Crumb[];
  children?: ReactNode;
}) {
  return (
    <section className="relative overflow-hidden border-b border-ink-900/5">
      <div aria-hidden className="absolute inset-0 bg-jaali [mask-image:radial-gradient(ellipse_at_top_right,black,transparent_65%)]" />
      <div aria-hidden className="absolute -top-40 -right-32 size-[28rem] rounded-full bg-faiz-200/40 blur-3xl" />
      <Container className="relative pt-8 pb-14 sm:pt-10 sm:pb-16">
        {crumbs && <Breadcrumbs items={crumbs} />}
        <div className="mt-8 max-w-3xl animate-fade-up">
          {eyebrow && <p className="text-xs font-bold tracking-[0.18em] text-faiz-600 uppercase">{eyebrow}</p>}
          <h1 className="mt-3 font-display text-4xl leading-[1.05] font-semibold tracking-tight text-ink-900 text-balance-safe sm:text-5xl">
            {title}
          </h1>
          {urdu && (
            <p lang="ur" dir="rtl" className="mt-2 text-left text-xl text-faiz-700">
              {urdu}
            </p>
          )}
          {description && <p className="mt-5 max-w-2xl text-lg leading-relaxed text-sand-600">{description}</p>}
        </div>
        {children}
      </Container>
    </section>
  );
}
