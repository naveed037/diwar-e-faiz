import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthShell } from "@/features/auth/components/auth-shell";
import { LoginForm } from "@/features/auth/components/login-form";

export const metadata: Metadata = { title: "Sign in", robots: { index: false } };

export default function LoginPage() {
  return (
    <AuthShell title="Welcome back" subtitle="Sign in to donate, request items and chat with your community.">
      <Suspense fallback={<div className="h-96 animate-pulse rounded-3xl bg-cream-100" />}>
        <LoginForm />
      </Suspense>
    </AuthShell>
  );
}
