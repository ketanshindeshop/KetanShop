/**
 * Migration script: re-generate product_name_mr for all products
 * using the improved data-driven transliterator.
 *
 * Run: node scripts/update-marathi-names.js
 *
 * This strips parenthetical English text before transliterating
 * to produce clean Marathi-only names.
 */

import { getDb } from '../server/db.js';
import { toMarathiAsync } from '../src/utils/transliterate.js';
import { cleanProductName } from '../src/utils/productName.js';

async function migrate() {
  const db = getDb();

  // Read all products
  const result = await db.execute('SELECT id, product_name, product_name_mr FROM products ORDER BY id');
  const products = result.rows;

  console.log(`📦 Found ${products.length} products`);
  console.log('');

  let updated = 0;
  let skipped = 0;
  let errors = 0;

  for (const product of products) {
    const { id, product_name, product_name_mr: oldMr } = product;

    // Clean the product name (strip parenthetical text)
    const cleanName = cleanProductName(product_name);

    if (!cleanName) {
      console.log(`  ⚠️  ID ${id}: Skipping — cleaned name is empty for "${product_name}"`);
      skipped++;
      continue;
    }

    // Generate new Marathi name
    let newMr;
    try {
      newMr = await toMarathiAsync(cleanName, 'mr');
    } catch (err) {
      console.log(`  ❌ ID ${id}: Error transliterating "${cleanName}": ${err.message}`);
      errors++;
      continue;
    }

    if (!newMr) {
      console.log(`  ⚠️  ID ${id}: Empty Marathi name for "${cleanName}"`);
      skipped++;
      continue;
    }

    // Update the database if the name changed
    if (newMr !== oldMr) {
      await db.execute({
        sql: 'UPDATE products SET product_name_mr = ?, updated_at = datetime(\'now\') WHERE id = ?',
        args: [newMr, id],
      });
      console.log(`  ✓ ID ${id}: "${product_name}"`);
      console.log(`    Old MR: ${oldMr}`);
      console.log(`    New MR: ${newMr}`);
      console.log('');
      updated++;
    } else {
      console.log(`  — ID ${id}: "${product_name}" — unchanged (${newMr})`);
      skipped++;
    }
  }

  console.log('═══════════════════════════════════════');
  console.log(`📊 Summary:`);
  console.log(`  Total products:  ${products.length}`);
  console.log(`  Updated:         ${updated}`);
  console.log(`  Skipped:         ${skipped}`);
  console.log(`  Errors:          ${errors}`);
  console.log('═══════════════════════════════════════');

  process.exit(errors > 0 ? 1 : 0);
}

migrate().catch((err) => {
  console.error('❌ Migration failed:', err);
  process.exit(1);
});
