"use client";

import { MailCheck } from "lucide-react";
import Link from "next/link";
import { useState, type FormEvent } from "react";
import { z } from "zod";
import { useAuth } from "@/components/providers/auth-provider";
import { Button } from "@/components/ui/button";
import { Field, Input, fieldA11y } from "@/components/ui/form";
import { AuthFlowError, requestPasswordReset } from "../lib/auth-client";
import { FormAlert, NotConfiguredNotice, Spinner } from "./auth-bits";

const emailSchema = z.email("Please enter a valid email address.");

export function ForgotPasswordForm() {
  const { status } = useAuth();
  const [error, setError] = useState<string>();
  const [formError, setFormError] = useState<string>();
  const [pending, setPending] = useState(false);
  const [sentTo, setSentTo] = useState<string | null>(null);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const parsed = emailSchema.safeParse(String(new FormData(e.currentTarget).get("email") ?? "").trim());
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message);
      return;
    }
    setError(undefined);
    setFormError(undefined);
    setPending(true);
    try {
      await requestPasswordReset(parsed.data);
      setSentTo(parsed.data);
    } catch (err) {
      // Never reveal whether an account exists: treat "user not found" like success.
      const message = err instanceof AuthFlowError ? err.message : "";
      if (message === "Email or password is incorrect.") setSentTo(parsed.data);
      else setFormError(message || "Something went wrong. Please try again.");
    } finally {
      setPending(false);
    }
  }

  if (status === "unconfigured") return <NotConfiguredNotice />;

  if (sentTo) {
    return (
      <div role="status" className="rounded-3xl bg-faiz-50 p-6 text-center">
        <MailCheck className="mx-auto size-10 text-faiz-600" aria-hidden />
        <p className="mt-4 font-semibold text-ink-900">Check your inbox</p>
        <p className="mt-2 text-sm text-sand-600">
          If an account exists for <span className="font-medium text-ink-800">{sentTo}</span>, we&apos;ve sent a link to reset
          your password. It may take a minute — check your spam folder too.
        </p>
        <Link href="/login" className="mt-6 inline-block text-sm font-semibold text-faiz-700 hover:text-faiz-800">
          Back to sign in
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-5">
      {formError && <FormAlert>{formError}</FormAlert>}
      <Field label="Email" htmlFor="email" error={error}>
        <Input {...fieldA11y("email", error)} type="email" autoComplete="email" placeholder="you@example.com" />
      </Field>
      <Button type="submit" size="lg" className="w-full" disabled={pending}>
        {pending && <Spinner />}
        Send reset link
      </Button>
      <p className="text-center text-sm text-sand-600">
        Remembered it?{" "}
        <Link href="/login" className="font-semibold text-faiz-700 hover:text-faiz-800">
          Sign in
        </Link>
      </p>
    </form>
  );
}
