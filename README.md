# 🛒 Shriram Traders

An Indian grocery e-commerce website built with **React + Vite** (frontend) and **Express.js + Turso DB** (backend). Supports English/Marathi language toggle, product filtering, and a full admin panel.

---

## 📋 Table of Contents

- [Tech Stack](#-tech-stack)
- [Project Structure](#-project-structure)
- [Quick Start](#-quick-start)
- [Features](#-features)
- [Database](#-database)
- [API Reference](#-api-reference)
- [Admin Panel](#-admin-panel)
- [Language System](#-language-system)
- [Product Images](#-product-images)
- [Excel Import](#-excel-import)
- [Deployment](#-deployment)
- [Scripts Reference](#-scripts-reference)
- [Environment Variables](#-environment-variables)
- [Marathi Transliteration](#-marathi-transliteration)
- [Performance Optimizations](#-performance-optimizations)
- [Current Products (56 total)](#-current-products-56-total)
- [Adding New Products](#-adding-new-products)

---

## 🧰 Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | React 18 + Vite 5 |
| **Backend** | Express.js 4 |
| **Database** | Turso (libSQL — SQLite-compatible edge DB) |
| **DB Client** | `@libsql/client` |
| **Excel** | `xlsx` (SheetJS) |
| **Image Storage** | Stored as base64 WebP in DB, served via dedicated `/api/products/:id/image` endpoint with 7-day browser cache |
| **Image Cache** | Server in-memory buffer cache (warmed on startup, 5-min auto-refresh) |
| **File Upload** | `multer` (Excel import, memory storage) |
| **Language** | English + Marathi (bilingual UI) |
| **Styling** | Plain CSS with CSS custom properties |
| **Font** | Inter (Google Fonts) |

---

## 📁 Project Structure

```
ShriramTraders/
│
├── .env                          # Environment variables (TURSO_DB_URL, ADMIN_SECRET, etc.)
├── .gitignore                    # Ignores node_modules, .env, dist, etc.
├── index.html                    # Vite entry HTML
├── package.json                  # Dependencies & scripts
├── vite.config.js                # Vite config with API proxy
├── schema.sql                    # Database schema (products table)
├── KetanShop.xlsx                # Product data in Excel format (56 products)
├── vercel.json                   # Vercel deployment config
├── features.md                   # Product feature planning doc
│
├── public/                       # Static assets (served as-is by Express)
│
├── scripts/
│   ├── build-word-map.js                  # Generates wordMap.js from JSONL training data
│   ├── check-db-stats.js                  # DB statistics utility
│   ├── cleanup-db.js                      # Re-sequences IDs, cleans product names
│   ├── download-product-images.js         # Downloads Unsplash photos for all 56 products
│   ├── generate-placeholder-images.js     # SVG → WebP placeholder generator
│   ├── merge-training-data.js             # Merges .txt training files into JSONL dataset
│   ├── recompress-images.js               # Bulk image re-compression script
│   ├── update-marathi-names.js            # Regenerates Marathi names using improved transliterator
│
├── server/
│   ├── db.js                     # Turso DB connection (singleton)
│   ├── app.js                    # Express API — all public + admin endpoints
│   ├── index.js                  # Server entry point
│   ├── compressImage.js          # Sharp-based image compression (600px WebP)
│   └── seed.js                   # Reads KetanShop.xlsx → seeds Turso DB
│
├── src/
│   ├── main.jsx                  # React entry point
│   ├── App.jsx                   # Root component with /admin routing + lazy loading
│   ├── index.css                 # Global CSS (shop styling, skeletons, mobile menu)
│   │
│   ├── utils/
│   │   ├── format.js             # Number formatting — Marathi numeral conversion
│   │   ├── productName.js        # Shared cleanProductName utility (strips parenthetical text)
│   │   ├── transliterate.js      # English → Marathi Devanagari transliteration engine
│   │   └── wordMap.js            # Auto-generated 158K-entry lookup table (dynamic import)
│   │
│   ├── components/
│   │   ├── Header.jsx            # Nav bar + mobile menu + language toggle + filters
│   │   ├── SearchBar.jsx         # Debounced auto-search input
│   │   ├── FilterSidebar.jsx     # Category + price range + stock toggle filters
│   │   ├── ProductGrid.jsx       # Product grid + infinite scroll + skeleton loading
│   │   ├── ProductCard.jsx       # Individual product card (memo'd, lazy image)
│   │   ├── LenisSmoothScroll.jsx # Smooth scroll wrapper
│   │   └── Footer.jsx            # Site footer with contact info
│   │
│   ├── hooks/
│   │   ├── useLanguage.js        # Language state (EN/MR) with localStorage
│   │   └── useProducts.js        # Product fetching + filter state + pagination
│   │
│   ├── translations/
│   │   └── index.js              # All UI strings in English & Marathi
│   │
│   └── admin/
│       ├── AdminPage.jsx         # Password gate + tab navigation
│       ├── AdminDashboard.jsx    # Product CRUD table
│       ├── ProductForm.jsx       # Create/edit product modal
│       ├── ImportExcel.jsx       # Excel upload + sample download + category info
│       └── admin.css             # Admin panel styles
│
└── README.md                     # This file
```

---

## 🚀 Quick Start

### 1. Prerequisites

- Node.js 18+
- npm
- A [Turso](https://turso.tech) account (free tier works)

### 2. Environment Setup

```bash
# Install dependencies
npm install

# Create .env file with your Turso credentials
# See the Environment Variables section below for all required fields
```

### 3. Seed the Database

```bash
npm run seed
# Reads KetanShop.xlsx → applies schema → inserts all products
```

### 4. Start Development

```bash
npm run dev:all
# Starts both:
#   → Express API server on http://localhost:3001
#   → Vite dev server on http://localhost:5173
```

### 5. Open in Browser

- **Shop:** http://localhost:5173
- **Admin:** http://localhost:5173/admin (password: `ketan123`)

---

## ✨ Features

### Customer-Facing Shop (`/`)

| Feature | Description |
|---------|-------------|
| **🔍 Search** | Debounced (400ms) — searches English & Marathi product names |
| **📂 Category Filter** | Sidebar with clickable category buttons, smooth loading animation |
| **💰 Price Filter** | Min/max range inputs with 500ms debounce |
| **🌐 Language Toggle** | Switch between English (EN) and Marathi (मराठी) at top |
| **🔢 Marathi Numerals** | Prices and counts automatically convert to Marathi digits (०-९) in Marathi mode |
| **📱 Responsive** | Mobile-friendly — sidebar collapses, grid adapts, mobile hamburger menu |
| **🔄 Sorting** | Default, Price (Low→High / High→Low), Name |
| **🏷️ Brand** | Shriram Traders throughout |
| **🖼️ Product Images** | Real Unsplash photos stored as base64 WebP in DB, served via dedicated HTTP endpoint with 7-day browser cache + server memory cache |
| **📦 Stock Status** | Shows "In Stock" / "Out of Stock" / "Disabled" on each product |
| **♾️ Infinite Scroll** | IntersectionObserver-based auto-loading with 200px offset |
| **🦴 Skeleton Loading** | Shimmer animation placeholders while products load |
| **🎬 Loading Animation** | Pulse effect + spinner during category/filter switches for instant visual feedback |
| **✅ Correct Product Count** | Shows total DB count (56) instead of current page count (20) |
| **📦 Image Compression** | Images resized to 600px max, converted to WebP at 85% quality via Sharp |
| **⚡ Image Server Cache** | All 56 images pre-loaded into server memory on startup — first request served instantly, no DB query |
| **⚡ Image Browser Cache** | 7-day `Cache-Control` with `?v=updated_at` cache busting — subsequent loads instant |
| **⚡ Eager Image Loading** | No `loading="lazy"` — images load immediately when DOM renders |
| **⚡ JS Preloading** | All first-page images preloaded via `new Image()` right after API response arrives |
| **⚡ Placeholder Overlay** | Emoji placeholder overlays the image area with absolute positioning, fades out smoothly on image load |
| **🔄 Smooth Scrolling** | Lenis-powered smooth scroll for polished UX |

### Admin Panel (`/admin`)

| Feature | Description |
|---------|-------------|
| **🔐 Password Protection** | Login gate — enter admin password |
| **📋 Product List** | Table with image, name (EN/MR), category, price, stock |
| **➕ Create Product** | Modal form with all fields |
| **✏️ Edit Product** | Pre-filled form, partial updates |
| **🗑️ Delete Product** | With confirmation dialog |
| **📥 Import from Excel** | Upload .xlsx — auto-categorizes, auto-links images |
| **📄 Download Sample** | Click to get a template Excel file |

> **Access:** Admin panel is hidden from the main shop UI. Visit `/admin` directly in the URL to access the password-protected login page.

---

## 🗄️ Database

### Schema (`schema.sql`)

```sql
CREATE TABLE products (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    product_name    TEXT    NOT NULL,        -- English name
    product_name_mr TEXT    DEFAULT '',      -- Marathi name (auto-generated via transliteration)
    price           REAL    NOT NULL DEFAULT 0,
    image_path      TEXT    DEFAULT '',      -- e.g. /product_images/xyz.jpeg (for reference only)
    image_data      TEXT    DEFAULT NULL,    -- Base64-encoded image data (stored in DB)
    image_type      TEXT    DEFAULT NULL,    -- MIME type: image/jpeg, image/png, etc.
    category        TEXT    DEFAULT 'Groceries',
    availability    TEXT    DEFAULT 'yes',   -- 'yes' or 'no'
    sort_order      INTEGER DEFAULT 0,       -- Display priority (lower = first)
    created_at      TEXT    DEFAULT (datetime('now')),
    updated_at      TEXT    DEFAULT (datetime('now'))
);
```

### Categories (auto-detected from product name)

| Category | Keywords |
|----------|----------|
| Groceries | _(default)_ |
| Spices | spice, masala, turmeric, haldi, powder, garlic, cumin, pepper, cardamom |
| Sweets & Snacks | chikki, ladoo, sweet, chakli, bhakarwadi, shankarpali |
| Grains & Rice | rice, basmati, dal, grain, flour, atta, besan, poha |
| Pickles & Chutneys | pickle, chutney, mango, achar |
| Oils & Ghee | oil, ghee |
| Beverages | tea, coffee, drink |

---

## 🔌 API Reference

### Public Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/products` | List products (search, category, price filter, sort) |
| `GET` | `/api/products/:id` | Get single product (includes `image_data`/`image_type`) |
| `GET` | `/api/products/:id/image` | Serve product image (decoded from DB base64, raw bytes) |

**Query Parameters** (`GET /api/products`):

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `search` | string | `''` | Search product_name / product_name_mr |
| `category` | string | `'all'` | Filter by category |
| `minPrice` | number | `''` | Minimum price |
| `maxPrice` | number | `''` | Maximum price |
| `sort` | string | `sort_order` | Sort column: `sort_order`, `product_name`, `price`, `created_at` |
| `dir` | string | `asc` | Sort direction: `asc`, `desc` |
| `show_all` | bool | `false` | If `true`, includes disabled products |
| `show_out_of_stock` | bool | `true` | If `false`, hides out-of-stock products |
| `page` | number | `1` | Page number for pagination |
| `limit` | number | `20` | Products per page (max 100) |

### Admin Endpoints (require `x-admin-key` header)

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/admin/products` | Create a product |
| `PUT` | `/api/admin/products/:id` | Update a product |
| `DELETE` | `/api/admin/products/:id` | Delete a product |
| `POST` | `/api/admin/products/import-excel` | Import from Excel (multipart upload, supports `images` field) |
| `GET` | `/api/admin/sample-excel` | Download sample Excel template (includes `Category` column) |
| `GET` | `/api/admin/categories` | List all existing categories in the store |



---

## 🔐 Admin Panel

### Access

1. Visit **http://localhost:5173/admin**
2. Enter password: **`ketan123`** (set via `VITE_ADMIN_SECRET` in `.env`)
3. Manage products or import Excel

### Authentication Flow

```
Frontend (AdminPage.jsx)
  → User enters password matching VITE_ADMIN_SECRET
  → Password stored in sessionStorage
  → Every write operation sends x-admin-key header
    → Server validates against ADMIN_SECRET
      → If mismatch → 401 Unauthorized
```

> **Note:** The frontend password gate is a UX convenience. Real security is the server-side `x-admin-key` validation on every write operation. Passwords are stored in `sessionStorage` (cleared on tab close or logout).

---

## 🌐 Language System

### How It Works

1. **Toggle button** at the top-right switches between **EN** and **मराठी**
2. Preference saved to `localStorage` (persists across sessions)
3. All UI text loads from `src/translations/index.js`
4. **Product names auto-transliterate:** When Marathi mode is active, product names are automatically converted from English to Devanagari script using a rule-based transliteration engine with a lookup table for known words. If a `product_name_mr` is stored in the database (e.g., set via admin form), that takes priority.
5. **Numerals auto-convert:** Prices and product counts are automatically displayed using Marathi digits (०, १, २, etc.) when Marathi is selected, via the `toMarathiNumerals()` utility in `src/utils/format.js`

### Adding a New Translation

Edit `src/translations/index.js` and add the key under both `en` and `mr` objects:

```js
const translations = {
  en: { myNewKey: 'My New Text' },
  mr: { myNewKey: 'माझा नवीन मजकूर' },
}
```

Then use it in any component: `t('myNewKey')`

---

## 🖼️ Product Images

### Storage

Product images are stored **directly in the database** as base64-encoded WebP data in the `image_data` column, with the MIME type stored in `image_type`.

### Real Product Photos

All 56 products have real photos downloaded from Unsplash:

```bash
node scripts/download-product-images.js
```

This script:
1. Maps each of the 56 products to a pre-vetted Unsplash photo URL
2. Downloads the JPEG, compresses to WebP via Sharp (~20-68 KB per image)
3. Stores directly in the database

Products in the same category share a category-appropriate photo (e.g., all spices use an Indian-spices photo, all oils use an oil-bottle photo).

### How Images Are Served

Images are served via a **dedicated HTTP endpoint** `GET /api/products/:id/image` with **7-day browser cache** (`Cache-Control: public, max-age=604800`). The product list API does **not** include `image_data` — keeping JSON payloads tiny (~5 KB per page).

**Server-side:**
- On startup, `warmupImageCache()` loads all 56 images into an in-memory buffer cache (decoded from base64)
- Image requests are served from memory — **no DB query, no base64 decode** on the critical path
- The image cache has a 5-minute TTL as a safety net for admin edits
- Any admin write operation immediately invalidates all caches via `invalidateCache()`

**Client-side:**
- All first-page images are preloaded via JavaScript `Image()` objects as soon as the API response arrives
- No `loading="lazy"` — images start loading immediately when the DOM renders
- A placeholder emoji (🛍️) overlays the image area with absolute positioning, fading out smoothly when the image loads
- Browser cache is busted via `?v=updated_at` query parameter when an image is edited

**Typical first-load timeline:**
1. JSON payload (~5KB) downloads in ~50-100ms
2. Product cards render with placeholder emojis immediately
3. All 20 images load in parallel via HTTP/2, completing within ~200-500ms
4. On subsequent visits, images load instantly from browser cache

If no image is stored or the image fails to load, a placeholder emoji (🛍️) is shown instead.

### How Images Get into the Database

There are four ways images end up in the DB:

#### 1. Unsplash Download Script
```bash
node scripts/download-product-images.js
```
Downloads real product photos from Unsplash for all products.

#### 2. Seed Script (`npm run seed`)
Reads `KetanShop.xlsx`, generates a slug from each product name, and looks for matching image files in `public/product_images/`. If found, reads the file, compresses to WebP, and stores in the DB.

#### 3. Admin Product Form (Create/Edit)
Upload JPEG, PNG, GIF, or WebP (max 5 MB) via the admin panel. The image compresses to WebP via Sharp on the server.

#### 4. Excel Import with Images
Upload image files alongside the Excel file. The system matches images to products by filename (case-insensitive slug matching).

### Image Naming Convention

```
Product: "Kashmiri Garlic Black"
  → Slug: "Kashmiri_Garlic_Black"
  → File: Kashmiri_Garlic_Black.jpeg
```

Supported: `.jpeg`, `.jpg`, `.png`, `.gif`, `.webp`

### Fallback

If no image is stored or loading fails, a placeholder emoji (🛍️) is displayed. The `onError` handler on the `<img>` tag gracefully falls back.

---

## 📥 Excel Import

### Excel Format

| Column | Required | Description |
|--------|----------|-------------|
| `Product_Name` | ✅ Yes | Product name in English |
| `Price` | ✅ Yes | Product price (number) |
| `Category` | Optional | Category name. If omitted, guessed from product name. See [existing categories list](https://github.com/ketanshinde/shop) for reference |
| `Sort_Order` | Optional | Display order (lower = first) |

> **Marathi names** are auto-generated from the English name via server-side transliteration. To override, edit the product in the admin panel and set a custom Marathi name.
> **Categories** can be provided in the `Category` column. The import page shows existing categories in the store as a reference.

### Import via Admin Panel

1. Go to Admin → **Import Excel** tab
2. Click **Download Sample Excel** to get a template (includes `Category` column)
3. **Reference:** The import page shows existing categories to help you fill the `Category` column
4. Fill in your products
5. Upload the `.xlsx` file
6. **Optional:** Select image files named to match your product slugs (e.g., `Kashmiri_Garlic_Black.jpeg`)
7. Click **Import Products** — system auto-categorizes (if no category provided), matches images by filename, and stores them in the database

> **Image matching:** Image filenames are matched case-insensitively to product slugs. E.g., `kashmiri_garlic_black.jpeg` matches product "Kashmiri Garlic Black". Supported formats: JPEG, PNG, GIF, WebP. Max 10 MB per file. Images are automatically compressed and converted to WebP via Sharp.

### Import via Command Line

```bash
npm run seed
```

This reads the current `KetanShop.xlsx` file and `public/product_images/` folder, then replaces all products in the database — including converting disk images to base64 and storing them in the DB.

---

## 🚢 Deployment

### Build for Production

```bash
npm run build
# Output in dist/
```

> **Note:** The current setup uses a standalone Express server (port 3001) for the API. For Vercel/Netlify deployment, the Express server needs to be adapted into a serverless function (e.g., `api/index.js`). For now, deploying to a VPS is the most straightforward option.

### Deploy to a VPS (Recommended)

```bash
# Build the frontend
npm run build

# Start the Express server (serves both API + static files)
npm run server

# Use PM2 for production process management
npm install -g pm2
pm2 start server/index.js --name shriram-traders
```

---

## 📜 Scripts Reference

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Vite dev server only |
| `npm run server` | Start Express API server (port 3001) |
| `npm run dev:all` | Start both API + Vite concurrently |
| `npm run build` | Build frontend for production → `dist/` |
| `npm run preview` | Preview production build locally |
| `npm run seed` | Read `KetanShop.xlsx` and seed Turso DB |
| `npm run db:stats` | Show DB statistics (product count, categories, image info) |
| `node scripts/cleanup-db.js` | Re-sequence product IDs, clean product names, regenerate Marathi names |
| `node scripts/download-product-images.js` | Download real product photos from Unsplash for all products |
| `node scripts/update-marathi-names.js` | Re-generate Marathi names using improved transliterator |
| `node scripts/build-word-map.js` | Rebuild wordMap.js from marathi_transliteration_dataset.jsonl |
| `node scripts/merge-training-data.js` | Merge .txt training files into JSONL dataset and rebuild wordMap |
| `node scripts/generate-placeholder-images.js` | Generate category-colored placeholder images |

---

## 🔧 Environment Variables

Create a `.env` file in the project root:

```bash
# ── Turso DB (Required) ──
TURSO_DB_URL=libsql://your-db-username.turso.io
TURSO_DB_TOKEN=eyJhbGciOi...

# ── Admin Auth (Required) ──
ADMIN_SECRET=ketan123        # Server-side admin password
VITE_ADMIN_SECRET=ketan123   # Frontend admin password (VITE_ prefix for Vite)
```

> **Security:** The `.env` file is in `.gitignore` and will NOT be committed to version control. On Vercel/Netlify, add these as environment variables in the dashboard.

---

## ⚡ Performance Optimizations

The following optimizations are in place:

| Optimization | Location | Details |
|-------------|----------|--------|
| **Image Compression** | `server/compressImage.js` | Sharp resizes to 600px max, converts to WebP at 85% quality. Applied during seed, import, and product create/update. |
| **Separate Image Endpoint** | `server/app.js`, `ProductCard.jsx` | Images served via `/api/products/:id/image` instead of inline base64 — keeps JSON payloads tiny (~5KB per page). |
| **Server Image Cache** | `server/app.js` | All images pre-loaded into memory on startup (`warmupImageCache()`). Subsequent requests served from memory — no DB query. 5-minute TTL as safety net. |
| **Server-side Pagination** | `server/app.js` | 20 products per page with `LIMIT/OFFSET`. Reduces initial payload. |
| **In-memory API Cache** | `server/app.js` | 10-second TTL cache for product list responses. Prevents redundant DB queries. |
| **7-day Browser Cache** | Image endpoint | `Cache-Control: public, max-age=604800` with `?v=updated_at` for cache busting. |
| **Eager Image Loading** | `ProductCard.jsx` | No `loading="lazy"` — images load immediately when DOM renders. |
| **JS Image Preloading** | `useProducts.js` | All first-page images preloaded via `new Image()` right after API response arrives. |
| **Placeholder Overlay** | `ProductCard.jsx`, `index.css` | Emoji placeholder uses `position: absolute; inset: 0` to overlay the image, fading out smoothly on load. |
| **Category Loading Animation** | `ProductGrid.jsx`, `index.css` | Pulse effect + spinner on existing products during category/filter switches for instant visual feedback. |
| **Infinite Scroll** | `ProductGrid.jsx` | `IntersectionObserver` with 200px rootMargin triggers next page load. |
| **Code Splitting** | `App.jsx` | `React.lazy()` + `Suspense` for AdminPage — admin code loads only when visiting `/admin`. |
| **Skeleton Loading** | `ProductGrid.jsx` | Shimmer animation cards during initial load and load-more states. |
| **Debounced Filters** | `FilterSidebar.jsx` | 500ms debounce on price range inputs prevents excessive API calls. |
| **Memo'd Components** | `ProductCard.jsx` | `React.memo` prevents unnecessary re-renders. |
| **Stale Response Guard** | `useProducts.js` | Generation counter discards stale API responses after filter changes. |
| **Smooth Scrolling** | `LenisSmoothScroll.jsx` | Lenis library for performant smooth scrolling. |

---

## 🌐 Marathi Transliteration

The `src/utils/transliterate.js` module provides an English-to-Marathi (Devanagari) conversion engine using a 3-tier approach:

### Tier 1: FALLBACK_MAP (built-in, ~100 entries)
Covers common product words and phrases that need semantic translation rather than phonetic transliteration (e.g., `"turmeric powder"` → `"हळद पूड"`, `"cow ghee"` → `"गायीचे तूप"`). Loaded instantly — no async import needed.

### Tier 2: WORD_MAP (auto-generated, 158,592 entries)
A comprehensive lookup table generated from the training dataset via `scripts/build-word-map.js`. Includes exact English→Marathi pairs for grocery products, UI text, spices, customer service phrases, and business terms. Dynamically imported (not bundled) to keep the frontend JS small.

### Tier 3: Rule-based engine (fallback)
Unknown words are transliterated character-by-character using consonant and vowel mappings, with anusvara (ं) support for nasalization marks.

### Training Data

The transliterator is trained on a dataset of 158,592 English→Marathi pairs from multiple domains:
- **UI & Website text** (10K pairs)
- **Grocery product names** (10K pairs)
- **Spices & Masalas** (10K pairs)
- **Customer service phrases** (10K pairs)
- **Business & SEO terms** (10K pairs)
- **5x Shriram Training Parts** (50K pairs)
- **English_Marathi_Grocery_Training_Data.txt** (39 new grocery phrase pairs)
- **Original base dataset** (98K pairs)

### Adding Training Data

1. Add tab-separated `.txt` files (English\tMarathi) to the `public/` directory
2. Run the merge script:
```bash
node scripts/merge-training-data.js
```
This merges new data into `marathi_transliteration_dataset.jsonl` (existing entries take priority), then auto-rebuilds `src/utils/wordMap.js`.

### Rebuilding the Word Map Manually
```bash
node scripts/build-word-map.js
```

---

## 📦 Current Products (56 total)

The store includes a diverse catalog spanning 6 categories:

| Category | Count | Sample Products | Price Range |
|----------|-------|----------------|-------------|
| **Spices** | 22 | Haldi, Jeera, Garam Masala, Hing, Kesar, Elaichi | ₹55 – ₹800 |
| **Grains & Rice** | 15 | Basmati Rice, Toor Dal, Atta, Besan, Poha | ₹45 – ₹220 |
| **Sweets & Snacks** | 7 | Chikki, Til Ladoo, Besan Ladoo, Chakli, Bhakarwadi | ₹50 – ₹180 |
| **Pickles & Chutneys** | 6 | Mango Pickle, Lemon Pickle, Garlic Pickle | ₹80 – ₹150 |
| **Oils & Ghee** | 5 | Cow Ghee, Mustard Oil, Coconut Oil | ₹180 – ₹550 |
| **Beverages** | 1 | Masala Chai (Spiced Tea) | ₹250 |

> Products are seeded from `KetanShop.xlsx` via `npm run seed`. Images are stored in the database and compressed to WebP format.

---

## 💡 Adding New Products

### Method 1: Admin Panel (Recommended)
1. Go to `/admin` → login
2. Click **+ Add Product** → fill form → save

### Method 2: Excel Import
1. Download sample Excel from admin panel
2. Add rows with product data
3. Upload in admin panel → Import Excel tab

### Method 3: Edit Excel File + Re-seed
1. Edit `KetanShop.xlsx` with new rows
2. Add product images to `public/product_images/` (named to match product slugs)
3. Run `npm run seed` — reads Excel, converts disk images to base64, stores in DB
4. Run `npm run dev:all` to see changes
