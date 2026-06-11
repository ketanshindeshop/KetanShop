/**
 * Merge new training data (.txt files in public/) into the existing JSONL dataset,
 * deduplicate, and rebuild the wordMap.
 *
 * Run: node scripts/merge-training-data.js
 *
 * The script:
 * 1. Reads existing marathi_transliteration_dataset.jsonl
 * 2. Reads all tab-separated .txt training files from public/
 * 3. Merges (existing entries take priority — no overwriting)
 * 4. Writes merged dataset back to marathi_transliteration_dataset.jsonl
 * 5. Runs build-word-map.js to regenerate src/utils/wordMap.js
 */

import { readFileSync, writeFileSync, readdirSync, copyFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const PUBLIC_DIR = join(ROOT, 'public');
const DATASET_PATH = join(ROOT, 'marathi_transliteration_dataset.jsonl');

// ── Step 0: Backup existing dataset ────────────────────────────
if (existsSync(DATASET_PATH)) {
  const backupPath = DATASET_PATH + '.bak';
  copyFileSync(DATASET_PATH, backupPath);
  console.log('💾 Backup saved to marathi_transliteration_dataset.jsonl.bak');
}

// ── Step 1: Read existing dataset ────────────────────────────────
console.log('📖 Reading existing dataset...');
let existingLines = [];
if (existsSync(DATASET_PATH)) {
  const raw = readFileSync(DATASET_PATH, 'utf-8');
  existingLines = raw.split('\n').filter(Boolean);
}

// Build a map of existing entries (english → marathi, first occurrence wins)
const existingMap = new Map();
for (const line of existingLines) {
  try {
    const { english, marathi } = JSON.parse(line);
    if (english && marathi) {
      const key = english.toLowerCase().trim();
      if (!existingMap.has(key)) {
        existingMap.set(key, marathi);
      }
    }
  } catch {
    // skip malformed lines
  }
}

console.log(`  Existing entries: ${existingMap.size}`);

// ── Step 2: Read new training files ──────────────────────────────
console.log('\n📂 Scanning training files in public/...');

const txtFiles = readdirSync(PUBLIC_DIR)
  .filter(f => f.endsWith('.txt'))
  .filter(f => f !== 'marathi_transliteration_training_guide.txt')
  .sort();

let newEntries = 0;
let skipped = 0;
let fileCount = 0;

for (const filename of txtFiles) {
  const filePath = join(PUBLIC_DIR, filename);
  const content = readFileSync(filePath, 'utf-8');
  const lines = content.split('\n').filter(Boolean);

  let fileNew = 0;
  let fileSkipped = 0;

  for (const line of lines) {
    // Tab-separated: English\tMarathi
    const parts = line.split('\t');
    if (parts.length < 2) continue;
    const english = parts[0].trim();
    const marathi = parts.slice(1).join('\t').trim(); // handle tabs in Marathi text
    if (!english || !marathi) continue;

    const key = english.toLowerCase().trim();
    if (!existingMap.has(key)) {
      existingMap.set(key, marathi);
      fileNew++;
    } else {
      fileSkipped++;
    }
  }

  console.log(`  ${filename.padEnd(42)} → ${String(fileNew).padStart(6)} new, ${String(fileSkipped).padStart(6)} skipped (duplicates)`);
  newEntries += fileNew;
  skipped += fileSkipped;
  fileCount++;
}

console.log(`\n📊 Merge stats:`);
console.log(`  Existing:     ${existingLines.length}`);
console.log(`  New files:    ${fileCount}`);
console.log(`  New entries:  ${newEntries}`);
console.log(`  Skipped:      ${skipped} (duplicates)`);
console.log(`  Total:        ${existingMap.size}`);

// ── Step 3: Write merged dataset ─────────────────────────────────
console.log('\n✍️  Writing merged dataset...');

const mergedLines = [];
for (const [english, marathi] of existingMap.entries()) {
  mergedLines.push(JSON.stringify({ english, marathi }));
}

writeFileSync(DATASET_PATH, mergedLines.join('\n') + '\n', 'utf-8');
const sizeKB = (Buffer.byteLength(mergedLines.join('\n')) / 1024).toFixed(1);
console.log(`  Written to ${DATASET_PATH}`);
console.log(`  File size: ${sizeKB} KB`);

// ── Step 4: Rebuild wordMap ──────────────────────────────────────
console.log('\n🔨 Rebuilding wordMap...');

try {
  execSync('node scripts/build-word-map.js', {
    cwd: ROOT,
    stdio: 'inherit',
    timeout: 30000,
  });
} catch (err) {
  console.error('❌ wordMap build failed:', err.message);
  process.exit(1);
}

console.log('\n✅ All done! Word map regenerated with', existingMap.size, 'entries.');


