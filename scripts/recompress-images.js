/**
 * Re-compress all existing product images in the database using the current
 * sharp pipeline (600px max, WebP quality 85).
 *
 * Run: node scripts/recompress-images.js
 */
import { getDb } from '../server/db.js';
import { compressImage } from '../server/compressImage.js';
import 'dotenv/config';

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

async function main() {
  const db = getDb();

  // Fetch all products that have image data
  const result = await db.execute(
    "SELECT id, product_name, image_data, image_type FROM products WHERE image_data IS NOT NULL AND image_data != ''"
  );
  const rows = result.rows;

  if (rows.length === 0) {
    console.log('📭 No product images found in the database.');
    process.exit(0);
  }

  console.log(`📦 Found ${rows.length} products with images.`);

  let totalOldBytes = 0;
  let totalNewBytes = 0;
  let compressed = 0;
  let errors = 0;

  for (const row of rows) {
    const id = row.id;
    const name = row.product_name || `ID ${id}`;
    const oldBase64 = row.image_data;
    const oldBytes = oldBase64.length;

    try {
      const inputBuffer = Buffer.from(oldBase64, 'base64');
      const { buffer: compressedBuffer } = await compressImage(inputBuffer);
      const newBase64 = compressedBuffer.toString('base64');
      const newBytes = newBase64.length;

      await db.execute({
        sql: "UPDATE products SET image_data = ?, image_type = 'image/webp', updated_at = datetime('now') WHERE id = ?",
        args: [newBase64, id],
      });

      const saved = oldBytes - newBytes;
      const pct = ((saved / oldBytes) * 100).toFixed(1);

      totalOldBytes += oldBytes;
      totalNewBytes += newBytes;
      compressed++;

      console.log(
        `  ✅ ${String(name).padEnd(30)} ${formatBytes(oldBytes)} → ${formatBytes(newBytes)} (${pct}% saved)`
      );
    } catch (err) {
      errors++;
      console.error(`  ❌ ${name}: ${err.message}`);
    }
  }

  const totalSaved = totalOldBytes - totalNewBytes;
  const totalPct = ((totalSaved / totalOldBytes) * 100).toFixed(1);

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`📊 Summary:`);
  console.log(`   Products processed: ${compressed}`);
  console.log(`   Errors:             ${errors}`);
  console.log(`   Total before:       ${formatBytes(totalOldBytes)}`);
  console.log(`   Total after:        ${formatBytes(totalNewBytes)}`);
  console.log(`   Total saved:        ${formatBytes(totalSaved)} (${totalPct}%)`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  process.exit(0);
}

main().catch((err) => {
  console.error('❌ Script failed:', err);
  process.exit(1);
});
