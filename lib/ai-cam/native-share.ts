export type NativeShareResult = "shared" | "cancelled" | "unsupported";

export function canUseNativeShare() {
  return typeof navigator !== "undefined" && typeof navigator.share === "function";
}

function pickSharePayload(file: File, options: { title: string; text: string }): ShareData {
  const candidates: ShareData[] = [
    { files: [file], title: options.title, text: options.text },
    { files: [file], title: options.title },
    { files: [file] },
  ];

  if (typeof navigator.canShare !== "function") {
    return candidates[0];
  }

  return candidates.find((candidate) => navigator.canShare!(candidate)) ?? candidates[0];
}

/** Opens the browser's native share sheet. Must be called directly from a user gesture. */
export function startNativeShare(
  file: File,
  options: { title: string; text: string },
): Promise<NativeShareResult> {
  if (!canUseNativeShare()) return Promise.resolve("unsupported");
  if (file.size === 0) return Promise.reject(new Error("Photo file is empty."));

  const payload = pickSharePayload(file, options);

  return navigator
    .share(payload)
    .then((): NativeShareResult => "shared")
    .catch((err: unknown): NativeShareResult => {
      if (err instanceof DOMException && err.name === "AbortError") return "cancelled";
      throw err;
    });
}

function compressDataUrlForShare(dataUrl: string, maxDimension = 1080, quality = 0.82): Promise<File> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, maxDimension / Math.max(img.width, img.height));
      const width = Math.max(1, Math.round(img.width * scale));
      const height = Math.max(1, Math.round(img.height * scale));
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Could not prepare the photo for sharing."));
        return;
      }
      ctx.drawImage(img, 0, 0, width, height);
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error("Could not prepare the photo for sharing."));
            return;
          }
          resolve(new File([blob], "world-cup-selfie.jpg", { type: "image/jpeg" }));
        },
        "image/jpeg",
        quality,
      );
    };
    img.onerror = () => reject(new Error("Could not read the photo for sharing."));
    img.src = dataUrl;
  });
}

export function prepareShareFile(dataUrl: string, countryId: string): Promise<File> {
  return compressDataUrlForShare(dataUrl).then((file) => {
    return new File([file], `ai-cam-${countryId}-world-cup.jpg`, { type: "image/jpeg" });
  });
}

export function createShareFileFromDataUrl(dataUrl: string, countryId: string): File {
  const [header, base64] = dataUrl.split(",");
  const mime = header.match(/:(.*?);/)?.[1] ?? "image/jpeg";
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  const blob = new Blob([bytes], { type: mime });
  return new File([blob], `ai-cam-${countryId}-world-cup.jpg`, { type: mime });
}
