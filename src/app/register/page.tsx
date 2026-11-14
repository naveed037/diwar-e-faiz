import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthShell } from "@/features/auth/components/auth-shell";
import { RegisterForm } from "@/features/auth/components/register-form";

export const metadata: Metadata = { title: "Create account", robots: { index: false } };

export default function RegisterPage() {
  return (
    <AuthShell
      title="Join the wall of kindness"
      subtitle={
        <>
          Free forever. One account to give <em>and</em> receive.
        </>
      }
    >
      <Suspense fallback={<div className="h-[36rem] animate-pulse rounded-3xl bg-cream-100" />}>
        <RegisterForm />
      </Suspense>
    </AuthShell>
  );
}
