/**
 * DB cleanup script:
 * 1. Re-sequences product IDs to 1-56 (matching sort_order)
 * 2. Cleans product_name (removes parenthetical text)
 * 3. Re-generates product_name_mr with improved transliterator
 * 4. Resets sort_order to match new IDs
 *
 * Run: node scripts/cleanup-db.js
 */

import { getDb } from '../server/db.js';
import { toMarathiAsync } from '../src/utils/transliterate.js';
import { cleanProductName } from '../src/utils/productName.js';

async function cleanup() {
  const db = getDb();

  // 1. Read all products sorted by sort_order (current ordering)
  const result = await db.execute('SELECT * FROM products ORDER BY sort_order');
  const products = result.rows;

  console.log(`📦 Found ${products.length} products`);
  console.log(`   Current IDs: ${products[0].id} → ${products[products.length-1].id}`);
  console.log('');

  // 2. Prepare new data with sequential IDs
  const newProducts = [];
  for (let i = 0; i < products.length; i++) {
    const p = products[i];
    const newId = i + 1;
    const cleanedName = cleanProductName(p.product_name);

    // Generate clean Marathi name
    let productNameMr;
    try {
      productNameMr = await toMarathiAsync(cleanedName, 'mr') || '';
    } catch {
      productNameMr = '';
    }

    newProducts.push({
      id: newId,
      product_name: cleanedName,
      product_name_mr: productNameMr,
      price: p.price,
      image_path: p.image_path,
      image_data: p.image_data,
      image_type: p.image_type,
      category: p.category,
      availability: p.availability,
      sort_order: newId,
      created_at: p.created_at,
      updated_at: p.updated_at,
    });
  }

  // 3. Show the mapping
  console.log('=== ID Re-sequence plan ===');
  for (let i = 0; i < products.length; i++) {
    const p = products[i];
    const np = newProducts[i];
    const changed = (p.product_name !== np.product_name) || (p.product_name_mr !== np.product_name_mr);
    if (changed || i < 5 || i > products.length - 5) {
      console.log(`  ID ${String(p.id).padStart(3)} → ${String(np.id).padStart(3)} | ${np.product_name.substring(0, 45).padEnd(45)} → ${np.product_name_mr}`);
    } else if (i === 5) {
      console.log('  ...');
    }
  }

  // 4. Delete all existing products
  console.log('\n🗑️  Deleting existing products...');
  await db.execute('DELETE FROM products');
  // Reset autoincrement counter so new products start from 57
  await db.execute("DELETE FROM sqlite_sequence WHERE name = 'products'");
  console.log('   ✅ Deleted, autoincrement reset');

  // 5. Insert with new sequential IDs (wrapped in a transaction for safety)
  console.log('📝 Inserting products with new IDs...');
  let count = 0;

  // Start transaction
  await db.execute('BEGIN TRANSACTION');
  try {
    for (const np of newProducts) {
      await db.execute({
        sql: `INSERT INTO products (id, product_name, product_name_mr, price, image_path, image_data, image_type, category, availability, sort_order, created_at, updated_at)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          np.id, np.product_name, np.product_name_mr, np.price,
          np.image_path, np.image_data, np.image_type,
          np.category, np.availability, np.sort_order,
          np.created_at, np.updated_at,
        ],
      });
      count++;
    }
    await db.execute('COMMIT');
    console.log(`   ✅ Transaction committed — ${count}/${products.length} products inserted`);
  } catch (err) {
    await db.execute('ROLLBACK');
    console.error(`  ❌ Transaction failed, rolled back: ${err.message}`);
    process.exit(1);
  }

  // 6. Verify
  const verify = await db.execute('SELECT id, product_name, product_name_mr, sort_order FROM products ORDER BY id');
  console.log('\n=== Final verification ===');
  console.log(`   Products: ${verify.rows.length}`);
  console.log(`   ID range: ${verify.rows[0]?.id} → ${verify.rows[verify.rows.length - 1]?.id}`);

  let gaps = false;
  for (let i = 0; i < verify.rows.length; i++) {
    const expectedId = i + 1;
    if (verify.rows[i].id !== expectedId) {
      console.log(`   ❌ Gap at index ${i}: expected id ${expectedId}, got ${verify.rows[i].id}`);
      gaps = true;
    }
  }
  if (!gaps) console.log('   ✅ IDs are sequential with no gaps');

  // Check sort_order matches id
  let orderOk = true;
  for (const r of verify.rows) {
    if (r.id !== r.sort_order) {
      console.log(`   ❌ Sort order mismatch: id ${r.id}, sort_order ${r.sort_order}`);
      orderOk = false;
    }
  }
  if (orderOk) console.log('   ✅ sort_order matches id for all products');

  console.log('\n✅ Cleanup complete!');
  process.exit(gaps ? 1 : 0);
}

cleanup().catch((err) => {
  console.error('❌ Cleanup failed:', err);
  process.exit(1);
});
