import { createClient } from '@libsql/client';
import { existsSync, readFileSync } from 'fs';
import path from 'path';
import 'dotenv/config';

let db = null;

export function getDb() {
  if (db) return db;

  const url = process.env.TURSO_DB_URL;
  const token = process.env.TURSO_DB_TOKEN;

  if (!url) {
    console.error('❌ TURSO_DB_URL is required');
    process.exit(1);
  }

  db = createClient({
    url,
    authToken: token || '',
  });

  return db;
}

export async function query(sql, params = []) {
  const client = getDb();
  try {
    const result = await client.execute({ sql, args: params });
    return { success: true, rows: result.rows, columns: result.columns };
  } catch (error) {
    console.error('❌ Query failed:', error.message);
    return { success: false, error: error.message };
  }
}

/** Supported image extensions and their MIME types */
export const MIME_MAP = {
  '.jpeg': 'image/jpeg',
  '.jpg': 'image/jpeg',
  '.png': 'image/png',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
};

/** Accepted image extensions (for validation) */
export const ALLOWED_IMAGE_EXTS = new Set(Object.keys(MIME_MAP));

/**
 * Read an image file from disk (relative to public/) and convert to base64.
 * Returns { base64, mime } or null if the file doesn't exist.
 */
export function imageToBase64(imagePath) {
  const absolute = path.resolve('public', imagePath.replace(/^\//, ''));
  if (!existsSync(absolute)) return null;
  const buffer = readFileSync(absolute);
  const ext = path.extname(imagePath).toLowerCase();
  return { base64: buffer.toString('base64'), mime: MIME_MAP[ext] || 'image/jpeg' };
}

/** List of ALTER TABLE migrations to run on existing databases */
export const DB_MIGRATIONS = [
  `ALTER TABLE products ADD COLUMN image_data TEXT DEFAULT NULL`,
  `ALTER TABLE products ADD COLUMN image_type TEXT DEFAULT NULL`,
];
