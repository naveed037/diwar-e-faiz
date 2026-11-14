"use client";

import { HandHeart, LogOut, Menu, Search, X } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { useAuth } from "@/components/providers/auth-provider";
import { signOut } from "@/features/auth/lib/auth-client";
import { UserAvatar, UserMenu } from "./user-menu";
import { Button, ButtonLink } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { Logo } from "@/components/ui/logo";
import { NAV_LINKS, ROUTES, SITE } from "@/constants/site";
import { cn } from "@/lib/utils/cn";

function isActive(pathname: string | null, href: string) {
  if (!pathname) return false;
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

type NavVariant = "desktop" | "mobile";

/**
 * Reads the pathname for active-link styling. Kept in its own leaf behind <Suspense> because on routes
 * with request-time params (e.g. /my-donations/[id]/edit) usePathname suspends during prerendering.
 */
function ActiveNavLinks({ variant, onNavigate }: { variant: NavVariant; onNavigate?: () => void }) {
  return <NavLinks variant={variant} pathname={usePathname()} onNavigate={onNavigate} />;
}

function NavLinks({ variant, pathname, onNavigate }: { variant: NavVariant; pathname: string | null; onNavigate?: () => void }) {
  return NAV_LINKS.map((link) => {
    const active = isActive(pathname, link.href);
    return variant === "desktop" ? (
      <Link
        key={link.href}
        href={link.href}
        aria-current={active ? "page" : undefined}
        className={cn(
          "relative rounded-full px-4 py-2 text-sm font-medium transition-colors",
          active ? "text-faiz-800" : "text-ink-700 hover:text-faiz-700",
        )}
      >
        {link.label}
        <span
          aria-hidden
          className={cn(
            "absolute inset-x-4 -bottom-0.5 h-0.5 origin-left rounded-full bg-faiz-600 transition-transform duration-300",
            active ? "scale-x-100" : "scale-x-0",
          )}
        />
      </Link>
    ) : (
      <Link
        key={link.href}
        href={link.href}
        onClick={onNavigate}
        aria-current={active ? "page" : undefined}
        className={cn(
          "flex items-center justify-between border-b border-ink-900/5 py-4 font-display text-2xl font-medium",
          active ? "text-faiz-700" : "text-ink-900",
        )}
      >
        {link.label}
        {active && <span aria-hidden className="size-2 rounded-full bg-faiz-500" />}
      </Link>
    );
  });
}

export function Navbar() {
  const router = useRouter();
  const auth = useAuth();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open]);

  const close = () => setOpen(false);

  return (
    <header
      className={cn(
        "sticky top-0 z-50 transition-[background-color,box-shadow,border-color] duration-300",
        scrolled || open
          ? "border-b border-ink-900/5 bg-cream-100/85 shadow-[0_8px_30px_-20px_rgb(22_26_20/0.25)] backdrop-blur-xl"
          : "border-b border-transparent bg-transparent",
      )}
    >
      <Container className="flex h-18 items-center justify-between gap-6">
        <Logo />

        <nav aria-label="Main" className="hidden items-center gap-1 lg:flex">
          <Suspense fallback={<NavLinks variant="desktop" pathname={null} />}>
            <ActiveNavLinks variant="desktop" />
          </Suspense>
        </nav>

        <div className="hidden items-center gap-2 lg:flex">
          <UserMenu />
          <ButtonLink href={ROUTES.donate} size="md">
            <HandHeart className="size-4" aria-hidden />
            Donate Something
          </ButtonLink>
        </div>

        <Button
          variant="ghost"
          size="icon"
          className="lg:hidden"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-controls="mobile-menu"
          aria-label={open ? "Close menu" : "Open menu"}
        >
          {open ? <X className="size-5" /> : <Menu className="size-5" />}
        </Button>
      </Container>

      {/* Mobile menu */}
      <div
        id="mobile-menu"
        hidden={!open}
        className="fixed inset-x-0 top-18 bottom-0 overflow-y-auto border-t border-ink-900/5 bg-cream-100 lg:hidden"
      >
        <Container className="flex min-h-full flex-col py-6">
          <nav aria-label="Mobile" className="flex flex-col">
            <Suspense fallback={<NavLinks variant="mobile" pathname={null} onNavigate={close} />}>
              <ActiveNavLinks variant="mobile" onNavigate={close} />
            </Suspense>
          </nav>
          <div className="mt-8 grid gap-3">
            <ButtonLink href={ROUTES.donate} size="lg" onClick={close}>
              <HandHeart className="size-5" aria-hidden />
              Donate Something
            </ButtonLink>
            <ButtonLink href={ROUTES.donations} size="lg" variant="outline" onClick={close}>
              <Search className="size-5" aria-hidden />
              Find Something
            </ButtonLink>
          </div>

          <div className="mt-6 rounded-3xl bg-white p-4 ring-1 ring-ink-900/5">
            {auth.status === "signed-in" && auth.user ? (
              <div className="flex items-center gap-3">
                <UserAvatar size={44} />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-ink-900">{auth.user.displayName ?? "Your account"}</p>
                  <p className="flex gap-3 text-sm font-semibold text-faiz-700">
                    <Link href="/profile" onClick={close}>
                      Profile
                    </Link>
                    <Link href="/my-donations" onClick={close}>
                      My donations
                    </Link>
                    {auth.user.isAdmin && (
                      <Link href="/admin/moderation" onClick={close}>
                        Moderation
                      </Link>
                    )}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Sign out"
                  onClick={async () => {
                    close();
                    await signOut();
                    router.replace("/");
                    router.refresh();
                  }}
                >
                  <LogOut className="size-5" />
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                <ButtonLink href="/login" variant="secondary" onClick={close}>
                  Sign in
                </ButtonLink>
                <ButtonLink href="/register" variant="outline" onClick={close}>
                  Create account
                </ButtonLink>
              </div>
            )}
          </div>
          <p lang="ur" dir="rtl" className="mt-auto pt-10 text-center text-lg text-faiz-700">
            {SITE.taglineUrdu}
          </p>
        </Container>
      </div>
    </header>
  );
}
