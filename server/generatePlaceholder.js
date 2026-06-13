/**
 * Generate an SVG placeholder image with the product name displayed prominently.
 * No external dependencies — pure string templating.
 *
 * The placeholder has a gradient background (#667eea → #764ba2) with white text,
 * sized at 400×400px to match the compression target.
 *
 * @param {string} productName - The product name to display
 * @returns {{ base64: string, mime: string }} Base64-encoded SVG + MIME type
 */
export function generatePlaceholder(productName) {
  // Sanitize the name for use in SVG — remove characters that could break XML
  const displayName = sanitizeSvgText(productName || 'Product');

  // Choose a color pair based on a simple hash of the name for variety
  const colors = getColorPair(productName);

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400" viewBox="0 0 400 400">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:${colors[0]}"/>
      <stop offset="100%" style="stop-color:${colors[1]}"/>
    </linearGradient>
  </defs>
  <rect width="400" height="400" fill="url(#bg)"/>
  <text
    x="200" y="185"
    text-anchor="middle" dominant-baseline="middle"
    fill="rgba(255,255,255,0.95)"
    font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
    font-size="28"
    font-weight="700"
  >${displayName}</text>
  <text
    x="200" y="240"
    text-anchor="middle" dominant-baseline="middle"
    fill="rgba(255,255,255,0.5)"
    font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
    font-size="14"
    font-weight="400"
  >Shriram Traders</text>
</svg>`;

  const base64 = Buffer.from(svg, 'utf-8').toString('base64');
  return { base64, mime: 'image/svg+xml' };
}

/**
 * Pick a gradient color pair based on a hash of the product name.
 * Provides visual variety so different products have different-looking placeholders.
 */
function getColorPair(name) {
  const palettes = [
    ['#667eea', '#764ba2'], // purple
    ['#f093fb', '#f5576c'], // pink
    ['#4facfe', '#00f2fe'], // cyan
    ['#43e97b', '#38f9d7'], // green
    ['#fa709a', '#fee140'], // warm
    ['#a18cd1', '#fbc2eb'], // lavender
    ['#fccb90', '#d57eeb'], // peach-purple
    ['#e0c3fc', '#8ec5fc'], // light purple-blue
    ['#f5576c', '#ff6f00'], // red-orange
    ['#11998e', '#38ef7d'], // teal-green
    ['#fc5c7d', '#6a82fb'], // red-blue
    ['#3e5151', '#dec236'], // dark-gold
  ];

  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = ((hash << 5) - hash) + name.charCodeAt(i);
    hash |= 0; // Convert to 32bit integer
  }
  return palettes[Math.abs(hash) % palettes.length];
}

/**
 * Remove characters that could break XML/SVG rendering.
 */
function sanitizeSvgText(text) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}
