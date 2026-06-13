import express from 'express';
import cors from 'cors';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import { existsSync } from 'fs';
import { query, getDb, imageToBase64, MIME_MAP, ALLOWED_IMAGE_EXTS } from './db.js';
import { compressImage } from './compressImage.js';
import { generatePlaceholder } from './generatePlaceholder.js';
import { toMarathi, getWordMap } from '../src/utils/transliterate.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB per file
});

const app = express();

// Increase JSON body size limit to handle large base64 image data
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

/* ─────── In-memory caches ─────── */

// Response cache for /api/products — short TTL to keep paginated lists fresh
const productListCache = new Map();
const PRODUCT_LIST_TTL = 10000; // 10 seconds

function getProductListCached(key) {
  const entry = productListCache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiry) {
    productListCache.delete(key);
    return null;
  }
  return entry.data;
}

function setProductListCache(key, data) {
  productListCache.set(key, { data, expiry: Date.now() + PRODUCT_LIST_TTL });
  if (productListCache.size > 100) {
    const oldest = productListCache.entries().next().value;
    if (oldest) productListCache.delete(oldest[0]);
  }
}

// Image buffer cache — decoded from base64 and cached in memory for instant serving.
// Images change rarely (only on admin edit), so we cache indefinitely until invalidation.
const imageCache = new Map();

function getCachedImage(productId) {
  const entry = imageCache.get(productId);
  if (entry) return entry;
  return null;
}

function setCachedImage(productId, data) {
  imageCache.set(productId, data);
  // Cap at 200 entries (well above our 56 products)
  if (imageCache.size > 200) {
    const oldest = imageCache.entries().next().value;
    if (oldest) imageCache.delete(oldest[0]);
  }
}

// Cache expiry for images (re-check DB every 5 minutes to pick up admin edits)
const IMAGE_CACHE_TTL = 5 * 60 * 1000;
const imageCacheTime = new Map();

function isImageCacheFresh(productId) {
  const cached = imageCacheTime.get(productId);
  return cached && (Date.now() - cached) < IMAGE_CACHE_TTL;
}

function markImageCached(productId) {
  imageCacheTime.set(productId, Date.now());
}

/* ─────── Helper: Check admin auth ─────── */
function requireAdmin(req, res, next) {
  const adminKey = req.headers['x-admin-key'];
  const expectedKey = process.env.ADMIN_SECRET;
  if (!adminKey || adminKey !== expectedKey) {
    return res.status(401).json({ success: false, error: 'Unauthorized' });
  }
  next();
}

/** Clear all in-memory caches so fresh data is served after any change */
function invalidateCache() {
  productListCache.clear();
  imageCache.clear();
  imageCacheTime.clear();
}

/* ─────── PUBLIC API ─────── */

