const MAX_DIMENSION = 400;
const WEBP_QUALITY = 70;

// Cache the sharp import so we only attempt to load it once
let sharpModule = null;
let sharpLoadAttempted = false;

/**
 * Lazily load sharp — uses dynamic import so the module can be loaded
 * in environments where native binaries aren't available (e.g., Vercel
 * serverless functions). Falls back to returning the original buffer
 * unchanged if sharp is not available.
 * Only attempts to load sharp once; subsequent calls use the cached result.
 */
async function getSharp() {
  if (!sharpLoadAttempted) {
    sharpLoadAttempted = true;
    try {
      const mod = await import('sharp');
      sharpModule = mod.default;
    } catch {
      console.warn('⚠️  sharp not available — image compression skipped');
    }
  }
  return sharpModule;
}

/**
 * Detect the MIME type of an image from its magic bytes (file signature).
 * Falls back to 'image/jpeg' if the format is unrecognized.
 *
 * @param {Buffer} buffer - Raw image data
 * @returns {string} MIME type string
 */
export function detectMimeFromBuffer(buffer) {
  if (!buffer || buffer.length < 4) return 'image/jpeg';

  const header = buffer.subarray(0, 12).toString('hex');

  if (header.startsWith('89504e47')) return 'image/png';
  if (header.startsWith('ffd8ff')) return 'image/jpeg';
  if (header.startsWith('47494638')) return 'image/gif';  // GIF87a or GIF89a
  if (header.startsWith('52494646') && header.includes('57454250')) return 'image/webp';  // RIFF....WEBP
  if (header.startsWith('3c737667') || header.startsWith('efbbbf3c737667')) return 'image/svg+xml';  // <svg or BOM<svg

  return 'image/jpeg';
}

/**
 * Compress an image buffer: resize to max 400px (maintaining aspect ratio)
 * and convert to WebP format.
 *
 * 400px covers desktop 2x Retina (~360px needed for a 180px card)
 * and mobile 3x Retina (~300px needed for a 100px card) with crisp results.
 * Smaller images mean faster first load when embedded in the API response.
 *
 * If sharp is not available (serverless environments), returns the original
 * buffer unchanged with an 'image/jpeg' mime type.
 *
 * Retries up to 2 more times on failure (max 3 total attempts) with a
 * short delay between attempts to handle transient issues.
 *
 * @param {Buffer} inputBuffer - Raw image data (JPEG, PNG, GIF, WebP, etc.)
 * @returns {Promise<{ buffer: Buffer, mime: string }>} Compressed WebP buffer (or original)
 */
export async function compressImage(inputBuffer) {
  const sharp = await getSharp();
  if (!sharp) {
    // Sharp not available — return original buffer as-is, but detect
    // the actual mime from magic bytes so client-compressed WebP images
    // retain their correct content type.
    return { buffer: inputBuffer, mime: detectMimeFromBuffer(inputBuffer) };
  }

  const MAX_ATTEMPTS = 3;
  let lastError = null;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const outputBuffer = await sharp(inputBuffer)
        .resize({
          width: MAX_DIMENSION,
          height: MAX_DIMENSION,
          fit: 'inside',             // maintain aspect ratio, no cropping
          withoutEnlargement: true,  // don't upscale small images
        })
        .webp({ quality: WEBP_QUALITY })
        .toBuffer();

      // Success — return the compressed result
      return { buffer: outputBuffer, mime: 'image/webp' };
    } catch (err) {
      lastError = err;
      if (attempt < MAX_ATTEMPTS) {
        console.warn(`⚠️  Compression attempt ${attempt}/${MAX_ATTEMPTS} failed, retrying... (${err.message})`);
        // Wait a short moment before retrying (50ms, 100ms, ...)
        await new Promise((resolve) => setTimeout(resolve, attempt * 50));
      }
    }
  }

  // All attempts failed — log and return original buffer as fallback
  console.error(`❌ Compression failed after ${MAX_ATTEMPTS} attempts: ${lastError.message}`);
  return { buffer: inputBuffer, mime: detectMimeFromBuffer(inputBuffer) };
}
