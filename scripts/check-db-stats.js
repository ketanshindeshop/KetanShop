// Quick script to check product count and image size estimates
import { createClient } from '@libsql/client';
import 'dotenv/config';

async function main() {
  const url = process.env.TURSO_DB_URL;
  const token = process.env.TURSO_DB_TOKEN;

  if (!url) {
    console.error('❌ TURSO_DB_URL is required (set in .env file)');
    process.exit(1);
  }

  const db = createClient({ url, authToken: token || '' });

  // Total product count
  const countResult = await db.execute('SELECT COUNT(*) as cnt FROM products');
  const total = Number(countResult.rows[0].cnt);
  console.log(`\n📊 Product count: ${total}`);

  // Products with images vs without
  const hasImage = await db.execute("SELECT COUNT(*) as cnt FROM products WHERE image_data IS NOT NULL AND image_data != ''");
  const noImage = await db.execute("SELECT COUNT(*) as cnt FROM products WHERE image_data IS NULL OR image_data = ''");
  const withImage = Number(hasImage.rows[0].cnt);
  const withoutImage = Number(noImage.rows[0].cnt);
  console.log(`   With images:  ${withImage}`);
  console.log(`   No images:    ${withoutImage}`);

  // Image size stats (base64 string length in DB)
  if (withImage > 0) {
    const sizeStats = await db.execute(`
      SELECT 
        MIN(LENGTH(image_data)) as min_size,
        MAX(LENGTH(image_data)) as max_size,
        AVG(LENGTH(image_data)) as avg_size,
        SUM(LENGTH(image_data)) as total_size
      FROM products 
      WHERE image_data IS NOT NULL AND image_data != ''
    `);
    const stats = sizeStats.rows[0];
    const avgBytes = Math.round(Number(stats.avg_size));
    const totalBytes = Number(stats.total_size);
    const minBytes = Number(stats.min_size);
    const maxBytes = Number(stats.max_size);

    console.log(`\n📦 Image size stats (base64 string length):`);
    console.log(`   Min:     ${formatBytes(minBytes)}`);
    console.log(`   Max:     ${formatBytes(maxBytes)}`);
    console.log(`   Average: ${formatBytes(avgBytes)}`);
    console.log(`   Total:   ${formatBytes(totalBytes)}`);

    // Decoded (binary) size estimate: base64 is ~4/3 of raw bytes
    const avgDecoded = Math.round(avgBytes * 0.75);
    const totalDecoded = Math.round(totalBytes * 0.75);
    console.log(`\n📦 Estimated decoded (binary) sizes:`);
    console.log(`   Average image: ${formatBytes(avgDecoded)}`);
    console.log(`   All images:    ${formatBytes(totalDecoded)}`);

    // Estimate compressed (WebP 400px) sizes
    // Typical compression ratio from JPEG/PNG to 400px WebP is ~10-20x
    console.log(`\n📦 Estimated after WebP 400px compression (via sharp):`);
    const avgCompressed = Math.round(avgDecoded / 15);
    const totalCompressed = Math.round(totalDecoded / 15);
    console.log(`   Average image: ~${formatBytes(avgCompressed)}`);
    console.log(`   All images:    ~${formatBytes(totalCompressed)}`);

    // Image type distribution
    const typeStats = await db.execute(`
      SELECT image_type, COUNT(*) as cnt 
      FROM products 
      WHERE image_data IS NOT NULL AND image_data != '' 
      GROUP BY image_type
    `);
    console.log(`\n📦 Image type distribution:`);
    for (const row of typeStats.rows) {
      console.log(`   ${row.image_type || 'unknown'}: ${row.cnt}`);
    }
  }

  // Category distribution
  const catStats = await db.execute('SELECT category, COUNT(*) as cnt FROM products GROUP BY category ORDER BY cnt DESC');
  console.log(`\n📂 Category distribution:`);
  for (const row of catStats.rows) {
    console.log(`   ${row.category}: ${row.cnt}`);
  }

  console.log();
  process.exit(0);
}

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

main().catch((err) => {
  console.error('❌ Error:', err);
  process.exit(1);
});
