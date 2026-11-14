"use client";

import { ArrowRight } from "lucide-react";
import { useState, type FormEvent } from "react";
import { useToast } from "@/components/providers/toast-provider";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function NewsletterForm() {
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string>();

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!EMAIL.test(email.trim())) {
      setError("Please enter a valid email address.");
      return;
    }
    setError(undefined);
    setEmail("");
    toast("You're subscribed. Expect one heartfelt email a month.");
  }

  return (
    <form onSubmit={onSubmit} noValidate className="w-full">
      <label htmlFor="newsletter-email" className="sr-only">
        Email address
      </label>
      <div className="flex rounded-full bg-white/10 p-1 ring-1 ring-white/15 focus-within:ring-faiz-300">
        <input
          id="newsletter-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? "newsletter-error" : undefined}
          className="min-w-0 flex-1 bg-transparent px-4 text-sm text-cream-50 placeholder:text-cream-50/45 focus:outline-none"
        />
        <button
          type="submit"
          className="inline-flex h-10 shrink-0 cursor-pointer items-center gap-1.5 rounded-full bg-saffron-400 px-4 text-sm font-semibold text-faiz-950 transition hover:bg-[#d9a43c]"
        >
          Subscribe
          <ArrowRight className="size-4" aria-hidden />
        </button>
      </div>
      {error && (
        <p id="newsletter-error" className="mt-2 pl-4 text-xs text-saffron-400">
          {error}
        </p>
      )}
    </form>
  );
}
