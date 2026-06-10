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

---

## 🧰 Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | React 18 + Vite 5 |
| **Backend** | Express.js 4 |
| **Database** | Turso (libSQL — SQLite-compatible edge DB) |
| **DB Client** | `@libsql/client` |
| **Excel** | `xlsx` (SheetJS) |
| **Image Storage** | Stored as base64 in DB via `GET /api/products/:id/image` endpoint |
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
├── KetanShop.xlsx                # Product data in Excel format
│
├── public/
│   └── product_images/           # Source images for seeding (optional — stored in DB at runtime)
│       ├── Shengadanyachi_Chikki.jpeg
│       ├── Kashmiri_Garlic_Black.jpeg
│       ├── Organic_Gud_Jaggery.jpeg
│       ├── Pure_Haldi_Powder.jpeg
│       ├── Premium_Basmati_Rice.jpeg
│       └── Mango_Pickle_Aam_ka_Achar.jpeg
│
├── server/
│   ├── db.js                     # Turso DB connection (singleton)
│   ├── index.js                  # Express API — public + admin endpoints
│   └── seed.js                   # Reads KetanShop.xlsx → seeds Turso DB
│
├── src/
│   ├── main.jsx                  # React entry point
│   ├── App.jsx                   # Root component with /admin routing
│   ├── index.css                 # Global CSS (shop styling)
│   │
│   ├── utils/
│   │   └── format.js             # Number formatting — Marathi numeral conversion
│   │
│   ├── components/
│   │   ├── Header.jsx            # Nav bar + language toggle + admin link
│   │   ├── SearchBar.jsx         # Debounced auto-search input
│   │   ├── FilterSidebar.jsx     # Category + price range filters
│   │   ├── ProductGrid.jsx       # Product card grid + sorting
│   │   ├── ProductCard.jsx       # Individual product card
│   │   └── Footer.jsx            # Site footer
│   │
│   ├── hooks/
│   │   ├── useLanguage.js        # Language state (EN/MR) with localStorage
│   │   └── useProducts.js        # Product fetching + filter state
│   │
│   ├── translations/
│   │   └── index.js              # All UI strings in English & Marathi
│   │
│   └── admin/
│       ├── AdminPage.jsx         # Password gate + tab navigation
│       ├── AdminDashboard.jsx    # Product CRUD table
│       ├── ProductForm.jsx       # Create/edit product modal
│       ├── ImportExcel.jsx       # Excel upload + sample download
│       └── admin.css             # Admin panel styles
│
├── skill.md                      # Turso DB setup guide (reference)
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
| **📂 Category Filter** | Sidebar with clickable category buttons |
| **💰 Price Filter** | Min/max range inputs with 500ms debounce |
| **🌐 Language Toggle** | Switch between English (EN) and Marathi (मराठी) at top |
| **🔢 Marathi Numerals** | Prices and counts automatically convert to Marathi digits (०-९) in Marathi mode |
| **📱 Responsive** | Mobile-friendly — sidebar collapses, grid adapts |
| **🔄 Sorting** | Default, Price (Low→High / High→Low), Name |
| **🏷️ Brand** | Shriram Traders throughout |
| **🖼️ Product Images** | Real product photos stored in DB, served via API, with hover zoom effect |
| **📦 Stock Status** | Shows "In Stock" / "Out of Stock" on each product |

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
    product_name_m  TEXT    DEFAULT '',      -- Marathi name
    price           REAL    NOT NULL DEFAULT 0,
    price_m         TEXT    DEFAULT '',      -- Marathi price display
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
| Sweets & Snacks | chikki, ladoo, sweet |
| Spices | spice, masala, turmeric, haldi, powder |
| Grains & Rice | rice, basmati, dal, grain, flour |
| Pickles & Chutneys | pickle, chutney, mango |
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
| `search` | string | `''` | Search product_name / product_name_m |
| `category` | string | `'all'` | Filter by category |
| `minPrice` | number | `''` | Minimum price |
| `maxPrice` | number | `''` | Maximum price |
| `sort` | string | `sort_order` | Sort column: `sort_order`, `product_name`, `price`, `created_at` |
| `dir` | string | `asc` | Sort direction: `asc`, `desc` |
| `show_all` | bool | `false` | If `true`, includes out-of-stock products |

