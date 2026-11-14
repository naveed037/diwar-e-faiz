"use client";

import { AlertCircle, Eye, EyeOff, Loader2 } from "lucide-react";
import { useState, type ComponentProps } from "react";
import { Input } from "@/components/ui/form";
import { cn } from "@/lib/utils/cn";

export function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className={className}>
      <path fill="#4285F4" d="M22.6 12.3c0-.8-.1-1.6-.2-2.3H12v4.4h6a5.1 5.1 0 0 1-2.2 3.3v2.8h3.6c2-1.9 3.2-4.7 3.2-8.2Z" />
      <path fill="#34A853" d="M12 23c3 0 5.5-1 7.4-2.7l-3.6-2.8c-1 .7-2.3 1.1-3.8 1.1-2.9 0-5.4-2-6.3-4.6H2v2.9A11 11 0 0 0 12 23Z" />
      <path fill="#FBBC05" d="M5.7 14c-.2-.7-.4-1.3-.4-2s.1-1.4.4-2V7.1H2A11 11 0 0 0 1 12c0 1.8.4 3.5 1.2 4.9L5.7 14Z" />
      <path fill="#EA4335" d="M12 5.4c1.6 0 3.1.6 4.2 1.7l3.2-3.2A11 11 0 0 0 2 7.1L5.7 10C6.6 7.3 9.1 5.4 12 5.4Z" />
    </svg>
  );
}

export function PasswordInput(props: ComponentProps<typeof Input>) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="relative">
      <Input {...props} type={visible ? "text" : "password"} className={cn("pr-12", props.className)} />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? "Hide password" : "Show password"}
        className="absolute top-1/2 right-2 flex size-9 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full text-sand-500 transition hover:bg-cream-200 hover:text-ink-800"
      >
        {visible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
      </button>
    </div>
  );
}

export function FormAlert({ children, tone = "error" }: { children: React.ReactNode; tone?: "error" | "info" }) {
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={cn(
        "flex gap-3 rounded-2xl px-4 py-3 text-sm",
        tone === "error" ? "bg-red-50 text-red-700 ring-1 ring-red-200" : "bg-saffron-100 text-saffron-600 ring-1 ring-saffron-600/15",
      )}
    >
      <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden />
      <div>{children}</div>
    </div>
  );
}

export function Spinner({ className }: { className?: string }) {
  return <Loader2 aria-hidden className={cn("size-4 animate-spin", className)} />;
}

export function OrDivider() {
  return (
    <div className="my-6 flex items-center gap-4 text-xs font-semibold tracking-wider text-sand-500 uppercase">
      <span className="h-px flex-1 bg-ink-900/10" />
      or
      <span className="h-px flex-1 bg-ink-900/10" />
    </div>
  );
}

/** Setup hints are for developers only; visitors on a live site see a neutral message. */
const isDev = process.env.NODE_ENV === "development";

export function NotConfiguredNotice() {
  return (
    <FormAlert tone="info">
      Sign-in is temporarily unavailable. Please try again a little later.
      {isDev && (
        <>
          {" "}
          (Developer: the <code>NEXT_PUBLIC_FIREBASE_*</code> variables were missing when this app was built — add them to{" "}
          <code>.env.local</code> or your host&apos;s environment settings and rebuild.)
        </>
      )}
    </FormAlert>
  );
}
