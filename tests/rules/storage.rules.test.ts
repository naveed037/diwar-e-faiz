/**
 * Storage security rules tests (run inside the emulator):  npm run test:rules
 * Uploads: owner's own folder only, images only, size limits, verified email for listing photos.
 */
import { readFileSync } from "node:fs";
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from "@firebase/rules-unit-testing";
import { deleteObject, getBytes, ref, uploadBytes } from "firebase/storage";
import { afterAll, beforeAll, beforeEach, describe, it } from "vitest";

let env: RulesTestEnvironment;

const MB = 1024 * 1024;
const bytes = (size: number) => new Uint8Array(size);
const jpeg = { contentType: "image/jpeg" };

const verified = (uid: string) => env.authenticatedContext(uid, { email_verified: true }).storage();
const unverified = (uid: string) => env.authenticatedContext(uid, { email_verified: false }).storage();
const anon = () => env.unauthenticatedContext().storage();

beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: "demo-diwar-rules",
    storage: { rules: readFileSync("storage.rules", "utf8") },
  });
});

afterAll(async () => {
  await env?.cleanup();
});

beforeEach(async () => {
  await env.clearStorage();
  await env.withSecurityRulesDisabled(async (ctx) => {
    await uploadBytes(ref(ctx.storage(), "donations/alice/d1/photo.jpg"), bytes(1000), jpeg);
    await uploadBytes(ref(ctx.storage(), "users/alice/avatar/me.jpg"), bytes(1000), jpeg);
  });
});

describe("listing photos: donations/{uid}/{donationId}/{file}", () => {
  it("are publicly readable", async () => {
    await assertSucceeds(getBytes(ref(anon(), "donations/alice/d1/photo.jpg")));
  });

  it("owner with a verified email can upload an image under 5 MB", async () => {
    await assertSucceeds(uploadBytes(ref(verified("alice"), "donations/alice/d2/1.jpg"), bytes(2 * MB), jpeg));
  });

  it("rejects unverified emails, other users' folders, anonymous users", async () => {
    await assertFails(uploadBytes(ref(unverified("alice"), "donations/alice/d2/1.jpg"), bytes(1000), jpeg));
    await assertFails(uploadBytes(ref(verified("bob"), "donations/alice/d2/1.jpg"), bytes(1000), jpeg));
    await assertFails(uploadBytes(ref(anon(), "donations/alice/d2/1.jpg"), bytes(1000), jpeg));
  });

  it("rejects non-images, empty files and files of 5 MB or more", async () => {
    await assertFails(uploadBytes(ref(verified("alice"), "donations/alice/d2/x.pdf"), bytes(1000), { contentType: "application/pdf" }));
    await assertFails(uploadBytes(ref(verified("alice"), "donations/alice/d2/x.svg"), bytes(1000), { contentType: "image/svg+xml" }));
    await assertFails(uploadBytes(ref(verified("alice"), "donations/alice/d2/empty.jpg"), bytes(0), jpeg));
    await assertFails(uploadBytes(ref(verified("alice"), "donations/alice/d2/big.jpg"), bytes(5 * MB), jpeg));
  });

  it("existing files can't be overwritten; only the owner can delete", async () => {
    await assertFails(uploadBytes(ref(verified("alice"), "donations/alice/d1/photo.jpg"), bytes(1000), jpeg));
    await assertFails(deleteObject(ref(verified("bob"), "donations/alice/d1/photo.jpg")));
    await assertSucceeds(deleteObject(ref(verified("alice"), "donations/alice/d1/photo.jpg")));
  });
});

describe("avatars: users/{uid}/avatar/{file}", () => {
  it("owner can upload an image under 2 MB (no verification needed)", async () => {
    await assertSucceeds(uploadBytes(ref(unverified("alice"), "users/alice/avatar/new.png"), bytes(MB), { contentType: "image/png" }));
  });

  it("rejects other users, oversize files and non-images", async () => {
    await assertFails(uploadBytes(ref(verified("bob"), "users/alice/avatar/x.jpg"), bytes(1000), jpeg));
    await assertFails(uploadBytes(ref(verified("alice"), "users/alice/avatar/big.jpg"), bytes(2 * MB), jpeg));
    await assertFails(uploadBytes(ref(verified("alice"), "users/alice/avatar/x.txt"), bytes(10), { contentType: "text/plain" }));
  });

  it("existing avatar files can't be overwritten (new photos get new file names)", async () => {
    await assertFails(uploadBytes(ref(verified("alice"), "users/alice/avatar/me.jpg"), bytes(1000), jpeg));
  });
});

describe("everything else", () => {
  it("is denied", async () => {
    await assertFails(uploadBytes(ref(verified("alice"), "random/file.jpg"), bytes(10), jpeg));
    await assertFails(getBytes(ref(anon(), "random/file.jpg")));
  });
});
