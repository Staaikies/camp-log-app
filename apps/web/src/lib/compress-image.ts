const DEFAULT_MAX_W = 1600;
const DEFAULT_QUALITY = 0.82;

/** Resize to JPEG data URL to keep localStorage usage reasonable. */
export async function fileToJpegDataUrl(
  file: File,
  maxWidth = DEFAULT_MAX_W,
  quality = DEFAULT_QUALITY,
): Promise<string> {
  const bitmap = await createImageBitmap(file);
  try {
    const scale = Math.min(1, maxWidth / bitmap.width);
    const w = Math.max(1, Math.round(bitmap.width * scale));
    const h = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Could not get canvas context");
    ctx.drawImage(bitmap, 0, 0, w, h);
    const url = canvas.toDataURL("image/jpeg", quality);
    if (url.length > 1_200_000) {
      return canvas.toDataURL("image/jpeg", Math.max(0.5, quality - 0.15));
    }
    return url;
  } finally {
    bitmap.close();
  }
}
