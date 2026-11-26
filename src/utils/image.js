/**
 * Reads an image file and returns a compressed JPEG data URL.
 *
 * Used as a fallback when ImgBB is not configured or an upload fails, so the
 * payload saved to the API stays small enough for serverless request limits.
 */
export function compressImageToDataUrl(
  file,
  { maxWidth = 1024, quality = 0.8 } = {}
) {
  return new Promise((resolve, reject) => {
    if (!file || typeof window === "undefined") {
      reject(new Error("No image file was provided."));
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    const image = new Image();

    image.onload = () => {
      try {
        const width = image.naturalWidth || image.width;
        const height = image.naturalHeight || image.height;

        if (!width || !height) {
          throw new Error("Could not read the selected image.");
        }

        const scale = Math.min(1, maxWidth / width);
        const canvas = document.createElement("canvas");
        canvas.width = Math.max(1, Math.round(width * scale));
        canvas.height = Math.max(1, Math.round(height * scale));

        const context = canvas.getContext("2d");
        if (!context) {
          throw new Error("Could not process the selected image.");
        }

        context.drawImage(image, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", quality));
      } catch (err) {
        reject(err);
      } finally {
        URL.revokeObjectURL(objectUrl);
      }
    };

    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Could not read the selected image."));
    };

    image.src = objectUrl;
  });
}
