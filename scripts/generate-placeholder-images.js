/**
 * Generates category-themed placeholder images for all products
 * that lack images, and stores them directly in the database.
 *
 * Run: node scripts/generate-placeholder-images.js
 */
import sharp from 'sharp';
import { getDb, query } from '../server/db.js';

// Category color palette — warm, grocery-store feel
const CATEGORY_COLORS = {
  'Spices':              { bg: '#e85d04', text: '#ffffff', icon: '🌶️' },
  'Grains & Rice':       { bg: '#b07d4b', text: '#ffffff', icon: '🌾' },
  'Sweets & Snacks':     { bg: '#d4a373', text: '#ffffff', icon: '🍬' },
  'Pickles & Chutneys':  { bg: '#2d6a4f', text: '#ffffff', icon: '🥒' },
  'Oils & Ghee':         { bg: '#e9c46a', text: '#1a1a2e', icon: '🫒' },
  'Beverages':           { bg: '#6f4e37', text: '#ffffff', icon: '☕' },
  'Groceries':           { bg: '#457b9d', text: '#ffffff', icon: '🛒' },
};

/** Fallback if category not in the map */
const FALLBACK = { bg: '#457b9d', text: '#ffffff', icon: '🛒' };

/**
 * Build an SVG that looks like a friendly product placeholder card.
 * We render a category-colored background with the product name centered.
 */
function buildSvg(productName, category) {
  const colors = CATEGORY_COLORS[category] || FALLBACK;
  const lines = splitIntoLines(productName, 20); // ~20 chars per line
  const lineHeight = 42;
  const totalTextHeight = lines.length * lineHeight;
  const startY = (600 - totalTextHeight) / 2 + 30;

  return `
<svg xmlns="http://www.w3.org/2000/svg" width="600" height="600" viewBox="0 0 600 600">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${colors.bg}" />
      <stop offset="100%" stop-color="${darken(colors.bg, 20)}" />
    </linearGradient>
  </defs>

  <!-- Background -->
  <rect width="600" height="600" fill="url(#bg)" rx="0" />

  <!-- Subtle pattern overlay -->
  <g opacity="0.06">
    ${Array.from({ length: 12 }, (_, i) =>
      `<circle cx="${50 + i * 50}" cy="${50 + (i % 2) * 50}" r="15" fill="white" />`
    ).join('\n    ')}
  </g>

  <!-- Product name text -->
  <text x="300" y="${startY}" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif"
        font-size="28" font-weight="700" fill="${colors.text}" opacity="0.95">
    ${lines.map((line, li) =>
      `<tspan x="300" dy="${li === 0 ? 0 : lineHeight}">${escapeXml(line)}</tspan>`
    ).join('\n      ')}
  </text>

  <!-- Bottom accent bar -->
  <rect x="0" y="560" width="600" height="40" fill="rgba(0,0,0,0.15)" />
  <text x="300" y="585" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif"
        font-size="16" font-weight="500" fill="${colors.text}" opacity="0.7">
    ${escapeXml(category)}
  </text>
</svg>`;
}

/** Split a long product name into lines at word boundaries */
function splitIntoLines(text, maxLen) {
  const words = text.split(' ');
  const lines = [];
  let current = '';
  for (const word of words) {
    if ((current + ' ' + word).trim().length <= maxLen) {
      current = (current + ' ' + word).trim();
    } else {
      if (current) lines.push(current);
      current = word;
    }
  }
  if (current) lines.push(current);
  return lines;
}

/** Simple XML escape */
function escapeXml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** Darken a hex color by a percentage */
function darken(hex, percent) {
  const num = parseInt(hex.replace('#', ''), 16);
  const r = Math.max(0, Math.min(255, (num >> 16) - Math.round(255 * percent / 100)));
  const g = Math.max(0, Math.min(255, ((num >> 8) & 0x00FF) - Math.round(255 * percent / 100)));
  const b = Math.max(0, Math.min(255, (num & 0x0000FF) - Math.round(255 * percent / 100)));
  return `#${(1 << 24 | r << 16 | g << 8 | b).toString(16).slice(1)}`;
}

async function main() {
  // Get all products without images
  const result = await query(
    'SELECT id, product_name, category FROM products WHERE image_data IS NULL OR image_data = \'\' ORDER BY sort_order'
  );

  if (result.rows.length === 0) {
    console.log('✅ All products already have images. Nothing to do.');
    process.exit(0);
  }

  console.log(`📸 Generating placeholders for ${result.rows.length} products...\n`);

  const db = getDb();
  let updated = 0;

  for (const product of result.rows) {
    const name = product.product_name;
    const category = product.category || 'Groceries';
    const svg = buildSvg(name, category);

    try {
      // Render SVG to WebP via Sharp
      const webpBuffer = await sharp(Buffer.from(svg))
        .webp({ quality: 80 })
        .toBuffer();

      // Store in DB
      await db.execute({
        sql: 'UPDATE products SET image_data = ?, image_type = ?, updated_at = datetime(\'now\') WHERE id = ?',
        args: [webpBuffer.toString('base64'), 'image/webp', product.id],
      });

      console.log(`  ✅ [#${product.id}] ${name} → ${category} (${(webpBuffer.length / 1024).toFixed(1)} KB)`);
      updated++;
    } catch (err) {
      console.error(`  ❌ [#${product.id}] ${name}: ${err.message}`);
    }
  }

  console.log(`\n✨ Done! ${updated}/${result.rows.length} placeholder images generated and stored.`);
  process.exit(0);
}

main().catch((err) => {
  console.error('Fatal:', err);
  process.exit(1);
});
