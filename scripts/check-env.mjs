// Runs before `next build` (npm "prebuild"). Prints which Firebase variables are present — names only,
// never values. On Netlify/CI a missing variable fails the build, so a site without working sign-in is
// never published. Locally it only warns (the app runs with Firebase features disabled).
import { existsSync } from "node:fs";

if (existsSync(".env.local")) {
  const { config } = await import("dotenv");
  config({ path: ".env.local", quiet: true });
}

const REQUIRED = [
  "NEXT_PUBLIC_FIREBASE_API_KEY",
  "NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN",
  "NEXT_PUBLIC_FIREBASE_PROJECT_ID",
  "NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET",
  "NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID",
  "NEXT_PUBLIC_FIREBASE_APP_ID",
  "FIREBASE_PROJECT_ID",
  "FIREBASE_CLIENT_EMAIL",
  "FIREBASE_PRIVATE_KEY",
];

const missing = REQUIRED.filter((name) => !process.env[name]?.trim());
const onCI = process.env.NETLIFY === "true" || process.env.CI === "true";

console.log("\nFirebase environment check (names only):");
for (const name of REQUIRED) console.log(`  ${missing.includes(name) ? "✖ missing" : "✔ present"}  ${name}`);

if (missing.length === 0) {
  console.log("All Firebase variables present.\n");
} else if (onCI) {
  console.error(
    `\n${missing.length} Firebase variable(s) missing in this build.\n` +
      "Netlify: Site configuration → Environment variables. Add them with a scope that includes \"Builds\"\n" +
      "and a deploy context that includes \"Production\", then trigger a new deploy.\n",
  );
  process.exit(1);
} else {
  console.warn(`\nWarning: ${missing.length} Firebase variable(s) missing — Firebase features will be disabled.\n`);
}
