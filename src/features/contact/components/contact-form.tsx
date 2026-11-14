"use client";

import { CircleCheck, Send } from "lucide-react";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea, fieldA11y } from "@/components/ui/form";

type Errors = Partial<Record<"name" | "email" | "message", string>>;

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** UI-only contact form with client validation. Submission will go to Firestore / email later. */
export function ContactForm() {
  const [errors, setErrors] = useState<Errors>({});
  const [sentTo, setSentTo] = useState<string | null>(null);

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const data = new FormData(form);
    const name = String(data.get("name") ?? "").trim();
    const email = String(data.get("email") ?? "").trim();
    const message = String(data.get("message") ?? "").trim();

    const next: Errors = {};
    if (!name) next.name = "Please enter your name.";
    if (!EMAIL.test(email)) next.email = "Please enter a valid email address.";
    if (message.length < 20) next.message = "Please write at least 20 characters so we can help properly.";
    setErrors(next);

    if (Object.keys(next).length === 0) {
      setSentTo(name.split(" ")[0]);
      form.reset();
    }
  }

  if (sentTo) {
    return (
      <div role="status" className="flex flex-col items-center py-12 text-center">
        <span className="flex size-16 items-center justify-center rounded-full bg-faiz-50 text-faiz-600">
          <CircleCheck className="size-8" aria-hidden />
        </span>
        <h3 className="mt-5 font-display text-2xl font-semibold text-ink-900">Thank you, {sentTo}!</h3>
        <p className="mt-2 max-w-sm text-sand-600">
          Your message is with our team. We reply to every message within one working day.
        </p>
        <Button variant="outline" className="mt-7" onClick={() => setSentTo(null)}>
          Send another message
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} noValidate className="grid gap-5 sm:grid-cols-2">
      <Field label="Full name" htmlFor="name" error={errors.name}>
        <Input {...fieldA11y("name", errors.name)} autoComplete="name" placeholder="Ayesha Khan" />
      </Field>
      <Field label="Email" htmlFor="email" error={errors.email}>
        <Input {...fieldA11y("email", errors.email)} type="email" autoComplete="email" placeholder="you@example.com" />
      </Field>
      <Field label="Phone" htmlFor="phone" optional>
        <Input {...fieldA11y("phone")} type="tel" autoComplete="tel" placeholder="0300 1234567" />
      </Field>
      <Field label="I'm reaching out about" htmlFor="topic">
        <Select {...fieldA11y("topic")} defaultValue="general">
          <option value="general">A general question</option>
          <option value="donation">A donation or request</option>
          <option value="partner">Partnering as an NGO or school</option>
          <option value="volunteer">Volunteering</option>
          <option value="report">Reporting a listing</option>
        </Select>
      </Field>
      <Field label="Message" htmlFor="message" error={errors.message} className="sm:col-span-2">
        <Textarea {...fieldA11y("message", errors.message)} rows={6} placeholder="How can we help?" />
      </Field>
      <div className="flex flex-col gap-4 sm:col-span-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-sand-500">We never share your details. Read our community guidelines in the FAQ below.</p>
        <Button type="submit" size="lg" className="shrink-0">
          <Send className="size-4" aria-hidden />
          Send message
        </Button>
      </div>
    </form>
  );
}
