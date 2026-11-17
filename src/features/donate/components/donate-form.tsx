"use client";

import { ref as storageRef, uploadBytesResumable } from "firebase/storage";
import { Bike, CircleCheck, Gift, ImagePlus, Star, Truck, Users, X } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { z } from "zod";
import { useToast } from "@/components/providers/toast-provider";
import { Button } from "@/components/ui/button";
import { CategoryIcon } from "@/components/ui/category-icon";
import { Field, Input, Select, Textarea, fieldA11y } from "@/components/ui/form";
import { CITIES } from "@/constants/site";
import { FormAlert, Spinner } from "@/features/auth/components/auth-bits";
import { firebaseErrorMessage } from "@/lib/errors";
import { getFirebaseStorage } from "@/lib/firebase/client";
import { STORAGE_LIMITS, storagePaths } from "@/lib/firebase/collections";
import { cn } from "@/lib/utils/cn";
import { compressImage, randomId } from "@/lib/utils/image";
import { donationFieldsSchema } from "@/lib/validation/schemas";
import { createDonation, updateDonation } from "@/server/actions/donations";
import type { Category } from "@/types/donation";
import type { DonationImage } from "@/types/firestore";

type Photo =
  | { key: string; kind: "stored"; path: string; preview: string }
  | { key: string; kind: "new"; file: File; preview: string; progress: number; path?: string };

export type DonationFormValues = {
  title: string;
  categoryId: string;
  description: string;
  condition: string;
  city: string;
  area: string;
  pickupPreference: string;
  notes: string;
};

type FieldName = keyof DonationFormValues | "imagePaths";
type Errors = Partial<Record<FieldName, string>>;

const PICKUP_OPTIONS = [
  { value: "pickup", label: "Pickup", body: "The receiver collects it from you.", icon: Users },
  { value: "delivery", label: "Delivery", body: "You can drop it off nearby.", icon: Truck },
  { value: "either", label: "Either", body: "Whatever works for both of you.", icon: Bike },
] as const;

const CONDITIONS = [
  { value: "new", label: "New — never used" },
  { value: "like-new", label: "Like new" },
  { value: "good", label: "Good — normal signs of use" },
  { value: "fair", label: "Fair — works, visible wear" },
];

const EMPTY: DonationFormValues = {
  title: "",
  categoryId: "",
  description: "",
  condition: "",
  city: "",
  area: "",
  pickupPreference: "",
  notes: "",
};

/**
 * Create or edit a listing. Photos upload straight to Firebase Storage (owner-only path, enforced by
 * storage.rules), then a server action validates everything again and writes Firestore.
 * There is intentionally no price field: every donation is free.
 */
