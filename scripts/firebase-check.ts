/**
 * Firebase connectivity check:  npm run firebase:check
 *
 * Verifies, step by step, that every credential and service is configured correctly,
 * and prints a precise hint for anything that fails. Writes and deletes one temporary
 * document in the server-only `_healthchecks` collection.
 */
import "./load-env";
import { initializeApp as initClientApp } from "firebase/app";
import { collection, getDocs, getFirestore as getClientFirestore, limit, query } from "firebase/firestore";
import { FieldValue } from "firebase-admin/firestore";
import { getFirebaseConfig, missingFirebaseEnv } from "@/lib/firebase/config";
import { adminAuth, adminBucket, adminDb } from "@/server/firebase/admin";
import { getServerEnv } from "@/server/env";

type Check = { name: string; run: () => Promise<string>; hint: string };

const checks: Check[] = [
  {
    name: "Web app config (NEXT_PUBLIC_FIREBASE_*)",
    hint: "Copy the six values from Firebase console → Project settings → Your apps → Web app into .env.local.",
    run: async () => {
      if (missingFirebaseEnv.length) throw new Error(`missing ${missingFirebaseEnv.join(", ")}`);
      return `project ${getFirebaseConfig().projectId}`;
    },
  },
  {
    name: "Admin credentials (FIREBASE_* service account)",
    hint: "Project settings → Service accounts → Generate new private key; copy project_id, client_email, private_key into .env.local.",
    run: async () => {
      const env = getServerEnv();
      if (env.FIREBASE_PROJECT_ID !== process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID) {
        throw new Error(`FIREBASE_PROJECT_ID (${env.FIREBASE_PROJECT_ID}) ≠ NEXT_PUBLIC_FIREBASE_PROJECT_ID`);
      }
      return env.usingEmulators ? "emulator mode" : (env.FIREBASE_CLIENT_EMAIL ?? "");
    },
  },
  {
    name: "Authentication (Admin)",
    hint: "Enable Authentication in the console (Build → Authentication → Get started) and check the service account key.",
    run: async () => {
      const { users } = await adminAuth().listUsers(1);
      return `reachable (${users.length ? "has users" : "no users yet"})`;
    },
  },
  {
    name: "Cloud Firestore (Admin write → read → delete)",
    hint: "Create the Firestore database (Build → Firestore Database → Create database, production mode, region asia-south1).",
    run: async () => {
      const ref = adminDb().collection("_healthchecks").doc(`check-${Date.now()}`);
      await ref.set({ at: FieldValue.serverTimestamp(), source: "firebase-check" });
      const snap = await ref.get();
      await ref.delete();
      if (!snap.exists) throw new Error("write succeeded but read returned nothing");
      return "read/write OK";
    },
  },
  {
    name: "Cloud Firestore (client SDK + security rules)",
    hint: "Deploy rules with `npm run firebase:deploy-rules`. Public collections (categories) must be readable.",
    run: async () => {
      const app = initClientApp(getFirebaseConfig(), "firebase-check");
      const snap = await getDocs(query(collection(getClientFirestore(app), "categories"), limit(1)));
      return `public read allowed (${snap.size ? "categories seeded" : "no categories yet — run npm run firebase:seed"})`;
    },
  },
  {
    name: "Cloud Storage bucket",
    hint: "Create the default bucket (Build → Storage → Get started; requires the Blaze plan) and check NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET.",
    run: async () => {
      const [exists] = await adminBucket().exists();
      if (!exists) throw new Error(`bucket "${adminBucket().name}" not found`);
      return adminBucket().name;
    },
  },
];

async function main() {
  console.log("\nDiwar-e-Faiz · Firebase connectivity check\n");
  let failed = 0;
  let configFailed = false;
  for (const [index, check] of checks.entries()) {
    // The first two checks are configuration; service checks are meaningless until they pass.
    // Service checks are independent of each other, so one failing service doesn't skip the rest.
    if (index === 2) configFailed = failed > 0;
    if (index >= 2 && configFailed) {
      console.log(`  – ${check.name} — skipped (fix the configuration above first)`);
      continue;
    }
    try {
      const detail = await Promise.race([
        check.run(),
        new Promise<string>((_, reject) => setTimeout(() => reject(new Error("timed out after 15s")), 15_000)),
      ]);
      console.log(`  ✔ ${check.name} — ${detail}`);
    } catch (error) {
      failed++;
      console.log(`  ✖ ${check.name}\n      ${(error as Error).message}\n      → ${check.hint}`);
    }
  }
  console.log(failed ? `\n${failed} check(s) failed.\n` : "\nAll checks passed. Firebase is connected.\n");
  process.exit(failed ? 1 : 0);
}

void main();
