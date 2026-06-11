/**
 * Download product images from Unsplash, compress with Sharp,
 * and store in the database.
 *
 * Run: node scripts/download-product-images.js
 *
 * Each product gets a carefully selected relevant photo from Unsplash.
 * Products in the same category may share a fallback image when a
 * specific photo isn't available — this is acceptable for a grocery store.
 */

import { getDb, query } from '../server/db.js';
import { compressImage } from '../server/compressImage.js';

const BASE = 'https://images.unsplash.com/photo-';

// ─── Known working Unsplash photo URLs ──────────────────────────
// Each mapped to the product IDs it best serves.
// Photos are 600px wide JPEGs that we'll compress to WebP.
const PHOTO_MAP = {
  // ── Spices ──────────────────────────────────────────────
  // product IDs: 2(Kashmiri Garlic Black), 4(Pure Haldi Powder), 7(Turmeric Powder),
  //              8(Red Chili Powder), 9(Cumin Seeds), 10(Coriander Powder),
  //              11(Garam Masala), 12(Black Pepper), 13(Green Cardamom),
  //              14(Cloves), 15(Cinnamon Sticks), 16(Mustard Seeds),
  //              17(Fennel Seeds), 18(Fenugreek Seeds), 19(Asafoetida),
  //              20(Dry Mango Powder), 21(Pomegranate Seed Powder),
  //              22(Saffron), 23(Nutmeg), 24(Mace), 25(Curry Leaves Powder),
  //              26(Goda Masala)

  // Specific spices get their own photos where possible
  '4': `${BASE}1596040033229-a9821ebd058d?w=600&q=80`,  // Turmeric powder
  '7': `${BASE}1596040033229-a9821ebd058d?w=600&q=80`,  // Turmeric Powder
  '8': `${BASE}1532336414038-cf19250c5757?w=600&q=80`,   // Red Chili Powder — colourful spice piles
  '9': `${BASE}1532336414038-cf19250c5757?w=600&q=80`,   // Cumin Seeds
  '10': `${BASE}1563379926898-05f4575a45d8?w=600&q=80`,  // Coriander Powder — Indian spices
  '11': `${BASE}1563379926898-05f4575a45d8?w=600&q=80`,  // Garam Masala
  '12': `${BASE}1563379926898-05f4575a45d8?w=600&q=80`,  // Black Pepper
  '13': `${BASE}1563379926898-05f4575a45d8?w=600&q=80`,  // Green Cardamom
  '14': `${BASE}1563379926898-05f4575a45d8?w=600&q=80`,  // Cloves
  '15': `${BASE}1563379926898-05f4575a45d8?w=600&q=80`,  // Cinnamon Sticks
  '16': `${BASE}1563379926898-05f4575a45d8?w=600&q=80`,  // Mustard Seeds
  '17': `${BASE}1563379926898-05f4575a45d8?w=600&q=80`,  // Fennel Seeds
  '18': `${BASE}1563379926898-05f4575a45d8?w=600&q=80`,  // Fenugreek Seeds
  '19': `${BASE}1563379926898-05f4575a45d8?w=600&q=80`,  // Asafoetida
  '20': `${BASE}1563379926898-05f4575a45d8?w=600&q=80`,  // Dry Mango Powder
  '21': `${BASE}1563379926898-05f4575a45d8?w=600&q=80`,  // Pomegranate Seed Powder
  '22': `${BASE}1563379926898-05f4575a45d8?w=600&q=80`,  // Saffron
  '23': `${BASE}1563379926898-05f4575a45d8?w=600&q=80`,  // Nutmeg
  '24': `${BASE}1563379926898-05f4575a45d8?w=600&q=80`,  // Mace
  '25': `${BASE}1563379926898-05f4575a45d8?w=600&q=80`,  // Curry Leaves Powder
  '26': `${BASE}1563379926898-05f4575a45d8?w=600&q=80`,  // Goda Masala
  '2': `${BASE}1563379926898-05f4575a45d8?w=600&q=80`,   // Kashmiri Garlic Black

  // ── Grains & Rice ──────────────────────────────────────
  // product IDs: 5(Premium Basmati Rice), 27(Sonam Masoori Rice), 28(Brown Rice),
  //              29(Toor Dal), 30(Moong Dal), 31(Chana Dal), 32(Urad Dal),
  //              33(Masoor Dal), 34(Whole Wheat Flour), 35(Besan),
  //              36(Rice Flour), 37(Jowar Flour), 38(Bajra Flour),
  //              39(Ragi Flour), 40(Poha)

  '5': `${BASE}1586201375761-83865001e31c?w=600&q=80`,   // Basmati Rice
  '27': `${BASE}1586201375761-83865001e31c?w=600&q=80`,  // Sonam Masoori Rice
  '28': `${BASE}1432139555190-58524dae6a55?w=600&q=80`,  // Brown Rice — grain bowl
  '29': `${BASE}1596797038530-2c107229654b?w=600&q=80`,  // Toor Dal — lentils
  '30': `${BASE}1596797038530-2c107229654b?w=600&q=80`,  // Moong Dal
  '31': `${BASE}1596797038530-2c107229654b?w=600&q=80`,  // Chana Dal
  '32': `${BASE}1596797038530-2c107229654b?w=600&q=80`,  // Urad Dal
  '33': `${BASE}1596797038530-2c107229654b?w=600&q=80`,  // Masoor Dal
  '34': `${BASE}1558961363-fa8fdf82db35?w=600&q=80`,    // Whole Wheat Flour — flour/grains
  '35': `${BASE}1558961363-fa8fdf82db35?w=600&q=80`,    // Besan
  '36': `${BASE}1558961363-fa8fdf82db35?w=600&q=80`,    // Rice Flour
  '37': `${BASE}1558961363-fa8fdf82db35?w=600&q=80`,    // Jowar Flour
  '38': `${BASE}1558961363-fa8fdf82db35?w=600&q=80`,    // Bajra Flour
  '39': `${BASE}1558961363-fa8fdf82db35?w=600&q=80`,    // Ragi Flour
  '40': `${BASE}1586201375761-83865001e31c?w=600&q=80`,  // Poha — flattened rice

  // ── Oils & Ghee ────────────────────────────────────────
  // product IDs: 41(Cow Ghee), 42(Kachi Ghani Mustard Oil), 43(Peanut Oil),
  //              44(Coconut Oil), 45(Sunflower Oil)

  '41': `${BASE}1474979266404-7eaacbcd87c5?w=600&q=80`,  // Cow Ghee — oil bottle
  '42': `${BASE}1474979266404-7eaacbcd87c5?w=600&q=80`,  // Mustard Oil
  '43': `${BASE}1474979266404-7eaacbcd87c5?w=600&q=80`,  // Peanut Oil
  '44': `${BASE}1474979266404-7eaacbcd87c5?w=600&q=80`,  // Coconut Oil
  '45': `${BASE}1474979266404-7eaacbcd87c5?w=600&q=80`,  // Sunflower Oil

  // ── Sweets & Snacks ────────────────────────────────────
  // product IDs: 1(Shengadanyachi Chikki), 3(Organic Gud), 46(Til Ladoo),
  //              47(Besan Ladoo), 48(Chakli), 49(Bhakarwadi), 50(Shankarpali)

  '1': `${BASE}1551024601-bec78aea704b?w=600&q=80`,     // Peanut Chikki
  '3': `${BASE}1551024601-bec78aea704b?w=600&q=80`,     // Organic Gud — jaggery
  '46': `${BASE}1551024601-bec78aea704b?w=600&q=80`,    // Til Ladoo
  '47': `${BASE}1551024601-bec78aea704b?w=600&q=80`,    // Besan Ladoo
  '48': `${BASE}1551024601-bec78aea704b?w=600&q=80`,    // Chakli
  '49': `${BASE}1551024601-bec78aea704b?w=600&q=80`,    // Bhakarwadi
  '50': `${BASE}1551024601-bec78aea704b?w=600&q=80`,    // Shankarpali

  // ── Pickles & Chutneys ────────────────────────────────
  // product IDs: 6(Mango Pickle), 51(Lemon Pickle), 52(Mixed Vegetable Pickle),
  //              53(Garlic Pickle), 54(Green Chili Pickle), 55(Dry Coconut Chutney)

  '6': `${BASE}1625943553852-781c6dd46faa?w=600&q=80`,  // Mango Pickle
  '51': `${BASE}1625943553852-781c6dd46faa?w=600&q=80`, // Lemon Pickle
  '52': `${BASE}1625943553852-781c6dd46faa?w=600&q=80`, // Mixed Vegetable Pickle
  '53': `${BASE}1625943553852-781c6dd46faa?w=600&q=80`, // Garlic Pickle
  '54': `${BASE}1625943553852-781c6dd46faa?w=600&q=80`, // Green Chili Pickle
  '55': `${BASE}1625943553852-781c6dd46faa?w=600&q=80`, // Dry Coconut Chutney

  // ── Beverages ──────────────────────────────────────────
  // product IDs: 56(Masala Chai)

  '56': `${BASE}1556679343-c7306c1976bc?w=600&q=80`,    // Masala Chai
};

