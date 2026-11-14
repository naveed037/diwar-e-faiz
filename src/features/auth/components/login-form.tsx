"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState, type FormEvent } from "react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Field, Input, fieldA11y } from "@/components/ui/form";
import { useAuth } from "@/components/providers/auth-provider";
import { loginSchema } from "@/lib/validation/schemas";
import { usePostSignIn } from "../hooks/use-post-sign-in";
import { AuthFlowError, signInWithEmail, signInWithGoogle } from "../lib/auth-client";
import { FormAlert, GoogleIcon, NotConfiguredNotice, OrDivider, PasswordInput, Spinner } from "./auth-bits";

type Errors = Partial<Record<"email" | "password", string>>;

export function LoginForm() {
  const params = useSearchParams();
  const next = params.get("next");
  const { status } = useAuth();
  const afterSignIn = usePostSignIn(next);
  const [errors, setErrors] = useState<Errors>({});
  const [formError, setFormError] = useState<string>();
  const [pending, setPending] = useState<"email" | "google" | null>(null);

  async function run(kind: "email" | "google", fn: () => Promise<unknown>) {
    setFormError(undefined);
    setPending(kind);
    try {
      await fn();
      await afterSignIn();
    } catch (error) {
      setFormError(error instanceof AuthFlowError ? error.message : "Something went wrong. Please try again.");
      setPending(null);
    }
  }

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.currentTarget));
    const parsed = loginSchema.safeParse(data);
    if (!parsed.success) {
      const f = z.flattenError(parsed.error).fieldErrors;
      setErrors({ email: f.email?.[0], password: f.password?.[0] });
      return;
    }
    setErrors({});
    void run("email", () => signInWithEmail(parsed.data.email, parsed.data.password));
  }

  if (status === "unconfigured") return <NotConfiguredNotice />;

  return (
    <div>
      <Button
        variant="outline"
        size="lg"
        className="w-full bg-white"
        disabled={pending !== null}
        onClick={() => run("google", signInWithGoogle)}
      >
        {pending === "google" ? <Spinner /> : <GoogleIcon className="size-5" />}
        Continue with Google
      </Button>

      <OrDivider />

      <form onSubmit={onSubmit} noValidate className="space-y-5">
        {formError && <FormAlert>{formError}</FormAlert>}
        <Field label="Email" htmlFor="email" error={errors.email}>
          <Input {...fieldA11y("email", errors.email)} type="email" autoComplete="email" placeholder="you@example.com" />
        </Field>
        <Field label="Password" htmlFor="password" error={errors.password}>
          <PasswordInput {...fieldA11y("password", errors.password)} autoComplete="current-password" />
        </Field>
        <div className="flex justify-end">
          <Link href="/forgot-password" className="text-sm font-semibold text-faiz-700 hover:text-faiz-800">
            Forgot password?
          </Link>
        </div>
        <Button type="submit" size="lg" className="w-full" disabled={pending !== null}>
          {pending === "email" && <Spinner />}
          Sign in
        </Button>
      </form>

      <p className="mt-8 text-center text-sm text-sand-600">
        New to Diwar-e-Faiz?{" "}
        <Link
          href={next ? `/register?next=${encodeURIComponent(next)}` : "/register"}
          className="font-semibold text-faiz-700 hover:text-faiz-800"
        >
          Create a free account
        </Link>
      </p>
    </div>
  );
}
