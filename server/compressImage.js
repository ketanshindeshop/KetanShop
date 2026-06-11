import sharp from 'sharp';

const MAX_DIMENSION = 600;
const WEBP_QUALITY = 85;

/**
 * Compress an image buffer: resize to max 600px (maintaining aspect ratio)
 * and convert to WebP format.
 *
 * 600px covers both desktop 2x Retina (~560px needed for a 280px card)
 * and mobile 3x Retina (~540px needed for a 180px card) with crisp results.
 *
 * @param {Buffer} inputBuffer - Raw image data (JPEG, PNG, GIF, WebP, etc.)
 * @returns {Promise<{ buffer: Buffer, mime: string }>} Compressed WebP buffer
 */
export async function compressImage(inputBuffer) {
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
