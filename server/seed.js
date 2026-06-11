import { existsSync, readFileSync } from 'fs';
import XLSX from 'xlsx';
import { getDb, imageToBase64, DB_MIGRATIONS } from './db.js';
import { compressImage } from './compressImage.js';
import { toMarathi } from '../src/utils/transliterate.js';
import 'dotenv/config';

async function seed() {
  const db = getDb();

  console.log('📖 Reading schema.sql...');
  const schema = readFileSync('./schema.sql', 'utf-8');
  const statements = schema
    .split(';')
    .map((s) => s.trim())
    .filter((s) => s.length);

  console.log('📦 Applying schema...');
  for (const stmt of statements) {
    try {
      await db.execute(stmt);
    } catch (err) {
      console.error(`  Schema error: ${err.message}`);
    }
  }

  // Run ALTER TABLE migrations for existing databases (these fail silently if column already exists)
  console.log('🔄 Running DB migrations...');
  for (const migration of DB_MIGRATIONS) {
    try {
      await db.execute(migration);
    } catch (err) {
      // Ignore - column may already exist
    }
  }
  console.log('✅ Schema & migrations applied');

  console.log('📖 Reading KetanShop.xlsx...');
  const workbook = XLSX.readFile('KetanShop.xlsx');
  const sheet = workbook.Sheets['Sheet1'];
  const rows = XLSX.utils.sheet_to_json(sheet);

  console.log(`📦 Seeding ${rows.length} products...`);

  // Clear existing data
  await db.execute('DELETE FROM products');

  let count = 0;
  for (const row of rows) {
    const productName = row.Product_Name || '';
    const price = Number(row.Price) || 0;
    // Auto-generate image path from product name if Excel has 'TBC' or empty
    let imagePath = row.Image_Path || '';
    const tbcValues = ['tbc', 'tbd', 'n/a', 'na', ''];
    if (!imagePath || tbcValues.includes(imagePath.trim().toLowerCase())) {
      // Convert product name to a filename-friendly slug
      const slug = productName
        .replace(/[^a-zA-Z0-9 ]/g, '')
        .trim()
        .replace(/\s+/g, '_');
      // Try common image extensions — check filesystem first
      const extensions = ['.jpeg', '.jpg', '.png'];
      const basePath = `/product_images/${slug}`;
      let found = false;
      for (const ext of extensions) {
        if (existsSync(`public${basePath}${ext}`)) {
          imagePath = `${basePath}${ext}`;
          found = true;
          break;
        }
      }
      if (!found) {
        imagePath = `${basePath}.jpeg`; // default fallback
      }
    } else if (!imagePath.startsWith('/')) {
      // Make sure path starts with / for proper URL resolution
      imagePath = `/product_images/${imagePath}`;
    }

    // Read image from disk, convert to base64, and compress to WebP 400px
    let imageData = null;
    let imageType = null;
    const imgResult = imageToBase64(imagePath);
    if (imgResult) {
      const imgBuffer = Buffer.from(imgResult.base64, 'base64');
      const compressed = await compressImage(imgBuffer);
      imageData = compressed.buffer.toString('base64');
      imageType = compressed.mime;
    }

    const sortOrder = Number(row.Sort_Order) || 0;
    const availability = String(row.availability || 'yes').toLowerCase();

    // Determine category: read from Excel if provided, otherwise guess from product name
    let category = 'Groceries';
    if (row.Category && typeof row.Category === 'string' && row.Category.trim()) {
      category = row.Category.trim();
    } else {
      const name = productName.toLowerCase();
      if (name.includes('chikki') || name.includes('ladoo') || name.includes('sweet')) {
        category = 'Sweets & Snacks';
      } else if (name.includes('spice') || name.includes('masala') || name.includes('powder')) {
        category = 'Spices';
      } else if (name.includes('rice') || name.includes('dal') || name.includes('flour') || name.includes('grain')) {
        category = 'Grains & Rice';
      } else if (name.includes('pickle') || name.includes('chutney') || name.includes('kachumber')) {
        category = 'Pickles & Chutneys';
      } else if (name.includes('tea') || name.includes('coffee') || name.includes('drink')) {
        category = 'Beverages';
      }
    }

    try {
      const productNameMr = toMarathi(productName, 'mr') || '';
      await db.execute({
        sql: `INSERT OR REPLACE INTO products 
          (product_name, product_name_mr, price, image_path, image_data, image_type, category, availability, sort_order)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [productName, productNameMr, price, imagePath, imageData, imageType, category, availability, sortOrder],
      });
      count++;
    } catch (err) {
      console.error(`  ❌ Failed to insert "${productName}": ${err.message}`);
    }
  }

  console.log(`✅ Seeded ${count}/${rows.length} products successfully!`);
  process.exit(0);
}

seed().catch((err) => {
  console.error('❌ Seed failed:', err);
  process.exit(1);
});