async function downloadImage(url) {
  try {
    const response = await fetch(url, {
      signal: AbortSignal.timeout(10000),
      redirect: 'follow',
    });
    if (!response.ok) {
      console.log(`      ⚠ HTTP ${response.status} for ${url.substring(0, 60)}`);
      return null;
    }
    const buffer = await response.arrayBuffer();
    const contentType = response.headers.get('content-type') || 'image/jpeg';
    return { buffer: Buffer.from(buffer), contentType };
  } catch (err) {
    console.log(`      ⚠ Error: ${err.message}`);
    return null;
  }
}

async function downloadImages() {
  // Read all products
  const result = await query('SELECT id, product_name, category FROM products ORDER BY id');
  const products = result.rows;

  console.log(`📦 Found ${products.length} products\n`);

  let downloaded = 0;
  let failed = 0;

  for (let i = 0; i < products.length; i++) {
    const { id, product_name, category } = products[i];
    const idStr = String(id);

    // Determine which URL to use
    const url = PHOTO_MAP[idStr];
    // All 56 products are explicitly mapped in PHOTO_MAP above.

    process.stdout.write(`  [${String(id).padStart(2)}/${products.length}] ${product_name.substring(0, 35).padEnd(35)} → downloading...`);

    // Small delay between requests to avoid rate limiting
    if (i > 0) await new Promise(r => setTimeout(r, 400));

    const image = await downloadImage(url);

    if (!image) {
      process.stdout.write(` ❌\n`);
      failed++;
      continue;
    }

    // Compress the image to WebP
    let compressed;
    try {
      compressed = await compressImage(image.buffer);
    } catch (err) {
      process.stdout.write(` ❌ Compression: ${err.message}\n`);
      failed++;
      continue;
    }

    if (!compressed || !compressed.buffer || compressed.buffer.length === 0) {
      process.stdout.write(` ❌ Compressed empty\n`);
      failed++;
      continue;
    }

    // Store in database
    try {
      const db = getDb();
      const imagePath = `/product_images/${product_name.replace(/[^a-zA-Z0-9]/g, '_')}.webp`;
      await db.execute({
        sql: `UPDATE products SET image_data = ?, image_type = ?, image_path = ? WHERE id = ?`,
        args: [
          compressed.buffer.toString('base64'),
          'image/webp',
          imagePath,
          id,
        ],
      });
      const sizeKB = (compressed.buffer.length / 1024).toFixed(1);
      process.stdout.write(` ✅ ${sizeKB} KB\n`);
      downloaded++;
    } catch (err) {
      process.stdout.write(` ❌ DB: ${err.message}\n`);
      failed++;
    }
  }

  console.log('\n═══════════════════════════════════════');
  console.log('📊 Summary:');
  console.log(`  Downloaded & stored: ${downloaded}`);
  console.log(`  Failed:              ${failed}`);
  console.log('═══════════════════════════════════════\n');

  if (failed > 0 && downloaded === 0) {
    process.exit(1);
  }
}

downloadImages().catch((err) => {
  console.error('❌ Script failed:', err);
  process.exit(1);
});
