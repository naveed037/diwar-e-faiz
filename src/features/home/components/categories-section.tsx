import { ArrowUpRight } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";
import { CategoryIcon } from "@/components/ui/category-icon";
import { Container } from "@/components/ui/container";
import { SectionHeading } from "@/components/ui/section-heading";
import { CATEGORIES } from "@/constants/categories";
import { ROUTES } from "@/constants/site";
import { getCategoryCounts } from "@/server/db/public";
import type { CategorySlug } from "@/types/donation";

export function CategoriesSection() {
  return (
    <section aria-labelledby="categories-heading" className="py-20 sm:py-24">
      <Container>
        <SectionHeading
          eyebrow="Donation categories"
          title={<span id="categories-heading">Whatever you have, someone needs it</span>}
          urdu="ہر چیز کسی نہ کسی کے کام آتی ہے"
          description="From school books to sofas — browse by what you're looking for, or find the right place for what you want to give."
        />

        <ul className="mt-12 grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4">
          {CATEGORIES.map((c) => (
            <li key={c.slug}>
              <Link
                href={`${ROUTES.donations}?category=${c.slug}`}
                className="group relative flex h-full flex-col overflow-hidden rounded-3xl bg-white p-5 ring-1 ring-ink-900/5 transition duration-300 hover:-translate-y-1 hover:shadow-lift hover:ring-faiz-500/30 sm:p-6"
              >
                <div className="flex items-start justify-between">
                  <span className="flex size-12 items-center justify-center rounded-2xl bg-faiz-50 text-faiz-700 transition duration-300 group-hover:bg-faiz-700 group-hover:text-cream-50">
                    <CategoryIcon name={c.icon} className="size-6" strokeWidth={1.75} />
                  </span>
                  <ArrowUpRight
                    aria-hidden
                    className="size-5 text-sand-400 transition duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-faiz-700"
                  />
                </div>
                <h3 className="mt-6 font-semibold text-ink-900">{c.name}</h3>
                <p lang="ur" dir="rtl" className="text-right text-sm text-faiz-600 sm:text-left">
                  {c.nameUrdu}
                </p>
                <p className="mt-1 hidden text-sm leading-relaxed text-sand-600 sm:block">{c.description}</p>
                <p className="mt-auto pt-4 text-xs font-semibold text-sand-500">
                  <Suspense fallback="Browse items">
                    <CategoryCount slug={c.slug} />
                  </Suspense>
                </p>
              </Link>
            </li>
          ))}
        </ul>
      </Container>
    </section>
  );
}

async function CategoryCount({ slug }: { slug: CategorySlug }) {
  const count = (await getCategoryCounts())[slug] ?? 0;
  return count > 0 ? `${count} ${count === 1 ? "item" : "items"} listed` : "Be the first to give";
}
