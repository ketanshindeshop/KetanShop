const MAX_DIMENSION = 600;
const WEBP_QUALITY = 85;

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
 * Compress an image buffer: resize to max 600px (maintaining aspect ratio)
 * and convert to WebP format.
 *
 * 600px covers both desktop 2x Retina (~560px needed for a 280px card)
 * and mobile 3x Retina (~540px needed for a 180px card) with crisp results.
 *
 * If sharp is not available (serverless environments), returns the original
 * buffer unchanged with an 'image/jpeg' mime type.
 *
 * @param {Buffer} inputBuffer - Raw image data (JPEG, PNG, GIF, WebP, etc.)
 * @returns {Promise<{ buffer: Buffer, mime: string }>} Compressed WebP buffer (or original)
 */
export async function compressImage(inputBuffer) {
  const sharp = await getSharp();
  if (!sharp) {
    // Sharp not available — return original buffer as-is
    return { buffer: inputBuffer, mime: 'image/jpeg' };
  }

  const outputBuffer = await sharp(inputBuffer)
    .resize({
      width: MAX_DIMENSION,
      height: MAX_DIMENSION,
      fit: 'inside',             // maintain aspect ratio, no cropping
      withoutEnlargement: true,  // don't upscale small images
    })
    .webp({ quality: WEBP_QUALITY })
    .toBuffer();

  return { buffer: outputBuffer, mime: 'image/webp' };
}
