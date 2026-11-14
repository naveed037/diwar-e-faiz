"use client";

import { LogOut, MailWarning } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useAuth } from "@/components/providers/auth-provider";
import { useToast } from "@/components/providers/toast-provider";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/features/auth/components/auth-bits";
import { AuthFlowError, refreshSessionAfterVerification, resendVerificationEmail, signOut } from "@/features/auth/lib/auth-client";

export function SignOutButton({ className }: { className?: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  return (
    <Button
      variant="outline"
      className={className}
      disabled={pending}
      onClick={async () => {
        setPending(true);
        await signOut();
        router.replace("/");
        router.refresh();
      }}
    >
      {pending ? <Spinner /> : <LogOut className="size-4" aria-hidden />}
      Sign out
    </Button>
  );
}

/** Shown while the email address is unverified. Donating and requesting require a verified email. */
export function VerifyEmailBanner({ email }: { email: string }) {
  const router = useRouter();
  const { toast } = useToast();
  const { refresh } = useAuth();
  const [pending, setPending] = useState<"resend" | "check" | null>(null);

  async function act(kind: "resend" | "check") {
    setPending(kind);
    try {
      if (kind === "resend") {
        await resendVerificationEmail();
        toast(`Verification link sent to ${email}.`);
      } else {
        await refreshSessionAfterVerification();
        await refresh();
        toast("Email verified — you're all set!");
        router.refresh();
      }
    } catch (error) {
      toast(error instanceof AuthFlowError ? error.message : "Something went wrong. Please try again.", "info");
    } finally {
      setPending(null);
    }
  }

  return (
    <div className="flex flex-col gap-4 rounded-3xl bg-saffron-100 p-5 ring-1 ring-saffron-600/15 sm:flex-row sm:items-center">
      <MailWarning className="size-6 shrink-0 text-saffron-600" aria-hidden />
      <div className="flex-1 text-sm text-ink-800">
        <p className="font-semibold">Please verify your email</p>
        <p className="mt-0.5 text-ink-700">
          We sent a link to <span className="font-medium">{email}</span>. You need a verified email to donate or request items.
        </p>
      </div>
      <div className="flex shrink-0 gap-2">
        <Button size="sm" variant="light" onClick={() => act("resend")} disabled={pending !== null}>
          {pending === "resend" && <Spinner />}
          Resend link
        </Button>
        <Button size="sm" onClick={() => act("check")} disabled={pending !== null}>
          {pending === "check" && <Spinner />}
          I&apos;ve verified
        </Button>
      </div>
    </div>
  );
}
