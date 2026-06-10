import express from 'express';
import cors from 'cors';
import multer from 'multer';
import XLSX from 'xlsx';
import path from 'path';
import { fileURLToPath } from 'url';
import { existsSync } from 'fs';
import { query, getDb, imageToBase64, MIME_MAP, ALLOWED_IMAGE_EXTS } from './db.js';
import { toMarathi } from '../src/utils/transliterate.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB per file
});

const app = express();
const PORT = 3001;

// Increase JSON body size limit to handle large base64 image data
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

/* ─────── Helper: Check admin auth ─────── */
function requireAdmin(req, res, next) {
  const adminKey = req.headers['x-admin-key'];
  const expectedKey = process.env.ADMIN_SECRET;
  if (!adminKey || adminKey !== expectedKey) {
    return res.status(401).json({ success: false, error: 'Unauthorized' });
  }
  next();
}

/* ─────── PUBLIC API ─────── */

// GET /api/products - List products (excludes image_data for performance)
app.get('/api/products', async (req, res) => {
  try {
    const {
      search = '',
      category = '',
      minPrice = '',
      maxPrice = '',
      sort = 'sort_order',
      dir = 'asc',
    } = req.query;

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
    // Only show available products (unless admin requests all)
    if (req.query.show_all !== 'true') {
      conditions.push("availability = 'yes'");
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const allowedSorts = ['sort_order', 'product_name', 'price', 'created_at'];
    const safeSort = allowedSorts.includes(sort) ? sort : 'sort_order';
    const safeDir = dir === 'desc' ? 'DESC' : 'ASC';

    const sql = `SELECT id, product_name, product_name_mr, price, image_path, category, availability, sort_order, created_at, updated_at FROM products ${where} ORDER BY ${safeSort} ${safeDir}`;
    const result = await query(sql, params);

    // For categories, show all categories when admin fetches all
    const catWhere = req.query.show_all === 'true' ? '' : "WHERE availability = 'yes'";
    const catResult = await query(
      `SELECT DISTINCT category FROM products ${catWhere} ORDER BY category`
    );

    res.json({
      success: true,
      products: result.rows,
      categories: catResult.rows.map((r) => r.category),
      total: result.rows.length,
    });
  } catch (error) {
    console.error('❌ API Error:', error);
    res.status(500).json({ success: false, error: error.message });
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

// GET /api/products/:id/image - Serve the product image (decoded from DB base64)
app.get('/api/products/:id/image', async (req, res) => {
  try {
    const result = await query('SELECT image_data, image_type FROM products WHERE id = ?', [req.params.id]);
    if (result.rows.length === 0 || !result.rows[0].image_data) {
      return res.status(404).end();
    }
    const { image_data, image_type } = result.rows[0];
    const imgBuffer = Buffer.from(image_data, 'base64');
    res.setHeader('Content-Type', image_type || 'image/jpeg');
    res.setHeader('Cache-Control', 'no-cache, must-revalidate');
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
    // Use admin-provided Marathi name, or auto-generate from English name
    const finalProductNameMr = (product_name_mr && product_name_mr.trim()) ? product_name_mr.trim() : (toMarathi(product_name, 'mr') || '');
    const result = await getDb().execute({
      sql: `INSERT INTO products (product_name, product_name_mr, price, category, image_path, image_data, image_type, availability, sort_order)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        product_name, finalProductNameMr, Number(price) || 0,
        category || 'Groceries', image_path || '', image_data || null, image_type || null,
        availability || 'yes', Number(sort_order) || 0,
      ],
    });
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
    }
    // Determine Marathi name: explicit value > auto-generate from English > unchanged
    if (product_name_mr !== undefined && product_name_mr !== '') {
      // Admin explicitly provided a Marathi name
      updates.push('product_name_mr = ?');
      values.push(product_name_mr);
    } else if (product_name !== undefined) {
      // Product name changed but no Marathi name given — auto-generate
      updates.push('product_name_mr = ?');
      values.push(toMarathi(product_name, 'mr') || '');
    }
    if (price !== undefined) { updates.push('price = ?'); values.push(Number(price)); }
    if (category !== undefined) { updates.push('category = ?'); values.push(category); }
    if (image_path !== undefined) { updates.push('image_path = ?'); values.push(image_path); }
    if (image_data !== undefined) { updates.push('image_data = ?'); values.push(image_data || null); }
    if (image_type !== undefined) { updates.push('image_type = ?'); values.push(image_type || null); }
    if (availability !== undefined) { updates.push('availability = ?'); values.push(availability); }
    if (sort_order !== undefined) { updates.push('sort_order = ?'); values.push(Number(sort_order)); }

    if (updates.length === 0) {
      return res.status(400).json({ success: false, error: 'No fields to update' });
    }

    updates.push("updated_at = datetime('now')");
    values.push(id);

    const sql = `UPDATE products SET ${updates.join(', ')} WHERE id = ?`;
    await getDb().execute({ sql, args: values });

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
    const workbook = XLSX.read(req.files.file[0].buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);

    if (rows.length === 0) {
      return res.status(400).json({ success: false, error: 'Excel file is empty' });
    }

    const db = getDb();
    let imported = 0;
    let imagesImported = 0;

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

      uploadedImages.set(basename.toLowerCase(), {
        base64: imgFile.buffer.toString('base64'),
        mime: MIME_MAP[ext] || 'image/jpeg',
      });
    }

    for (const row of rows) {
      if (!row.Product_Name) continue;

      const productName = row.Product_Name || '';
      const price = Number(row.Price) || 0;

      // Determine category from product name
      let category = 'Groceries';
      const name = productName.toLowerCase();
      if (name.includes('chikki') || name.includes('ladoo') || name.includes('sweet')) category = 'Sweets & Snacks';
      else if (name.includes('spice') || name.includes('masala') || name.includes('turmeric') || name.includes('haldi')) category = 'Spices';
      else if (name.includes('rice') || name.includes('basmati') || name.includes('dal') || name.includes('grain') || name.includes('flour')) category = 'Grains & Rice';
      else if (name.includes('pickle') || name.includes('chutney') || name.includes('mango')) category = 'Pickles & Chutneys';
      else if (name.includes('tea') || name.includes('coffee') || name.includes('drink')) category = 'Beverages';

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
          imageData = imgResult.base64;
          imageType = imgResult.mime;
        }
      }

      const productNameMr = toMarathi(productName, 'mr') || '';
      await db.execute({
        sql: `INSERT INTO products (product_name, product_name_mr, price, category, image_path, image_data, image_type, availability, sort_order)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          productName, productNameMr, price,
          category, imagePath, imageData, imageType, 'yes', Number(row.Sort_Order) || 0,
        ],
      });
      imported++;
    }

    res.json({ success: true, imported, images_imported: imagesImported, message: `Imported ${imported} products` });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/admin/sample-excel - Download sample Excel template
app.get('/api/admin/sample-excel', async (req, res) => {
  try {
    const wb = XLSX.utils.book_new();
    const data = [
      { Product_Name: 'Sample Product', Price: 100, Sort_Order: 1 },
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

/* ─────── Start Server ─────── */
app.listen(PORT, () => {
  console.log(`🚀 Shriram Traders API running on http://localhost:${PORT}`);
});
