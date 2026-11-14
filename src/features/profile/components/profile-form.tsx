"use client";

import { Camera, Trash2 } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useRef, useState, type FormEvent } from "react";
import { ref as storageRef, uploadBytes } from "firebase/storage";
import { z } from "zod";
import { useAuth } from "@/components/providers/auth-provider";
import { useToast } from "@/components/providers/toast-provider";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea, fieldA11y } from "@/components/ui/form";
import { CITIES } from "@/constants/site";
import { firebaseErrorMessage } from "@/lib/errors";
import { getFirebaseStorage } from "@/lib/firebase/client";
import { STORAGE_LIMITS, storagePaths } from "@/lib/firebase/collections";
import { randomId } from "@/lib/utils/image";
import { completeRegistrationSchema } from "@/lib/validation/schemas";
import { completeRegistration, updateProfile } from "@/server/actions/users";
import { FormAlert, Spinner } from "@/features/auth/components/auth-bits";
import { safeNext } from "@/features/auth/lib/auth-client";

export type ProfileFormValues = {
  displayName: string;
  city: string;
  area: string;
  phone: string;
  bio: string;
  photoURL: string | null;
};

type FieldName = "displayName" | "city" | "area" | "phone" | "bio";
type Errors = Partial<Record<FieldName | "photo", string>>;

const BIO_MAX = 300;

function initialsOf(name: string) {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0]!.toUpperCase())
      .join("") || "?"
  );
}

