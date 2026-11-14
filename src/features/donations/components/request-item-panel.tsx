"use client";

import { BadgeCheck, CircleCheck, HandHeart, LogIn, MessageCircle, Pencil, Share2, X } from "lucide-react";
import Link from "next/link";
import { useRef, useState, type FormEvent } from "react";
import { useAuth } from "@/components/providers/auth-provider";
import { useToast } from "@/components/providers/toast-provider";
import { Button, ButtonLink } from "@/components/ui/button";
import { Field, Input, Select, Textarea, fieldA11y } from "@/components/ui/form";
import { ROUTES } from "@/constants/site";
import { FormAlert, Spinner } from "@/features/auth/components/auth-bits";
import { formatDate } from "@/lib/utils/format";
import { applyForDonation } from "@/server/actions/applications";
import type { PublicDonation, PublicProfile } from "@/types/donation";
import { DonorAvatar } from "./donor-avatar";
import { SaveButton } from "./save-button";

type Errors = Partial<Record<"phone" | "message" | "forWhom", string>>;

/** Donor card + primary actions. Requests go through the `applyForDonation` server action. */
export function RequestItemPanel({ donation, donor }: { donation: PublicDonation; donor: PublicProfile | null }) {
  const { toast } = useToast();
  const { status, user } = useAuth();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [errors, setErrors] = useState<Errors>({});
  const [formError, setFormError] = useState<string>();
  const [pending, setPending] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const isOwner = user?.uid === donation.donor.id;
  const canRequest = donation.status === "available";
  const firstName = donation.donor.displayName.split(" ")[0];
  const profileHref = `/users/${donation.donor.id}`;

  function openDialog() {
    setErrors({});
    setFormError(undefined);
    dialogRef.current?.showModal();
  }

  async function share() {
    const url = window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({ title: donation.title, text: `Free on Diwar-e-Faiz: ${donation.title}`, url });
        return;
      }
      await navigator.clipboard.writeText(url);
      toast("Link copied — share it with someone who might need this.");
    } catch {
      // User cancelled the share sheet.
    }
  }

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.currentTarget));
    setPending(true);
    setFormError(undefined);
    const result = await applyForDonation({ donationId: donation.id, ...data });
    setPending(false);
    if (result.ok) {
      setSubmitted(true);
      return;
    }
    setFormError(result.message);
    setErrors(Object.fromEntries(Object.entries(result.fieldErrors ?? {}).map(([k, v]) => [k, v?.[0]])) as Errors);
  }

  return (
    <>
      <div className="rounded-4xl bg-white p-6 shadow-soft ring-1 ring-ink-900/5 sm:p-7">
        <Link href={profileHref} className="group flex items-center gap-4">
          <DonorAvatar name={donation.donor.displayName} photoURL={donation.donor.photoURL} size={56} />
          <div className="min-w-0">
            <p className="flex items-center gap-1.5 font-semibold text-ink-900 group-hover:text-faiz-700">
              {donation.donor.displayName}
              {donation.donor.verified && <BadgeCheck className="size-4 text-faiz-600" aria-label="Verified member" />}
            </p>
            <p className="text-sm text-sand-600">
              {donor?.memberSince ? `Member since ${formatDate(donor.memberSince)}` : "Member"}
              {donor ? ` · ${donor.stats.donated} given` : ""}
            </p>
          </div>
        </Link>
        <Link href={profileHref} className="mt-3 inline-block text-sm font-semibold text-faiz-700 hover:text-faiz-800">
          View {firstName}&apos;s profile →
        </Link>

        <div className="mt-6 grid gap-3">
          {isOwner ? (
            <>
              <p className="rounded-2xl bg-faiz-50 px-4 py-3 text-sm text-faiz-800">This is your listing.</p>
              <ButtonLink href="/my-donations" size="lg">
                <Pencil className="size-4" aria-hidden />
                Manage in My donations
              </ButtonLink>
            </>
          ) : !canRequest ? (
            <div className="rounded-2xl bg-saffron-100 px-4 py-3 text-sm text-saffron-600">
              {donation.status === "reserved"
                ? "This item is reserved for someone right now. If it becomes available again, it will reappear in Browse."
                : "This item has already found a new home. Browse similar items below."}
            </div>
          ) : status === "signed-in" ? (
            <Button size="lg" onClick={openDialog} className="w-full" disabled={submitted}>
              {submitted ? <CircleCheck className="size-5" aria-hidden /> : <HandHeart className="size-5" aria-hidden />}
              {submitted ? "Request sent" : "Request this item"}
            </Button>
          ) : (
            <ButtonLink href={`/login?next=${encodeURIComponent(ROUTES.donation(donation.id))}`} size="lg" className="w-full">
              <LogIn className="size-5" aria-hidden />
              Sign in to request
            </ButtonLink>
          )}
          <div className="grid grid-cols-2 gap-3">
            <SaveButton title={donation.title} variant="inline" className="w-full" />
            <Button variant="outline" onClick={share} className="w-full">
              <Share2 className="size-4" aria-hidden />
              Share
            </Button>
          </div>
          {!canRequest && !isOwner && (
            <ButtonLink href={`${ROUTES.donations}?category=${donation.categoryId}`} variant="secondary" className="w-full">
              See similar items
            </ButtonLink>
          )}
        </div>
      </div>

      <dialog
        ref={dialogRef}
        aria-labelledby="request-title"
        onClick={(e) => e.target === dialogRef.current && dialogRef.current?.close()}
        className="m-auto w-[calc(100%-2rem)] max-w-lg rounded-4xl bg-cream-50 p-0 text-ink-800 shadow-lift backdrop:bg-ink-900/50 backdrop:backdrop-blur-sm open:animate-fade-up"
      >
        <div className="relative p-6 sm:p-8">
          <button
            type="button"
            onClick={() => dialogRef.current?.close()}
            aria-label="Close"
            className="absolute top-4 right-4 cursor-pointer rounded-full p-2 text-sand-500 transition hover:bg-cream-200 hover:text-ink-900"
          >
            <X className="size-5" />
          </button>

          {submitted ? (
            <div className="py-6 text-center">
              <span className="mx-auto flex size-16 items-center justify-center rounded-full bg-faiz-50 text-faiz-600">
                <CircleCheck className="size-8" aria-hidden />
              </span>
              <h2 id="request-title" className="mt-5 font-display text-2xl font-semibold text-ink-900">
                Request sent to {firstName}
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-sand-600">
                You&apos;ll get a notification when they reply. If they accept, you can chat to arrange the handover.
              </p>
              <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:justify-center">
                <Button onClick={() => dialogRef.current?.close()}>Done</Button>
                <ButtonLink href={ROUTES.donations} variant="outline">
                  Keep browsing
                </ButtonLink>
              </div>
            </div>
          ) : (
            <form onSubmit={onSubmit} noValidate>
              <p className="flex items-center gap-2 text-xs font-bold tracking-[0.16em] text-faiz-600 uppercase">
                <MessageCircle className="size-4" aria-hidden />
                Request item
              </p>
              <h2 id="request-title" className="mt-2 pr-8 font-display text-2xl leading-tight font-semibold text-ink-900">
                {donation.title}
              </h2>
              <p className="mt-2 text-sm text-sand-600">Your note goes to {firstName}. Requests are always free.</p>

              {formError && (
                <div className="mt-5">
                  <FormAlert>{formError}</FormAlert>
                </div>
              )}

              <div className="mt-6 grid gap-5">
                <Field label="Who is this for?" htmlFor="forWhom" error={errors.forWhom}>
                  <Select {...fieldA11y("forWhom", errors.forWhom)} defaultValue="myself">
                    <option value="myself">Myself</option>
                    <option value="family">My family</option>
                    <option value="organisation">A school, masjid or organisation</option>
                    <option value="someone">Someone I know</option>
                  </Select>
                </Field>
                <Field label="A short note to the donor" htmlFor="message" error={errors.message} hint="At least 20 characters.">
                  <Textarea
                    {...fieldA11y("message", errors.message, true)}
                    rows={4}
                    maxLength={1000}
                    placeholder="Tell them a little about why this would help and when you could collect it."
                  />
                </Field>
                <Field
                  label="Your mobile number"
                  htmlFor="phone"
                  error={errors.phone}
                  hint="Kept private — only shared if the donor accepts your request."
                >
                  <Input {...fieldA11y("phone", errors.phone, true)} type="tel" autoComplete="tel" placeholder="0300 1234567" />
                </Field>
              </div>

              <Button type="submit" size="lg" className="mt-7 w-full" disabled={pending}>
                {pending && <Spinner />}
                Send request
              </Button>
            </form>
          )}
        </div>
      </dialog>
    </>
  );
}