// GET /api/products - List products with server-side pagination (images loaded separately)
app.get('/api/products', async (req, res) => {
  try {
    const {
      search = '',
      category = '',
      minPrice = '',
      maxPrice = '',
      sort = 'sort_order',
      dir = 'asc',
      page = '1',
      limit = '20',
    } = req.query;

    // Admin requests (show_all=true) skip pagination — return all products
    const isAdminRequest = req.query.show_all === 'true';
    const limitNum = isAdminRequest
      ? 9999  // effectively unlimited
      : Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const offset = (pageNum - 1) * limitNum;

    // Build a cache key from the query parameters
    const cacheKey = req.originalUrl;
    const cached = getProductListCached(cacheKey);
    // Admin requests always bypass the in-memory cache for realtime data.
    if (cached && !isAdminRequest) {
      res.setHeader('X-Cache', 'HIT');
      return res.json(cached);
    }

    const conditions = [];
    const params = [];

    if (search) {
      conditions.push('(product_name LIKE ? OR product_name_mr LIKE ?)');
      params.push(`%${search}%`, `%${search}%`);
    }
    if (category && category !== 'all') {
      conditions.push('category = ?');
      params.push(category);
    }
    if (minPrice) {
      conditions.push('price >= ?');
      params.push(Number(minPrice));
    }
    if (maxPrice) {
      conditions.push('price <= ?');
      params.push(Number(maxPrice));
    }
    // Exclude disabled products (unless admin requests all)
    if (req.query.show_all !== 'true') {
      if (req.query.show_out_of_stock === 'false') {
        conditions.push("availability = 'yes'");
      } else {
        conditions.push("availability != 'disabled'");
      }
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const allowedSorts = ['sort_order', 'product_name', 'price', 'created_at'];
    const safeSort = allowedSorts.includes(sort) ? sort : 'sort_order';
    const safeDir = dir === 'desc' ? 'DESC' : 'ASC';

    // Get total count (without images) for pagination calculation
    const countResult = await query(`SELECT COUNT(*) as cnt FROM products ${where}`, params);
    const total = Number(countResult.rows[0]?.cnt || 0);
    const totalPages = Math.ceil(total / limitNum);

    // Fetch a page of products.
    // Hybrid approach: first page includes image_data inline for instant rendering;
    // subsequent pages (infinite scroll) skip it to keep payload lean — the client
    // falls back to lazy-loading via /api/products/:id/image.
    // Admin requests (show_all=true) always skip image_data to keep the table lean.
    const baseCols = 'id, product_name, product_name_mr, price, category, availability, sort_order, created_at, updated_at, LENGTH(image_data) as image_size';
    const inlineImages = !isAdminRequest && pageNum === 1;
    const selectCols = inlineImages ? `${baseCols}, image_data, image_type` : baseCols;
    const sql = `SELECT ${selectCols} FROM products ${where} ORDER BY ${safeSort} ${safeDir} LIMIT ? OFFSET ?`;
    const result = await query(sql, [...params, limitNum, offset]);

    // For categories, show all categories when admin fetches all
    let catWhere = '';
    if (req.query.show_all !== 'true') {
      if (req.query.show_out_of_stock === 'false') {
        catWhere = "WHERE availability = 'yes'";
      } else {
        catWhere = "WHERE availability != 'disabled'";
      }
    }
    const catResult = await query(
      `SELECT DISTINCT category FROM products ${catWhere} ORDER BY category`
    );

    const response = {
      success: true,
      products: result.rows,
      categories: catResult.rows.map((r) => r.category),
      total,
      page: pageNum,
      limit: limitNum,
      totalPages,
      hasMore: pageNum < totalPages,
    };

    // Admin requests must always return fresh data — skip all caching.
    // Public requests use CDN edge cache for fast repeat visits.
    if (isAdminRequest) {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    } else {
      setProductListCache(cacheKey, response);
      // Vercel CDN caches the response and serves it instantly (stale-while-revalidate).
      // s-maxage=0 means the cache is immediately considered stale, so the CDN ALWAYS
      // revalidates in the background. The cached version is served while revalidating.
      // When admin edits → invalidateCache() clears server cache → next revalidation
      // gets fresh data → CDN updated. Users always see latest data within 1 request.
      res.setHeader('Cache-Control', 'public, s-maxage=0, stale-while-revalidate=86400');
    }
    res.json(response);
  } catch (error) {
    console.error('❌ API Error:', error);
    if (!res.headersSent) res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/products/:id - Single product (includes image_data for detail view)
app.get('/api/products/:id', async (req, res) => {
  try {
    const result = await query('SELECT * FROM products WHERE id = ?', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Product not found' });
    }
    res.json({ success: true, product: result.rows[0] });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/products/:id/image - Serve the product image (decoded from DB base64, cached in memory)
app.get('/api/products/:id/image', async (req, res) => {
  try {
    const productId = req.params.id;

    // Check in-memory cache first
    const cached = getCachedImage(productId);
    if (cached && isImageCacheFresh(productId)) {
      res.setHeader('Content-Type', cached.mime);
      res.setHeader('Cache-Control', 'public, max-age=604800');
      res.setHeader('Content-Length', cached.buffer.length);
      return res.end(cached.buffer);
    }

    const result = await query('SELECT image_data, image_type, updated_at FROM products WHERE id = ?', [productId]);
    if (result.rows.length === 0 || !result.rows[0].image_data) {
      return res.status(404).end();
    }
    const { image_data, image_type } = result.rows[0];
    const imgBuffer = Buffer.from(image_data, 'base64');

    // Cache in memory for instant serving on subsequent requests
    setCachedImage(productId, { buffer: imgBuffer, mime: image_type || 'image/jpeg', updatedAt: result.rows[0].updated_at });
    markImageCached(productId);

    res.setHeader('Content-Type', image_type || 'image/jpeg');
    // Cache images at Vercel edge for 7 days. Browser cache busted via ?v=updated_at.
    // s-maxage tells Vercel CDN to cache at edge; subsequent requests hit the nearest edge.
    res.setHeader('Cache-Control', 'public, s-maxage=604800, max-age=604800');
    res.setHeader('Content-Length', imgBuffer.length);
    res.end(imgBuffer);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/* ─────── ADMIN API ─────── */

// POST /api/admin/products - Create a product
app.post('/api/admin/products', requireAdmin, async (req, res) => {
  try {
    const { product_name, product_name_mr, price, category, image_path, image_data, image_type, availability, sort_order } = req.body;
    if (!product_name) {
      return res.status(400).json({ success: false, error: 'Product name is required' });
    }
    // Smart language detection: if the name is in Devanagari, it's already Marathi.
    // If it's in Latin script, auto-transliterate to Marathi.
    const isMarathi = /[\u0900-\u097F]/.test(product_name);
    const productNameEn = isMarathi ? (product_name_mr || product_name).trim() : product_name.trim();
    const finalProductNameMr = isMarathi
      ? product_name.trim()
      : (product_name_mr && product_name_mr.trim()) ? product_name_mr.trim() : (toMarathi(product_name, 'mr') || '');
    // Compress uploaded image if provided; otherwise generate a placeholder
    let compressedData = null;
    let compressedType = null;
    if (image_data) {
      const imgBuffer = Buffer.from(image_data, 'base64');
      const compressed = await compressImage(imgBuffer);
      compressedData = compressed.buffer.toString('base64');
      compressedType = compressed.mime;
    } else {
      // No image provided — generate an SVG placeholder with the product name
      const placeholder = generatePlaceholder(product_name);
      compressedData = placeholder.base64;
      compressedType = placeholder.mime;
    }

    const result = await getDb().execute({
      sql: `INSERT INTO products (product_name, product_name_mr, price, category, image_path, image_data, image_type, availability, sort_order)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        productNameEn, finalProductNameMr, Number(price) || 0,
        category || 'Groceries', image_path || '', compressedData, compressedType,
        availability || 'yes', Number(sort_order) || 0,
      ],
    });
    invalidateCache();
    res.json({ success: true, id: Number(result.lastInsertRowid), message: 'Product created' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// PUT /api/admin/products/:id - Update a product
app.put('/api/admin/products/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { product_name, product_name_mr, price, category, image_path, image_data, image_type, availability, sort_order } = req.body;

    // Build SET clause dynamically (only update provided fields)
    const updates = [];
    const values = [];
    if (product_name !== undefined) {
      updates.push('product_name = ?');
      values.push(product_name);
    }      // Smart language detection for product name
    if (product_name !== undefined) {
      const isMarathi = /[\u0900-\u097F]/.test(product_name);
      if (isMarathi) {
        // Name is already in Marathi — use it directly
        if (product_name_mr === undefined || product_name_mr === '') {
          updates.push('product_name_mr = ?');
          values.push(product_name.trim());
        }
      } else if (product_name_mr === undefined || product_name_mr === '') {
        // Name is in English — auto-generate Marathi
        updates.push('product_name_mr = ?');
        values.push(toMarathi(product_name, 'mr') || '');
      }
    } else if (product_name_mr !== undefined && product_name_mr !== '') {
      // Only Marathi name provided
      updates.push('product_name_mr = ?');
      values.push(product_name_mr.trim());
    }
    if (price !== undefined) { updates.push('price = ?'); values.push(Number(price)); }
    if (category !== undefined) { updates.push('category = ?'); values.push(category); }
    if (image_path !== undefined) { updates.push('image_path = ?'); values.push(image_path); }
    // If a new image is being uploaded, compress it first
    if (image_data !== undefined) {
      if (image_data) {
        const imgBuffer = Buffer.from(image_data, 'base64');
        const compressed = await compressImage(imgBuffer);
        updates.push('image_data = ?');
        values.push(compressed.buffer.toString('base64'));
        updates.push('image_type = ?');
        values.push(compressed.mime);
      } else {
        updates.push('image_data = ?');
        values.push(null);
        updates.push('image_type = ?');
        values.push(null);
      }
    }
    if (availability !== undefined) { updates.push('availability = ?'); values.push(availability); }
    if (sort_order !== undefined) { updates.push('sort_order = ?'); values.push(Number(sort_order)); }

    if (updates.length === 0) {
      return res.status(400).json({ success: false, error: 'No fields to update' });
    }

    updates.push("updated_at = datetime('now')");
    values.push(id);

    const sql = `UPDATE products SET ${updates.join(', ')} WHERE id = ?`;
    await getDb().execute({ sql, args: values });

    invalidateCache();
    res.json({ success: true, message: 'Product updated' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// DELETE /api/admin/products/:id - Delete a product
app.delete('/api/admin/products/:id', requireAdmin, async (req, res) => {
  try {
    const result = await getDb().execute({
      sql: 'DELETE FROM products WHERE id = ?',
      args: [req.params.id],
    });
    if (Number(result.rowsAffected) === 0) {
      return res.status(404).json({ success: false, error: 'Product not found' });
    }
    invalidateCache();
    res.json({ success: true, message: 'Product deleted' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/admin/products/import-excel - Import products from Excel + optional images
app.post('/api/admin/products/import-excel', requireAdmin, upload.fields([
  { name: 'file', maxCount: 1 },
  { name: 'images', maxCount: 100 },
]), async (req, res) => {
  try {
    if (!req.files || !req.files.file || req.files.file.length === 0) {
      return res.status(400).json({ success: false, error: 'No Excel file uploaded' });
    }
    // Lazy-load xlsx — only imported when this endpoint is actually hit
    const XLSX = await import('xlsx').then(m => m.default);
    const workbook = XLSX.read(req.files.file[0].buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);

    if (rows.length === 0) {
      return res.status(400).json({ success: false, error: 'Excel file is empty' });
    }

    const db = getDb();
    let imported = 0;
    let imagesImported = 0;
    let placeholdersGenerated = 0;

    // Build a map of uploaded images: lowercase slug → { base64, mime }
    const uploadedImages = new Map();
    const imageFiles = req.files.images || [];
    for (const imgFile of imageFiles) {
      const originalName = imgFile.originalname;
      const dotIdx = originalName.lastIndexOf('.');
      const ext = dotIdx > 0 ? originalName.substring(dotIdx).toLowerCase() : '';
      const basename = dotIdx > 0 ? originalName.substring(0, dotIdx) : originalName;

      // Validate file extension
      if (!ALLOWED_IMAGE_EXTS.has(ext)) {
        console.warn(`  ⚠️ Skipping "${originalName}" — unsupported extension "${ext}"`);
        continue;
      }

      // Compress the image: resize to 400px max and convert to WebP
      const compressed = await compressImage(imgFile.buffer);

      uploadedImages.set(basename.toLowerCase(), {
        base64: compressed.buffer.toString('base64'),
        mime: compressed.mime,
      });
    }

    for (const row of rows) {
      if (!row.Product_Name) continue;

      const productName = row.Product_Name || '';
      const price = Number(row.Price) || 0;

      // Determine category: read from Excel if provided, otherwise guess from product name
      let category = 'Groceries';
      if (row.Category && typeof row.Category === 'string' && row.Category.trim()) {
        category = row.Category.trim();
      } else {
        const name = productName.toLowerCase();
        if (name.includes('chikki') || name.includes('ladoo') || name.includes('sweet')) category = 'Sweets & Snacks';
        else if (name.includes('spice') || name.includes('masala') || name.includes('turmeric') || name.includes('haldi')) category = 'Spices';
        else if (name.includes('rice') || name.includes('basmati') || name.includes('dal') || name.includes('grain') || name.includes('flour')) category = 'Grains & Rice';
        else if (name.includes('pickle') || name.includes('chutney') || name.includes('mango')) category = 'Pickles & Chutneys';
        else if (name.includes('tea') || name.includes('coffee') || name.includes('drink')) category = 'Beverages';
      }

      // Auto-generate image slug from product name
      const slug = productName.replace(/[^a-zA-Z0-9 ]/g, '').trim().replace(/\s+/g, '_');
      let imagePath = `/product_images/${slug}.jpeg`;
      let imageData = null;
      let imageType = null;

      // 1. Check if an image was uploaded for this product (match by lowercase slug)
      const uploaded = uploadedImages.get(slug.toLowerCase());
      if (uploaded) {
        imageData = uploaded.base64;
        imageType = uploaded.mime;
        imagesImported++;
      } else {
        // 2. Fall back to reading from disk
        const extensions = ['.jpeg', '.jpg', '.png'];
        for (const ext of extensions) {
          if (existsSync(`public/product_images/${slug}${ext}`)) {
            imagePath = `/product_images/${slug}${ext}`;
            break;
          }
        }
        const imgResult = imageToBase64(imagePath);
        if (imgResult) {
          // Compress disk images too — resize to 400px WebP
          try {
            const imgBuffer = Buffer.from(imgResult.base64, 'base64');
            const compressed = await compressImage(imgBuffer);
            imageData = compressed.buffer.toString('base64');
            imageType = compressed.mime;
          } catch {
            imageData = imgResult.base64;
            imageType = imgResult.mime;
          }
        }
      }

      // 3. If still no image, generate an SVG placeholder with the product name
      let placeholderGenerated = false;
      if (!imageData) {
        const placeholder = generatePlaceholder(productName);
        imageData = placeholder.base64;
        imageType = placeholder.mime;
        placeholderGenerated = true;
      }

      // Smart language detection: check if product name is already in Marathi
      const isMarathi = /[\u0900-\u097F]/.test(productName);
      const productNameEn = isMarathi ? productName : productName;
      const productNameMr = isMarathi
        ? productName.trim()
        : (toMarathi(productName, 'mr') || '');

      await db.execute({
        sql: `INSERT INTO products (product_name, product_name_mr, price, category, image_path, image_data, image_type, availability, sort_order)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          productNameEn, productNameMr, price,
          category, imagePath, imageData, imageType, 'yes', Number(row.Sort_Order) || 0,
        ],
      });
      imported++;
      if (placeholderGenerated) placeholdersGenerated++;
    }

    invalidateCache();
    const msg = placeholdersGenerated > 0
      ? `Imported ${imported} products (${placeholdersGenerated} with auto-generated placeholder images)`
      : `Imported ${imported} products`;
    res.json({
      success: true,
      imported,
      images_imported: imagesImported,
      placeholders_generated: placeholdersGenerated,
      message: msg,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/admin/categories - Return list of existing categories
app.get('/api/admin/categories', requireAdmin, async (req, res) => {
  try {
    const result = await query('SELECT DISTINCT category FROM products WHERE category IS NOT NULL AND category != \'\' ORDER BY category');
    const categories = result.rows.map((r) => r.category);
    res.json({ success: true, categories });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/admin/sample-excel - Download sample Excel template
app.get('/api/admin/sample-excel', async (req, res) => {
  try {
    const XLSX = await import('xlsx').then(m => m.default);
    const wb = XLSX.utils.book_new();
    const data = [
      { Product_Name: 'Sample Product', Price: 100, Category: 'Groceries', Sort_Order: 1 },
    ];
    const ws = XLSX.utils.json_to_sheet(data);
    XLSX.utils.book_append_sheet(wb, ws, 'Products');
    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=ketanshop_sample.xlsx');
    res.send(buffer);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Warm up the in-memory image cache by loading all product images on startup.
 * This eliminates DB queries + base64 decode latency on the first image request.
 */
export async function warmupImageCache() {
  try {
    const result = await query(
      "SELECT id, image_data, image_type FROM products WHERE image_data IS NOT NULL AND image_data != ''"
    );
    let loaded = 0;
    for (const row of result.rows) {
      const imgBuffer = Buffer.from(row.image_data, 'base64');
      setCachedImage(row.id, { buffer: imgBuffer, mime: row.image_type || 'image/webp' });
      markImageCached(row.id);
      loaded++;
    }
    console.log(`🖼️  Pre-loaded ${loaded} product images into memory cache`);
  } catch (err) {
    console.warn('⚠️  Failed to warm up image cache:', err.message);
  }
}

// ─────── Warm up the word map for better first-call accuracy ───────
getWordMap().catch(() => {});

export default app;
