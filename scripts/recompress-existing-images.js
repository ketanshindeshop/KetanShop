/**
 * Recompress all existing product images to 400px WebP (quality 70).
 * Run: node scripts/recompress-existing-images.js
 */
import { compressImage } from '../server/compressImage.js';
import { query, getDb } from '../server/db.js';

async function main() {
  const result = await query(
    "SELECT id, product_name, image_data, image_type FROM products WHERE image_data IS NOT NULL AND image_data != ''"
  );

  if (!result.success || result.rows.length === 0) {
    console.log('No images to recompress.');
    process.exit(0);
  }

  console.log(`Recompressing ${result.rows.length} images...\n`);
  const db = getDb();
  let done = 0;

  for (const row of result.rows) {
    const oldSizeKb = (row.image_data.length * 0.75 / 1024).toFixed(1);
    const imgBuffer = Buffer.from(row.image_data, 'base64');

    try {
      const compressed = await compressImage(imgBuffer);
      const newSizeKb = (compressed.buffer.length / 1024).toFixed(1);

      await db.execute({
        sql: "UPDATE products SET image_data = ?, image_type = ?, updated_at = datetime('now') WHERE id = ?",
        args: [compressed.buffer.toString('base64'), compressed.mime, row.id],
      });

      console.log(`  ✅ #${row.id} ${row.product_name}: ${oldSizeKb}KB → ${newSizeKb}KB (${compressed.mime})`);
      done++;
    } catch (err) {
      console.error(`  ❌ #${row.id} ${row.product_name}: ${err.message}`);
    }
  }

  console.log(`\n✨ Done! ${done}/${result.rows.length} images recompressed.`);
  process.exit(0);
}

main().catch((err) => { console.error(err); process.exit(1); });
