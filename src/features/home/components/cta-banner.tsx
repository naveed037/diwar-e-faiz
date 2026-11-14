import { HandHeart } from "lucide-react";
import Image from "next/image";
import { ButtonLink } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { ROUTES } from "@/constants/site";
import { photo } from "@/lib/utils/format";

export function CtaBanner() {
  return (
    <section aria-labelledby="cta-heading" className="pb-24">
      <Container>
        <div className="relative grid overflow-hidden rounded-4xl bg-cream-200 lg:grid-cols-2">
          <div className="relative z-10 p-8 sm:p-12 lg:p-16">
            <h2 id="cta-heading" className="font-display text-3xl leading-tight font-semibold tracking-tight text-ink-900 sm:text-4xl">
              That jacket in your cupboard could keep someone warm tonight.
            </h2>
            <p lang="ur" dir="rtl" className="mt-3 text-lg text-faiz-700">
              جو آپ کے لیے اضافی ہے، وہ کسی کے لیے نعمت ہے
            </p>
            <p className="mt-4 max-w-md text-sand-600">
              Post an item in under two minutes. We&apos;ll help you find someone nearby who truly needs it.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <ButtonLink href={ROUTES.donate} size="lg">
                <HandHeart className="size-5" aria-hidden />
                Donate Something
              </ButtonLink>
              <ButtonLink href="/#how-it-works" size="lg" variant="outline">
                See how it works
              </ButtonLink>
            </div>
          </div>
          <div className="relative min-h-64 lg:min-h-full">
            <Image
              src={photo("1556905055-8f358a7a47b2", 1000)}
              alt="Neatly folded clothes ready to be donated"
              fill
              sizes="(min-width: 1024px) 50vw, 100vw"
              className="object-cover"
            />
            <div aria-hidden className="absolute inset-0 bg-gradient-to-r from-cream-200 via-cream-200/10 to-transparent max-lg:bg-gradient-to-b" />
          </div>
        </div>
      </Container>
    </section>
  );
}
