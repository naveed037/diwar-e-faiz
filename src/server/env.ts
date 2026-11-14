import "server-only";
import { z } from "zod";
import { AppError } from "@/lib/errors";

/**
 * Server-only configuration (never prefixed with NEXT_PUBLIC_, never sent to the browser).
 * When FIRESTORE_EMULATOR_HOST / FIREBASE_AUTH_EMULATOR_HOST are set, service-account
 * credentials are optional so local emulator testing works without real secrets.
 */
const usingEmulators = Boolean(process.env.FIRESTORE_EMULATOR_HOST || process.env.FIREBASE_AUTH_EMULATOR_HOST);

const schema = z.object({
  FIREBASE_PROJECT_ID: z.string().min(1),
  FIREBASE_STORAGE_BUCKET: z.string().min(1),
  FIREBASE_CLIENT_EMAIL: usingEmulators ? z.string().optional() : z.email(),
  FIREBASE_PRIVATE_KEY: usingEmulators
    ? z.string().optional()
    : z.string().includes("PRIVATE KEY", { message: "must be the full PEM private key from the service account JSON" }),
});

export type ServerEnv = z.infer<typeof schema> & { usingEmulators: boolean };

let cached: ServerEnv | undefined;

export function getServerEnv(): ServerEnv {
  if (cached) return cached;

  const parsed = schema.safeParse({
    FIREBASE_PROJECT_ID: process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    FIREBASE_STORAGE_BUCKET: process.env.FIREBASE_STORAGE_BUCKET || process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    FIREBASE_CLIENT_EMAIL: process.env.FIREBASE_CLIENT_EMAIL,
    // Hosting dashboards often store multi-line keys with literal "\n" sequences.
    FIREBASE_PRIVATE_KEY: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
  });

  if (!parsed.success) {
    const problems = Object.entries(z.flattenError(parsed.error).fieldErrors)
      .map(([key, msgs]) => `${key}: ${msgs?.join(", ")}`)
      .join("; ");
    throw new AppError("not-configured", `Firebase Admin is not configured. ${problems}. See .env.example.`);
  }

  cached = { ...parsed.data, usingEmulators };
  return cached;
}
