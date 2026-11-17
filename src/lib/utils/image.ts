/** Hard upload limit for every photo (listing photos and avatars). Mirrored in storage.rules. */
export const MAX_IMAGE_BYTES = 200 * 1024;

/** Thrown when a photo can't be brought under the size limit (e.g. an undecodable HEIC file). */
export class ImageTooLargeError extends Error {}

/**
 * Client-side image compression before upload. Re-encodes as JPEG, lowering quality first and then
 * dimensions until the result fits in `maxBytes` (default 200 KB). Phone photos of 4–8 MB typically
 * end up around 120–190 KB at ~1280 px, which is plenty for listing cards and detail pages.
 */
export async function compressImage(
  file: File,
  { maxBytes = MAX_IMAGE_BYTES, maxDimension = 1280 }: { maxBytes?: number; maxDimension?: number } = {},
): Promise<Blob> {
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    // Format the browser can't decode (e.g. HEIC on some browsers): only usable if already small.
    if (file.size <= maxBytes) return file;
    throw new ImageTooLargeError("This photo format can't be resized here. Please choose a JPG or PNG photo.");
  }

  try {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new ImageTooLargeError("Your browser couldn't resize this photo.");

    let dimension = Math.min(maxDimension, Math.max(bitmap.width, bitmap.height));
    while (dimension >= 240) {
      const scale = dimension / Math.max(bitmap.width, bitmap.height);
      canvas.width = Math.max(1, Math.round(bitmap.width * scale));
      canvas.height = Math.max(1, Math.round(bitmap.height * scale));
      ctx.fillStyle = "#ffffff"; // flatten PNG transparency onto white
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);

      for (const quality of [0.82, 0.72, 0.62, 0.52, 0.42]) {
        const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", quality));
        if (blob && blob.size <= maxBytes) return blob;
      }
      dimension = Math.floor(dimension * 0.75);
    }
    throw new ImageTooLargeError("This photo couldn't be made small enough. Please try a different photo.");
  } finally {
    bitmap.close();
  }
}

/** URL-safe random ID (used for new listing folders before the Firestore document exists). */
export function randomId(length = 20) {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  return Array.from(bytes, (b) => alphabet[b % alphabet.length]).join("");
}
