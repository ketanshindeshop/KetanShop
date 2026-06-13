# 🛒 Shriram Traders — Features

> A bilingual Indian grocery e-commerce platform with full admin panel, Marathi transliteration, and Turso DB.

---

## Table of Contents

1. [Customer-Facing Shop](#-customer-facing-shop)
2. [Admin Panel](#-admin-panel)
3. [Mobile Features](#-mobile-features)
4. [Language & Localization](#-language--localization)
5. [Product Management](#-product-management)
6. [Image System](#-image-system)
7. [Search & Filtering](#-search--filtering)
8. [Database](#-database)
9. [API](#-api)
10. [Deployment](#-deployment)

---

## 🏪 Customer-Facing Shop

| Feature | Details |
|---------|---------|
| **Brand Logo** | Custom `ShriRamTradersLogo.png` displayed in header, footer, and browser tab (favicon) |
| **Product Grid** | Responsive card grid with image, name, price, and stock status |
| **Out of Stock Display** | Out-of-stock products are still shown to customers with an "Out of Stock" badge |
| **Disabled Products** | Products can be hidden from customers entirely (stay in DB, not shown) |
| **Stock Badge** | Each product shows "In Stock" (green) or "Out of Stock" (red) |
| **Image Fallback** | Products without images show a 🛍️ placeholder |
| **Inline Images (Page 1)** | First 20 product images embedded as `data:` URIs in JSON response — zero extra HTTP requests, instant render |
| **Hybrid Lazy Loading** | Page 1 = inline images; pages 2+ = lazy `/api/products/:id/image` endpoint to keep payload lean |
| **Vercel CDN Edge Cache** | API response cached at edge for 1 hour (`s-maxage=3600`) with `stale-while-revalidate=86400` — sub-ms for returning visitors |
| **Image CDN Cache** | Individual images cached at Vercel edge for 7 days (`s-maxage=604800`) |
| **Immutable Asset Caching** | Vite-built assets with `max-age=31536000, immutable` |
| **Client-Side Compression** | Images compressed in-browser via Canvas API (400px WebP, 70% quality) before upload — works on Vercel |
| **Accurate MIME Fallback** | `detectMimeFromBuffer()` detects actual format from magic bytes when Sharp unavailable |
| **Image Size Display** | Admin dashboard shows per-product image sizes; edit form shows original → compressed size |
| **Placeholder Overlay** | Emoji placeholder overlays image area, fades out smoothly on load |
| **Real Product Photos** | All 56 products have real Unsplash photos (compressed WebP) |
| **Loading Animation** | Pulse effect + spinner on existing products during category/filter switches |
| **Correct Product Count** | Shows total DB count (56) instead of current page count (20) |
| **Hover Effect** | Cards lift on hover with image zoom |
| **Responsive Grid** | Adapts columns based on screen width (auto-fill with minmax) |

## 🔐 Admin Panel

| Feature | Details |
|---------|---------|
| **Password Protection** | Login gate with server-side `x-admin-key` validation on every write |
| **Product CRUD** | Full Create, Read, Update, Delete with modal forms |
| **Availability Control** | Three states per product — **In Stock**, **Out of Stock**, **Disabled** |
| **Visual Badges** | Green (In Stock), Red (Out of Stock), Gray (Disabled) in the admin table |
| **Excel Import** | Bulk upload via `.xlsx` with auto-categorization and image matching |
| **Sample Download** | One-click download of template Excel file |
| **Image Upload** | File picker with preview, stores directly in DB as base64 |
| **Auto-Marathi Names** | Marathi product names auto-generated from English via transliteration |
| **Session Persistence** | Admin login stored in `sessionStorage` (persists across page refreshes) |

## 📱 Mobile Features

| Feature | Details |
|---------|---------|
| **Hamburger Menu** | Slide-in panel from left with nav links, categories, and price filter |
| **Collapsible Price Range** | Expandable min/max price inputs inside the hamburger menu |
| **Mobile Clear Filters** | "Filters Applied" bar with clear button visible on mobile when filters are active |
| **Hidden Sidebar** | Filter sidebar automatically hidden on screens ≤ 968px |
| **Responsive Grid** | Cards switch to 2-column layout on small screens |
| **Touch-Friendly Footer** | Redesigned footer with cards, icon circles, and clickable phone number |
| **Adaptive Header** | Sticky header collapses to 60px height on mobile |

## 🌐 Language & Localization

| Feature | Details |
|---------|---------|
| **English / Marathi Toggle** | Switch between EN and मराठी at the top of every page |
| **Persistent Preference** | Language choice saved to `localStorage` |
| **Marathi Transliteration** | English product names → Devanagari script via 3-tier engine (158K-entry lookup + fallback map + phonetic rules). Trained on 158,592 pairs including grocery phrases (Buy Rice, Premium Rice, Fresh Rice, Wholesale Rice + 7 base products × 4 prefixes). |
| **Database Override** | If `product_name_mr` is stored in DB, it takes priority over transliteration |
| **Marathi Numerals** | Prices and counts auto-convert to Marathi digits (०-९) |
| **Training Data Merge** | Tab-separated .txt files in public/ merged into dataset via `node scripts/merge-training-data.js` |
| **Category Translation** | Category names transliterate to Marathi in sidebar and mobile menu |
| **Translation System** | All UI strings in `src/translations/index.js` — single source of truth |

## 📦 Product Management

| Feature | Details |
|---------|---------|
| **Categories** | 6 categories: Groceries, Sweets & Snacks, Spices, Grains & Rice, Pickles & Chutneys, Beverages |
| **Auto-Categorization** | Category auto-detected from product name keywords during import |
| **Sort Order** | Products display in configurable order (lower = first) |
| **Sorting** | Customers can sort by Default, Price (Low/High), or Name |
| **Price Filtering** | Min/max price range with 500ms debounce on both desktop and mobile |
| **Category Filtering** | Clickable category buttons in sidebar and hamburger menu |
| **Search** | Debounced (400ms) search across English and Marathi names |

## 🖼️ Image System

| Feature | Details |
|---------|---------|
| **Database Storage** | Images stored as base64 WebP in `image_data` column |
| **Separate HTTP Endpoint** | Images served via `GET /api/products/:id/image` — keeps JSON payload tiny (~5KB per page) |
| **Server Memory Cache** | All images pre-loaded into memory on startup (`warmupImageCache()`). 5-min auto-refresh safety net. |
| **7-Day Browser Cache** | `Cache-Control: public, max-age=604800` with `?v=updated_at` cache busting |
| **Eager Loading** | No `loading="lazy"` — images load immediately when DOM renders |
| **JS Preloading** | All first-page images preloaded via `new Image()` after API response |
| **Placeholder Overlay** | Emoji placeholder uses `position: absolute; inset: 0` to overlay image, fades out on load |
| **Real Photos** | All 56 products have real Unsplash photos (~20-68 KB WebP each) |
| **Unsplash Download** | `node scripts/download-product-images.js` downloads and compresses product photos |
| **Cache Busting** | Image URLs include `updated_at` timestamp to force refresh after edits |
| **Upload Methods** | Admin form upload, Excel import with image matching, Unsplash download script, or disk seed |
| **Image Preview** | Live preview before upload in admin form |
| **Supported Formats** | JPEG, PNG, GIF, WebP (max 5MB per file) |
| **Fallback** | Missing images show 🛍️ placeholder gracefully |

## 🔍 Search & Filtering

| Feature | Details |
|---------|---------|
| **Debounced Search** | 400ms auto-search — no submit button needed |
| **Bilingual Search** | Searches both English and Marathi product names |
| **Category Filter** | Sidebar with all categories (auto-fetched from distinct DB values) |
| **Price Range** | Min/max inputs with 500ms debounce to avoid excessive API calls |
| **Combined Filters** | Search + category + price can be active simultaneously |
| **Clear Filters** | One-click clear on desktop (sidebar) and mobile (filter bar) |
| **Sort Controls** | Default / Price Low-High / Price High-Low / Name |

## 🗄️ Database

| Feature | Details |
|---------|---------|
| **Platform** | Turso (libSQL — SQLite-compatible edge database) |
| **Client** | `@libsql/client` |
| **Schema** | Single `products` table with 12 columns |
| **Migrations** | ALTER TABLE migrations for adding columns to existing databases |
| **Indexing** | Indexes on `category` and `availability` columns |
| **Seed Script** | Reads `KetanShop.xlsx` → applies schema → inserts all products with images |

## 🔌 API

| Feature | Details | Auth |
|---------|---------|------|
| `GET /api/products` | List products with search, filter, sort | Public |
| `GET /api/products/:id` | Single product detail | Public |
| `GET /api/products/:id/image` | Serve product image | Public |
| `POST /api/admin/products` | Create product | `x-admin-key` |
| `PUT /api/admin/products/:id` | Update product (partial) | `x-admin-key` |
| `DELETE /api/admin/products/:id` | Delete product | `x-admin-key` |
| `POST /api/admin/products/import-excel` | Bulk import from Excel + images | `x-admin-key` |
| `GET /api/admin/sample-excel` | Download sample Excel template | Public |

### API Query Parameters (`GET /api/products`)

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `search` | string | `''` | Search English/Marathi name |
| `category` | string | `'all'` | Filter by category |
| `minPrice` | number | `''` | Minimum price |
| `maxPrice` | number | `''` | Maximum price |
| `sort` | string | `sort_order` | Sort column |
| `dir` | string | `asc` | Sort direction |
| `show_all` | bool | `false` | If `true`, includes disabled products |

## 🚢 Deployment

| Feature | Details |
|---------|---------|
| **Frontend Build** | Vite production build → `dist/` |
| **Vercel Ready** | `vercel.json` with API rewrites + SPA fallback |
| **Serverless API** | `api/index.js` — Express app wrapped for Vercel serverless |
| **Environment Config** | Turso DB URL/token and admin secrets via `.env` |
