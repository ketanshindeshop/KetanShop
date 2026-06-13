/**
 * Client-side image compression using the Canvas API.
 * Resizes to max 400px, converts to WebP quality 70 — no external dependencies.
 *
 * Works in all modern browsers and avoids relying on server-side sharp
 * (which isn't available in Vercel serverless functions).
 */

const MAX_DIMENSION = 400;
const WEBP_QUALITY = 0.7;

/**
 * Compress a File object to a WebP blob + base64.
 *
 * @param {File} file - The image file selected by the user
 * @returns {Promise<{ blob: Blob, base64: string, mime: string, fileName: string }>}
 */
export async function compressFile(file) {
  const img = await loadImage(file);
  const { width, height } = calculateDimensions(img.width, img.height);

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');

  // Fill with white background first (handles transparent PNG → WebP nicely)
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, height);
  ctx.drawImage(img, 0, 0, width, height);

  const blob = await canvasToBlob(canvas);
  const base64 = await blobToBase64(blob);
  const fileName = ensureWebpExtension(file.name);

  // Revoke the object URL we created in loadImage
  URL.revokeObjectURL(img.src);

  return { blob, base64, mime: 'image/webp', fileName };
}

/**
 * Load a File into an HTML Image element.
 */
function loadImage(file) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed to load ${file.name}`));
    img.src = URL.createObjectURL(file);
  });
}

/**
 * Calculate new dimensions maintaining aspect ratio, capped at MAX_DIMENSION.
 */
function calculateDimensions(width, height) {
  if (width <= MAX_DIMENSION && height <= MAX_DIMENSION) {
    return { width, height };
  }
  const ratio = Math.min(MAX_DIMENSION / width, MAX_DIMENSION / height);
  return {
    width: Math.round(width * ratio),
    height: Math.round(height * ratio),
  };
}

/**
 * Convert canvas to WebP blob.
 */
function canvasToBlob(canvas) {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error('Canvas toBlob failed'));
      },
      'image/webp',
      WEBP_QUALITY
    );
  });
}

/**
 * Convert blob to base64 string (without the data:... prefix).
 */
function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/**
 * Replace file extension with .webp.
 */
function ensureWebpExtension(name) {
  const dot = name.lastIndexOf('.');
  const base = dot > 0 ? name.substring(0, dot) : name;
  return `${base}.webp`;
}
