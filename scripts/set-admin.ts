/**
 * Grant or revoke admin rights (server-side only — there is deliberately no UI for this):
 *   npm run admin:grant -- someone@example.com
 *   npm run admin:revoke -- someone@example.com
 *
 * Sets the `admin` custom claim with the Admin SDK and revokes existing sessions,
 * so the change applies at the user's next sign-in.
 */
import "./load-env";
import { adminAuth } from "@/server/firebase/admin";

async function main() {
  const [mode, email] = process.argv.slice(2);
  if (!email || (mode !== "grant" && mode !== "revoke")) {
    console.error("Usage: tsx scripts/set-admin.ts <grant|revoke> <email>");
    process.exit(1);
  }

  const user = await adminAuth().getUserByEmail(email);
  const claims = { ...(user.customClaims ?? {}) };
  if (mode === "grant") claims.admin = true;
  else delete claims.admin;

  await adminAuth().setCustomUserClaims(user.uid, claims);
  await adminAuth().revokeRefreshTokens(user.uid);
  console.log(`${mode === "grant" ? "Granted" : "Revoked"} admin for ${email} (${user.uid}). They must sign in again.`);
}

main().catch((error) => {
  console.error("Failed:", (error as Error).message);
  process.exit(1);
});