/** One form for first-time setup ("setup") and later edits ("edit"). The server re-validates everything. */
export function ProfileForm({ mode, initial, next }: { mode: "setup" | "edit"; initial: ProfileFormValues; next?: string | null }) {
  const router = useRouter();
  const { toast } = useToast();
  const { user, refresh } = useAuth();
  const fileRef = useRef<HTMLInputElement>(null);

  const [values, setValues] = useState(initial);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(initial.photoURL);
  const [photoRemoved, setPhotoRemoved] = useState(false);
  const [errors, setErrors] = useState<Errors>({});
  const [formError, setFormError] = useState<string>();
  const [pending, setPending] = useState(false);

  const set = (key: keyof ProfileFormValues) => (e: { target: { value: string } }) =>
    setValues((v) => ({ ...v, [key]: e.target.value }));

  function pickPhoto(file: File | undefined) {
    if (!file) return;
    if (!file.type.startsWith("image/")) return setErrors((e) => ({ ...e, photo: "Please choose an image file." }));
    if (file.size > STORAGE_LIMITS.avatarBytes) return setErrors((e) => ({ ...e, photo: "Profile photos must be under 2 MB." }));
    if (photoPreview?.startsWith("blob:")) URL.revokeObjectURL(photoPreview);
    setErrors((e) => ({ ...e, photo: undefined }));
    setPhotoFile(file);
    setPhotoRemoved(false);
    setPhotoPreview(URL.createObjectURL(file));
  }

  function removePhoto() {
    if (photoPreview?.startsWith("blob:")) URL.revokeObjectURL(photoPreview);
    setPhotoFile(null);
    setPhotoPreview(null);
    setPhotoRemoved(true);
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const parsed = completeRegistrationSchema.safeParse(values);
    if (!parsed.success) {
      const f = z.flattenError(parsed.error).fieldErrors;
      setErrors(Object.fromEntries(Object.entries(f).map(([k, v]) => [k, v?.[0]])) as Errors);
      return;
    }
    setErrors({});
    setFormError(undefined);
    setPending(true);

    try {
      const payload = { ...values };
      if (mode === "setup") {
        const result = await completeRegistration(payload);
        if (!result.ok) return failWith(result.message, result.fieldErrors);
        await refresh();
        router.replace(safeNext(next, "/profile?welcome=1"));
        router.refresh();
        return;
      }

      let photoPath: string | null | undefined;
      if (photoFile && user) {
        const ext = (photoFile.name.split(".").pop() ?? "jpg").toLowerCase().replace(/[^a-z0-9]/g, "");
        photoPath = storagePaths.avatar(user.uid, `${randomId(12)}.${ext || "jpg"}`);
        await uploadBytes(storageRef(getFirebaseStorage(), photoPath), photoFile, { contentType: photoFile.type });
      } else if (photoRemoved) {
        photoPath = null;
      }

      const result = await updateProfile({ ...payload, photoPath });
      if (!result.ok) return failWith(result.message, result.fieldErrors);
      setPhotoFile(null);
      setPhotoRemoved(false);
      await refresh();
      toast("Profile saved.");
      router.refresh();
    } catch (error) {
      failWith(firebaseErrorMessage(error));
    } finally {
      setPending(false);
    }
  }

  function failWith(message: string, fieldErrors?: Record<string, string[] | undefined>) {
    setFormError(message);
    if (fieldErrors) setErrors(Object.fromEntries(Object.entries(fieldErrors).map(([k, v]) => [k, v?.[0]])) as Errors);
    setPending(false);
  }

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-8">
      {formError && <FormAlert>{formError}</FormAlert>}

      {mode === "edit" && (
        <section aria-labelledby="photo-heading" className="flex flex-col gap-5 sm:flex-row sm:items-center">
          <div className="relative size-24 shrink-0 overflow-hidden rounded-full ring-4 ring-cream-200">
            {photoPreview ? (
              <Image src={photoPreview} alt="Your profile photo" fill sizes="96px" unoptimized={photoPreview.startsWith("blob:")} className="object-cover" />
            ) : (
              <Avatar initials={initialsOf(values.displayName)} className="size-full text-2xl" />
            )}
          </div>
          <div>
            <h2 id="photo-heading" className="font-semibold text-ink-900">
              Profile picture
            </h2>
            <p className="mt-0.5 text-sm text-sand-600">A friendly photo helps people trust you. JPG or PNG, under 2 MB.</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button variant="secondary" size="sm" onClick={() => fileRef.current?.click()}>
                <Camera className="size-4" aria-hidden />
                {photoPreview ? "Change photo" : "Upload photo"}
              </Button>
              {photoPreview && (
                <Button variant="ghost" size="sm" onClick={removePhoto}>
                  <Trash2 className="size-4" aria-hidden />
                  Remove
                </Button>
              )}
            </div>
            {errors.photo && <p className="mt-2 text-xs font-medium text-red-600">{errors.photo}</p>}
            <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => pickPhoto(e.target.files?.[0])} />
          </div>
        </section>
      )}

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Full name" htmlFor="displayName" error={errors.displayName} className="sm:col-span-2">
          <Input {...fieldA11y("displayName", errors.displayName)} value={values.displayName} onChange={set("displayName")} autoComplete="name" />
        </Field>
        <Field label="City" htmlFor="city" error={errors.city}>
          <Select {...fieldA11y("city", errors.city)} value={values.city} onChange={set("city")}>
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
          <Input {...fieldA11y("area", errors.area)} value={values.area} onChange={set("area")} placeholder="e.g. Gulberg III" />
        </Field>
        <Field
          label="Mobile number"
          htmlFor="phone"
          optional
          error={errors.phone}
          hint="Private. Only shared inside a conversation once a request is accepted."
          className="sm:col-span-2"
        >
          <Input {...fieldA11y("phone", errors.phone, true)} value={values.phone} onChange={set("phone")} type="tel" autoComplete="tel" placeholder="0300 1234567" />
        </Field>
        <Field
          label="Short introduction"
          htmlFor="bio"
          optional
          error={errors.bio}
          hint={`${values.bio.length}/${BIO_MAX} — e.g. "Teacher in Model Town. Happy to pass on books and kids' clothes."`}
          className="sm:col-span-2"
        >
          <Textarea {...fieldA11y("bio", errors.bio, true)} value={values.bio} onChange={set("bio")} rows={4} maxLength={BIO_MAX} />
        </Field>
      </div>

      <div className="flex flex-col-reverse gap-3 border-t border-ink-900/5 pt-6 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-sand-500">Your name, city, area, photo and introduction are visible on your listings.</p>
        <Button type="submit" size="lg" disabled={pending} className="shrink-0">
          {pending && <Spinner />}
          {mode === "setup" ? "Finish setup" : "Save changes"}
        </Button>
      </div>
    </form>
  );
}
