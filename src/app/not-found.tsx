import { Search } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { LogoMark } from "@/components/ui/logo";
import { ROUTES } from "@/constants/site";

export default function NotFound() {
  return (
    <Container className="flex flex-col items-center py-28 text-center">
      <LogoMark className="size-16" />
      <p className="mt-8 text-xs font-bold tracking-[0.18em] text-faiz-600 uppercase">Error 404</p>
      <h1 className="mt-3 font-display text-4xl font-semibold text-ink-900 sm:text-5xl">This page has moved on</h1>
      <p className="mt-4 max-w-md text-sand-600">
        Like a good donation, it may have already found a new home. Let&apos;s get you back to something useful.
      </p>
      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <ButtonLink href={ROUTES.home}>Back to home</ButtonLink>
        <ButtonLink href={ROUTES.donations} variant="outline">
          <Search className="size-4" aria-hidden />
          Browse donations
        </ButtonLink>
      </div>
    </Container>
  );
}