### Admin Endpoints (require `x-admin-key` header)

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/admin/products` | Create a product |
| `PUT` | `/api/admin/products/:id` | Update a product |
| `DELETE` | `/api/admin/products/:id` | Delete a product |
| `POST` | `/api/admin/products/import-excel` | Import from Excel (multipart upload) |
| `GET` | `/api/admin/sample-excel` | Download sample Excel template |

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
4. Product names and prices use the `product_name_m` / `price_m` fields when available in Marathi mode
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

Product images are stored **directly in the database** as base64-encoded data in the `image_data` column, with the MIME type stored in `image_type`. Images are never served directly from the filesystem at runtime.

### How Images Are Served

Images are served through the API endpoint `GET /api/products/:id/image`, which:
1. Queries the database for `image_data` and `image_type`
2. Decodes the base64 string into raw bytes
3. Returns the image with the correct `Content-Type` header and `Cache-Control` (1 day)

If no image is stored in the DB, the endpoint returns 404 and the frontend shows a placeholder emoji (🛍️) instead.

### How Images Get into the Database

There are three ways images end up in the DB:

#### 1. Seed Script (`npm run seed`)
The seed script reads `KetanShop.xlsx`, generates a slug from each product name, and looks for a matching image file in `public/product_images/`. If found, it reads the file, converts it to base64, and stores it directly in the database.

#### 2. Admin Product Form (Create/Edit)
When creating or editing a product via the admin panel:
1. Click **+ Add Product** or **Edit** on a product
2. Use the **Product Image** file upload input to select a JPEG, PNG, GIF, or WebP file (max 5 MB)
3. The image is converted to base64 on the client and sent as JSON `image_data` + `image_type`
4. The server stores it directly in the database

#### 3. Excel Import with Images
When importing products via Excel (see [Excel Import](#-excel-import) below), you can upload image files alongside the Excel file. The system matches images to products by filename.

### Naming Convention for Image Files

Whether placing images in `public/product_images/` or uploading them during Excel import, filenames should match the product slug:
```
Product: "Kashmiri Garlic Black"
  → Slug: "Kashmiri_Garlic_Black"
  → File: Kashmiri_Garlic_Black.jpeg
```

Supported extensions: `.jpeg`, `.jpg`, `.png`, `.gif`, `.webp`

### Fallback

If no image is stored in the database or the image fails to load, a placeholder emoji (🛍️) is shown instead. The `onError` handler on the `<img>` tag gracefully falls back.

---

## 📥 Excel Import

### Excel Format

| Column | Required | Description |
|--------|----------|-------------|
| `Product_Name` | ✅ Yes | Product name in English |
| `Product_Name_M` | Optional | Product name in Marathi |
| `Price` | ✅ Yes | Product price (number) |
| `Price_M` | Optional | Price display in Marathi |
| `Sort_Order` | Optional | Display order (lower = first) |

### Import via Admin Panel

1. Go to Admin → **Import Excel** tab
2. Click **Download Sample Excel** to get a template
3. Fill in your products
4. Upload the `.xlsx` file
5. **Optional:** Select image files named to match your product slugs (e.g., `Kashmiri_Garlic_Black.jpeg`)
6. Click **Import Products** — system auto-categorizes, matches images by filename, and stores them in the database

> **Image matching:** Image filenames are matched case-insensitively to product slugs. E.g., `kashmiri_garlic_black.jpeg` matches product "Kashmiri Garlic Black". Supported formats: JPEG, PNG, GIF, WebP. Max 10 MB per file.

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

## 📦 Current Products

| # | Product | Category | Price | Image |
|---|---------|----------|-------|-------|
| 1 | Shengadanyachi Chikki | Sweets & Snacks | ₹50 | ✅ |
| 2 | Kashmiri Garlic Black | Groceries | ₹180 | ✅ |
| 3 | Organic Gud (Jaggery) | Groceries | ₹80 | ✅ |
| 4 | Pure Haldi Powder | Spices | ₹60 | ✅ |
| 5 | Premium Basmati Rice | Grains & Rice | ₹220 | ✅ |
| 6 | Mango Pickle (Aam ka Achar) | Pickles & Chutneys | ₹90 | ✅ |

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