export function DonateForm({
  mode,
  uid,
  categories,
  donationId: existingId,
  initial,
  initialImages = [],
}: {
  mode: "create" | "edit";
  uid: string;
  categories: Category[];
  donationId?: string;
  initial?: Partial<DonationFormValues>;
  initialImages?: DonationImage[];
}) {
  const router = useRouter();
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [donationId] = useState(() => existingId ?? randomId());
  const [values, setValues] = useState<DonationFormValues>({ ...EMPTY, ...initial });
  const [photos, setPhotos] = useState<Photo[]>(() =>
    initialImages.map((img) => ({ key: img.path, kind: "stored", path: img.path, preview: img.url })),
  );
  const [errors, setErrors] = useState<Errors>({});
  const [formError, setFormError] = useState<string>();
  const [phase, setPhase] = useState<"idle" | "uploading" | "saving">("idle");

  // Revoke object URLs on unmount.
  const photosRef = useRef(photos);
  useEffect(() => {
    photosRef.current = photos;
  }, [photos]);
  useEffect(() => () => photosRef.current.forEach((p) => p.kind === "new" && URL.revokeObjectURL(p.preview)), []);

  const set = (key: keyof DonationFormValues) => (value: string) => {
    setValues((v) => ({ ...v, [key]: value }));
    setErrors((e) => ({ ...e, [key]: undefined }));
  };

  function addFiles(files: FileList | null) {
    if (!files) return;
    const room = STORAGE_LIMITS.maxDonationImages - photos.length;
    const accepted: Photo[] = [];
    let rejected = 0;
    for (const file of Array.from(files)) {
      if (!file.type.startsWith("image/") || file.size > 15 * 1024 * 1024) {
        rejected++;
        continue;
      }
      if (accepted.length >= room) break;
      accepted.push({ key: randomId(8), kind: "new", file, preview: URL.createObjectURL(file), progress: 0 });
    }
    if (rejected) toast(`${rejected} file(s) skipped — only images are allowed.`, "info");
    if (files.length > room) toast(`You can add up to ${STORAGE_LIMITS.maxDonationImages} photos.`, "info");
    setPhotos((p) => [...p, ...accepted]);
    setErrors((e) => ({ ...e, imagePaths: undefined }));
    if (fileRef.current) fileRef.current.value = "";
  }

  function removePhoto(key: string) {
    setPhotos((all) => {
      const target = all.find((p) => p.key === key);
      if (target?.kind === "new") URL.revokeObjectURL(target.preview);
      return all.filter((p) => p.key !== key);
    });
  }

  function makeCover(key: string) {
    setPhotos((all) => [...all.filter((p) => p.key === key), ...all.filter((p) => p.key !== key)]);
  }

  async function uploadPending(): Promise<string[]> {
    const storage = getFirebaseStorage();
    const results = await Promise.all(
      photos.map(async (photo, index) => {
        if (photo.kind === "stored") return photo.path;
        if (photo.path) return photo.path; // uploaded on a previous attempt
        const blob = await compressImage(photo.file, { maxBytes: STORAGE_LIMITS.donationImageBytes });
        if (blob.size > STORAGE_LIMITS.donationImageBytes) throw new Error("A photo is larger than 200 KB even after compression. Please try a different photo.");
        const ext = blob.type === "image/jpeg" ? "jpg" : (photo.file.name.split(".").pop() ?? "jpg").toLowerCase().replace(/[^a-z0-9]/g, "");
        const path = storagePaths.donationImage(uid, donationId, `${index}-${randomId(12)}.${ext || "jpg"}`);
        const task = uploadBytesResumable(storageRef(storage, path), blob, { contentType: blob.type || photo.file.type });
        await new Promise<void>((resolve, reject) => {
          task.on(
            "state_changed",
            (s) => {
              const progress = Math.round((s.bytesTransferred / s.totalBytes) * 100);
              setPhotos((all) => all.map((p) => (p.key === photo.key && p.kind === "new" ? { ...p, progress } : p)));
            },
            reject,
            () => resolve(),
          );
        });
        setPhotos((all) => all.map((p) => (p.key === photo.key && p.kind === "new" ? { ...p, path, progress: 100 } : p)));
        return path;
      }),
    );
    return results;
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    // Client validation for instant feedback (the server validates again). Photo paths are checked by count here.
    const placeholderPaths = photos.map((_, i) => storagePaths.donationImage("x", "x", `p${i}.jpg`));
    const parsed = donationFieldsSchema.safeParse({ ...values, imagePaths: placeholderPaths });
    if (!parsed.success) {
      const f = z.flattenError(parsed.error).fieldErrors;
      const next = Object.fromEntries(Object.entries(f).map(([k, v]) => [k, v?.[0]])) as Errors;
      setErrors(next);
      const first = (Object.keys(next) as FieldName[])[0];
      document.getElementById(first === "imagePaths" ? "photos" : first)?.focus();
      return;
    }
    setErrors({});
    setFormError(undefined);

    try {
      setPhase("uploading");
      const imagePaths = await uploadPending();
      setPhase("saving");
      const payload = { ...values, donationId, imagePaths };
      const result = mode === "create" ? await createDonation(payload) : await updateDonation(payload);
      if (!result.ok) {
        setFormError(result.message);
        if (result.fieldErrors) setErrors(Object.fromEntries(Object.entries(result.fieldErrors).map(([k, v]) => [k, v?.[0]])) as Errors);
        setPhase("idle");
        return;
      }
      toast(mode === "create" ? "Thank you! Your listing was submitted for review." : "Changes saved and sent for review.");
      router.push(`/my-donations?${mode === "create" ? "created" : "updated"}=${donationId}`);
      router.refresh();
    } catch (error) {
      setFormError(error instanceof Error && !("code" in error) ? error.message : firebaseErrorMessage(error));
      setPhase("idle");
    }
  }

  const busy = phase !== "idle";

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-8">
      <div className="flex items-start gap-3 rounded-3xl bg-faiz-50 p-5 text-sm text-faiz-900 ring-1 ring-faiz-700/10">
        <Gift className="mt-0.5 size-5 shrink-0 text-faiz-600" aria-hidden />
        <p>
          <span className="font-semibold">Every item on Diwar-e-Faiz is given free of charge.</span> Please never ask for money, deposits or
          &ldquo;delivery fees&rdquo; — listings that do are removed.
        </p>
      </div>

      {formError && <FormAlert>{formError}</FormAlert>}

      {/* Step 1: photos */}
      <FormSection step={1} title="Add photos" description={`Clear, well-lit photos help people decide. Up to ${STORAGE_LIMITS.maxDonationImages}; the first is the cover.`}>
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-5">
          {photos.map((p, i) => {
            const uploading = p.kind === "new" && phase === "uploading" && !p.path;
            return (
              <div key={p.key} className="group relative aspect-square overflow-hidden rounded-2xl bg-cream-200 ring-1 ring-ink-900/5">
                <Image src={p.preview} alt={`Photo ${i + 1}`} fill unoptimized={p.kind === "new"} sizes="160px" className="object-cover" />
                {i === 0 ? (
                  <span className="absolute bottom-1.5 left-1.5 rounded-full bg-ink-900/70 px-2 py-0.5 text-[10px] font-semibold text-cream-50">Cover</span>
                ) : (
                  !busy && (
                    <button
                      type="button"
                      onClick={() => makeCover(p.key)}
                      className="absolute bottom-1.5 left-1.5 flex cursor-pointer items-center gap-1 rounded-full bg-white/90 px-2 py-0.5 text-[10px] font-semibold text-ink-800 opacity-100 shadow transition sm:opacity-0 sm:group-hover:opacity-100 sm:focus-visible:opacity-100"
                    >
                      <Star className="size-3" aria-hidden /> Make cover
                    </button>
                  )
                )}
                {!busy && (
                  <button
                    type="button"
                    onClick={() => removePhoto(p.key)}
                    aria-label={`Remove photo ${i + 1}`}
                    className="absolute top-1.5 right-1.5 flex size-7 cursor-pointer items-center justify-center rounded-full bg-white/90 text-ink-900 shadow transition hover:bg-white"
                  >
                    <X className="size-4" />
                  </button>
                )}
                {uploading && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-ink-900/50 text-xs font-semibold text-cream-50">
                    <Spinner className="size-5" />
                    {p.progress}%
                  </div>
                )}
                {p.kind === "new" && p.path && phase !== "idle" && (
                  <CircleCheck aria-hidden className="absolute top-1.5 left-1.5 size-5 rounded-full bg-white text-faiz-600" />
                )}
              </div>
            );
          })}
          {photos.length < STORAGE_LIMITS.maxDonationImages && (
            <button
              id="photos"
              type="button"
              disabled={busy}
              onClick={() => fileRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                addFiles(e.dataTransfer.files);
              }}
              aria-describedby={errors.imagePaths ? "photos-msg" : undefined}
              className={cn(
                "flex aspect-square cursor-pointer flex-col items-center justify-center gap-1.5 rounded-2xl border-2 border-dashed text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-50",
                errors.imagePaths
                  ? "border-red-300 bg-red-50/50 text-red-600"
                  : "border-faiz-300 bg-faiz-50/50 text-faiz-700 hover:border-faiz-500 hover:bg-faiz-50",
              )}
            >
              <ImagePlus className="size-6" aria-hidden />
              Add photo
              <span className="text-[11px] font-normal text-sand-500">
                {photos.length}/{STORAGE_LIMITS.maxDonationImages}
              </span>
            </button>
          )}
        </div>
        <input ref={fileRef} type="file" accept="image/*" multiple hidden onChange={(e) => addFiles(e.target.files)} />
        {errors.imagePaths && (
          <p id="photos-msg" className="mt-3 text-xs font-medium text-red-600">
            {errors.imagePaths}
          </p>
        )}
      </FormSection>

      {/* Step 2: what is it */}
      <FormSection step={2} title="What are you giving?">
        <div className="grid gap-5">
          <Field label="Item title" htmlFor="title" error={errors.title}>
            <Input
              {...fieldA11y("title", errors.title)}
              value={values.title}
              onChange={(e) => set("title")(e.target.value)}
              placeholder="e.g. Winter jackets for kids, ages 6–10"
              maxLength={80}
            />
          </Field>

          <fieldset>
            <legend className="text-sm font-semibold text-ink-800">Category</legend>
            <div id="categoryId" tabIndex={-1} role="radiogroup" aria-label="Category" className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {categories.map((c) => (
                <button
                  key={c.slug}
                  type="button"
                  role="radio"
                  aria-checked={values.categoryId === c.slug}
                  onClick={() => set("categoryId")(c.slug)}
                  className={cn(
                    "flex cursor-pointer flex-col items-start gap-3 rounded-2xl p-4 text-left text-sm font-semibold ring-1 transition",
                    values.categoryId === c.slug
                      ? "bg-faiz-700 text-cream-50 shadow-[0_10px_24px_-12px_rgb(23_67_46/0.7)] ring-faiz-700"
                      : "bg-white text-ink-800 ring-ink-900/10 hover:ring-faiz-500/50",
                  )}
                >
                  <CategoryIcon name={c.icon} className="size-5" />
                  {c.name}
                </button>
              ))}
            </div>
            {errors.categoryId && <p className="mt-2 text-xs font-medium text-red-600">{errors.categoryId}</p>}
          </fieldset>

          <Field label="Description" htmlFor="description" error={errors.description} hint={`${values.description.length}/2000 · Size, age, any wear or defects, what's included.`}>
            <Textarea
              {...fieldA11y("description", errors.description, true)}
              value={values.description}
              onChange={(e) => set("description")(e.target.value)}
              rows={5}
              maxLength={2000}
            />
          </Field>

          <Field label="Condition" htmlFor="condition" error={errors.condition}>
            <Select {...fieldA11y("condition", errors.condition)} value={values.condition} onChange={(e) => set("condition")(e.target.value)}>
              <option value="" disabled>
                Select condition
              </option>
              {CONDITIONS.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </Select>
          </Field>
        </div>
      </FormSection>

      {/* Step 3: handover */}
      <FormSection step={3} title="Location & handover" description="Only your city and area are shown publicly — never your exact address.">
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="City" htmlFor="city" error={errors.city}>
            <Select {...fieldA11y("city", errors.city)} value={values.city} onChange={(e) => set("city")(e.target.value)}>
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
          <Field label="Area / neighbourhood" htmlFor="area" error={errors.area}>
            <Input {...fieldA11y("area", errors.area)} value={values.area} onChange={(e) => set("area")(e.target.value)} placeholder="e.g. Gulberg III" />
          </Field>

          <fieldset className="sm:col-span-2">
            <legend className="text-sm font-semibold text-ink-800">Pickup or delivery</legend>
            <div id="pickupPreference" tabIndex={-1} role="radiogroup" className="mt-2 grid gap-3 sm:grid-cols-3">
              {PICKUP_OPTIONS.map(({ value, label, body, icon: Icon }) => (
                <button
                  key={value}
                  type="button"
                  role="radio"
                  aria-checked={values.pickupPreference === value}
                  onClick={() => set("pickupPreference")(value)}
                  className={cn(
                    "flex cursor-pointer items-start gap-3 rounded-2xl p-4 text-left ring-1 transition",
                    values.pickupPreference === value ? "bg-faiz-50 ring-2 ring-faiz-600" : "bg-white ring-ink-900/10 hover:ring-faiz-500/50",
                  )}
                >
                  <Icon className={cn("mt-0.5 size-5 shrink-0", values.pickupPreference === value ? "text-faiz-700" : "text-sand-500")} aria-hidden />
                  <span>
                    <span className="block text-sm font-semibold text-ink-900">{label}</span>
                    <span className="block text-xs text-sand-600">{body}</span>
                  </span>
                </button>
              ))}
            </div>
            {errors.pickupPreference && <p className="mt-2 text-xs font-medium text-red-600">{errors.pickupPreference}</p>}
          </fieldset>

          <Field
            label="Additional notes"
            htmlFor="notes"
            optional
            error={errors.notes}
            hint="Best times to collect, landmarks, anything else that helps. Don't include your phone number."
            className="sm:col-span-2"
          >
            <Textarea {...fieldA11y("notes", errors.notes, true)} value={values.notes} onChange={(e) => set("notes")(e.target.value)} rows={3} maxLength={500} />
          </Field>
        </div>
      </FormSection>

      <div className="flex flex-col-reverse gap-4 rounded-4xl bg-cream-200 p-6 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-ink-700">
          {mode === "create"
            ? "Listings are reviewed before they appear publicly — usually within a few hours."
            : "Saving sends your listing for a quick review again before it reappears."}
        </p>
        <Button type="submit" size="lg" className="shrink-0" disabled={busy}>
          {busy && <Spinner />}
          {phase === "uploading" ? "Uploading photos…" : phase === "saving" ? "Saving…" : mode === "create" ? "Post donation" : "Save changes"}
        </Button>
      </div>
    </form>
  );
}

function FormSection({ step, title, description, children }: { step: number; title: string; description?: string; children: React.ReactNode }) {
  return (
    <section aria-labelledby={`step-${step}`} className="rounded-4xl bg-white p-6 ring-1 ring-ink-900/5 sm:p-8">
      <div className="mb-6 flex items-start gap-4">
        <span aria-hidden className="flex size-9 shrink-0 items-center justify-center rounded-full bg-faiz-700 text-sm font-bold text-cream-50">
          {step}
        </span>
        <div>
          <h2 id={`step-${step}`} className="text-lg font-semibold text-ink-900">
            {title}
          </h2>
          {description && <p className="mt-0.5 text-sm text-sand-600">{description}</p>}
        </div>
      </div>
      {children}
    </section>
  );
}
