"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, type FormEvent } from "react";
import { z } from "zod";
import { useAuth } from "@/components/providers/auth-provider";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, fieldA11y } from "@/components/ui/form";
import { CITIES } from "@/constants/site";
import { registerSchema } from "@/lib/validation/schemas";
import { completeRegistration } from "@/server/actions/users";
import { usePostSignIn } from "../hooks/use-post-sign-in";
import { AuthFlowError, registerWithEmail, safeNext, signInWithGoogle } from "../lib/auth-client";
import { FormAlert, GoogleIcon, NotConfiguredNotice, OrDivider, PasswordInput, Spinner } from "./auth-bits";

type FieldName = "displayName" | "email" | "password" | "city" | "area" | "phone";
type Errors = Partial<Record<FieldName, string>>;

export function RegisterForm() {
  const router = useRouter();
  const next = useSearchParams().get("next");
  const { status } = useAuth();
  const afterGoogle = usePostSignIn(next);
  const [errors, setErrors] = useState<Errors>({});
  const [formError, setFormError] = useState<string>();
  const [pending, setPending] = useState<"email" | "google" | null>(null);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const parsed = registerSchema.safeParse({ ...Object.fromEntries(new FormData(e.currentTarget)), bio: "" });
    if (!parsed.success) {
      const f = z.flattenError(parsed.error).fieldErrors;
      setErrors(Object.fromEntries(Object.entries(f).map(([k, v]) => [k, v?.[0]])) as Errors);
      return;
    }
    setErrors({});
    setFormError(undefined);
    setPending("email");

    const { email, password, ...profile } = parsed.data;
    try {
      await registerWithEmail(email, password, profile.displayName);
    } catch (error) {
      setFormError(error instanceof AuthFlowError ? error.message : "Something went wrong. Please try again.");
      setPending(null);
      return;
    }

    // The account exists now; create the Firestore profile. If this fails, setup can be finished later.
    const result = await completeRegistration({ ...profile, phone: profile.phone ?? "" });
    const target = safeNext(next);
    router.replace(result.ok ? `/profile?welcome=1` : `/profile/setup?next=${encodeURIComponent(target)}`);
    router.refresh();
  }

  async function onGoogle() {
    setFormError(undefined);
    setPending("google");
    try {
      await signInWithGoogle();
      await afterGoogle();
    } catch (error) {
      setFormError(error instanceof AuthFlowError ? error.message : "Something went wrong. Please try again.");
      setPending(null);
    }
  }

  if (status === "unconfigured") return <NotConfiguredNotice />;

  return (
    <div>
      <Button variant="outline" size="lg" className="w-full bg-white" disabled={pending !== null} onClick={onGoogle}>
        {pending === "google" ? <Spinner /> : <GoogleIcon className="size-5" />}
        Sign up with Google
      </Button>

      <OrDivider />

      <form onSubmit={onSubmit} noValidate className="grid gap-5 sm:grid-cols-2">
        {formError && (
          <div className="sm:col-span-2">
            <FormAlert>{formError}</FormAlert>
          </div>
        )}
        <Field label="Full name" htmlFor="displayName" error={errors.displayName} className="sm:col-span-2">
          <Input {...fieldA11y("displayName", errors.displayName)} autoComplete="name" placeholder="Ayesha Khan" />
        </Field>
        <Field label="Email" htmlFor="email" error={errors.email} className="sm:col-span-2">
          <Input {...fieldA11y("email", errors.email)} type="email" autoComplete="email" placeholder="you@example.com" />
        </Field>
        <Field
          label="Password"
          htmlFor="password"
          error={errors.password}
          hint="At least 8 characters, with a letter and a number."
          className="sm:col-span-2"
        >
          <PasswordInput {...fieldA11y("password", errors.password, true)} autoComplete="new-password" />
        </Field>
        <Field label="City" htmlFor="city" error={errors.city}>
          <Select {...fieldA11y("city", errors.city)} defaultValue="">
            <option value="" disabled>
              Select city
            </option>
            {CITIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Area" htmlFor="area" error={errors.area}>
          <Input {...fieldA11y("area", errors.area)} placeholder="e.g. Gulberg III" />
        </Field>
        <Field
          label="Mobile number"
          htmlFor="phone"
          optional
          error={errors.phone}
          hint="Only shared with people you choose to give to or receive from."
          className="sm:col-span-2"
        >
          <Input {...fieldA11y("phone", errors.phone, true)} type="tel" autoComplete="tel" placeholder="0300 1234567" />
        </Field>

        <div className="sm:col-span-2">
          <Button type="submit" size="lg" className="w-full" disabled={pending !== null}>
            {pending === "email" && <Spinner />}
            Create account
          </Button>
          <p className="mt-4 text-center text-xs text-sand-500">
            One account lets you both donate and request items. We&apos;ll email you a link to verify your address.
          </p>
        </div>
      </form>

      <p className="mt-8 text-center text-sm text-sand-600">
        Already have an account?{" "}
        <Link href={next ? `/login?next=${encodeURIComponent(next)}` : "/login"} className="font-semibold text-faiz-700 hover:text-faiz-800">
          Sign in
        </Link>
      </p>
    </div>
  );
}
