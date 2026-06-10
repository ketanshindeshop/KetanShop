# Turso Database — Setup & Usage Guide

A practical reference for setting up and using [Turso](https://turso.tech), an edge-hosted SQLite-compatible database built on libSQL. This guide covers everything from account creation to advanced patterns like embedded replicas and multi-region setups.

---

## Table of Contents

1. [Overview](#1-overview)
2. [Prerequisites](#2-prerequisites)
3. [Install the Turso CLI](#3-install-the-turso-cli)
4. [Authenticate & Create a Database](#4-authenticate--create-a-database)
5. [Get Connection Credentials](#5-get-connection-credentials)
6. [Install the libSQL Client (Node.js)](#6-install-the-libsql-client-nodejs)
7. [Basic Usage in Node.js](#7-basic-usage-in-nodejs)
8. [Schema Management](#8-schema-management)
9. [Data Seeding & Migrations](#9-data-seeding--migrations)
10. [Embedded Replicas (Local-First Reads)](#10-embedded-replicas-local-first-reads)
11. [Advanced Patterns](#11-advanced-patterns)
    - [Prepared Statements](#prepared-statements)
    - [Transactions](#transactions)
    - [Multi-Region / Dual-Database Pattern](#multi-region--dual-database-pattern)
    - [Serverless Proxy Pattern](#serverless-proxy-pattern)
12. [Environment Variables Reference](#12-environment-variables-reference)
13. [Troubleshooting](#13-troubleshooting)

---

## 1. Overview

| Feature | Details |
|---------|---------|
| **Engine** | libSQL (open-source fork of SQLite) |
| **Hosting** | Turso Cloud (edge-deployed, multi-region) |
| **Client** | `@libsql/client` (npm) |
| **Connection** | HTTPS (via libSQL Hrana protocol) or local file |
| **SQL Dialect** | SQLite-compatible |
| **Pricing** | Free tier: 1 database, 500 MB storage, 1 GB/month egress |

---

## 2. Prerequisites

- Node.js 18+
- npm, pnpm, or yarn
- A Turso account (sign up at [turso.tech](https://turso.tech))

---

## 3. Install the Turso CLI

**macOS / Linux:**
```bash
curl -sSfL https://get.turso.tech | bash
```

**Windows (PowerShell as Administrator):**
```powershell
powershell -ExecutionPolicy Bypass -c "irm https://get.turso.tech/install.ps1 | iex"
```

Verify the installation:
```bash
turso --version
```

---

## 4. Authenticate & Create a Database

```bash
# Authenticate with your Turso account (opens a browser)
turso auth login

# Create a new database
turso db create my-app-db

# List all databases
turso db list

# Show database details (URL, location, etc.)
turso db show my-app-db
```

---

## 5. Get Connection Credentials

```bash
# Get the database URL
turso db show my-app-db --url
# → libsql://my-app-db-username.turso.io

# Generate an auth token (this is your password — keep it secret!)
turso db tokens create my-app-db
# → eyJhbGciOiJIUzI1NiIs...
```

> ⚠️ **Security:** Treat the auth token like a password. Never commit it to version control. Use environment variables or a secrets manager.

---

## 6. Install the libSQL Client (Node.js)

```bash
npm install @libsql/client
```

Or with pnpm/yarn:
```bash
pnpm add @libsql/client
# or
yarn add @libsql/client
```

---

## 7. Basic Usage in Node.js

### Connect and Query

```javascript
import { createClient } from '@libsql/client'
import dotenv from 'dotenv'
dotenv.config()

const db = createClient({
  url: process.env.TURSO_DB_URL,
  authToken: process.env.TURSO_DB_TOKEN,
})

async function main() {
  // Simple SELECT
  const result = await db.execute('SELECT * FROM products LIMIT 5')
  console.log(result.rows)

  // INSERT
  const insert = await db.execute({
    sql: 'INSERT INTO products (slug, product_name, category) VALUES (?, ?, ?)',
    args: ['example-product', 'Example Product', 'Home'],
  })
  console.log(`Inserted row ID: ${insert.lastInsertRowid}`)

  // UPDATE
  await db.execute({
    sql: 'UPDATE products SET description = ? WHERE slug = ?',
    args: ['Updated description', 'example-product'],
  })

  // DELETE
  await db.execute({
    sql: 'DELETE FROM products WHERE slug = ?',
    args: ['example-product'],
  })
}

main().catch(console.error)
```

### Response Format

The `execute()` method returns a `ResultSet` object:

```javascript
{
  rows: [
    { id: 1, slug: 'product-1', product_name: 'Product One' },
    { id: 2, slug: 'product-2', product_name: 'Product Two' },
  ],
  columns: ['id', 'slug', 'product_name'],
  rowsAffected: 0,    // populated for INSERT/UPDATE/DELETE
  lastInsertRowid: 5, // populated for INSERT
}
```

> ⚠️ **BigInt Note:** Turso/libSQL returns `BigInt` for `lastInsertRowid` and `COUNT(*)` results. If you need to serialize these to JSON, convert them to `Number`:
> ```javascript
> const id = Number(result.lastInsertRowid)
> ```

---

## 8. Schema Management

### Apply Schema via CLI

Create a `schema.sql` file:

```sql
CREATE TABLE IF NOT EXISTS products (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    slug            TEXT    NOT NULL UNIQUE,
    product_name    TEXT    NOT NULL,
    description     TEXT    DEFAULT '',
    category        TEXT    DEFAULT 'Uncategorized',
    image_link      TEXT    DEFAULT '',
    affiliate_link  TEXT    DEFAULT '',
    rating          REAL    DEFAULT NULL,
    review_count    INTEGER DEFAULT NULL,
    sort_order      INTEGER DEFAULT 0,
    created_at      TEXT    DEFAULT (datetime('now')),
    updated_at      TEXT    DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
CREATE INDEX IF NOT EXISTS idx_products_slug ON products(slug);

CREATE TABLE IF NOT EXISTS homepage (
    id        INTEGER PRIMARY KEY AUTOINCREMENT,
    title     TEXT    DEFAULT '',
    subtitle  TEXT    DEFAULT '',
    image     TEXT    DEFAULT ''
);

-- Insert a default homepage row if the table was just created
INSERT OR IGNORE INTO homepage (id) VALUES (1);
```

Apply it directly to the database:

```bash
turso db shell my-app-db < schema.sql
```

### Apply Schema via Script

```javascript
import { createClient } from '@libsql/client'
import { readFileSync } from 'fs'

const db = createClient({
  url: process.env.TURSO_DB_URL,
  authToken: process.env.TURSO_DB_TOKEN,
})

const schema = readFileSync('./schema.sql', 'utf-8')
const statements = schema
  .split(';')
  .map(s => s.trim())
  .filter(s => s.length > 0)

for (const stmt of statements) {
  await db.execute(stmt)
}
console.log('Schema applied ✓')
```

---

## 9. Data Seeding & Migrations

### Seed Script Pattern

```javascript
#!/usr/bin/env node
import 'dotenv/config'
import { readFileSync, existsSync } from 'fs'
import { createClient } from '@libsql/client'

function createTursoClient() {
  const url = process.env.TURSO_DB_URL
  const token = process.env.TURSO_DB_TOKEN

  if (!url) {
    console.error('❌ TURSO_DB_URL is required')
    process.exit(1)
  }

  return createClient({ url, authToken: token || '' })
}

async function main() {
  const db = createTursoClient()

  // 1. Apply schema
  const schema = readFileSync('./schema.sql', 'utf-8')
  const statements = schema.split(';').map(s => s.trim()).filter(s => s.length)
  for (const stmt of statements) {
    await db.execute(stmt)
  }
  console.log('Schema applied ✓')

  // 2. Seed products (batch upsert)
  const products = JSON.parse(readFileSync('./products.json', 'utf-8'))
  const BATCH_SIZE = 50
  let count = 0

  for (let i = 0; i < products.length; i += BATCH_SIZE) {
    const batch = products.slice(i, i + BATCH_SIZE)
    for (const p of batch) {
      await db.execute({
        sql: `INSERT OR REPLACE INTO products
          (slug, product_name, description, category, image_link, affiliate_link,
           rating, review_count, sort_order)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          p.slug, p.product_name, p.description, p.category,
          p.image_link, p.affiliate_link,
          p.rating ?? null, p.review_count ?? null, p.sort_order ?? 0,
        ],
      })
      count++
    }
    console.log(`  Progress: ${Math.min(i + BATCH_SIZE, products.length)}/${products.length}`)
  }
  console.log(`Seeded ${count} products ✓`)
}

main().catch(console.error)
```

### Migration Script Pattern (Adding Columns)

Turso/libSQL supports `ALTER TABLE ADD COLUMN`. Use `IF NOT EXISTS` for idempotency:

```javascript
import 'dotenv/config'
import { createClient } from '@libsql/client'

const db = createClient({
  url: process.env.TURSO_DB_URL,
  authToken: process.env.TURSO_DB_TOKEN,
})

async function migrate() {
  // Check if column already exists
  const tableInfo = await db.execute('PRAGMA table_info(products)')
  const columns = tableInfo.rows.map(r => r.name)

  if (!columns.includes('amazon_content')) {
    await db.execute(
      'ALTER TABLE products ADD COLUMN amazon_content TEXT DEFAULT \'\''
    )
    console.log('Added amazon_content column ✓')
  } else {
    console.log('Column amazon_content already exists — skipping')
  }
}

migrate().catch(console.error)
```

---

## 10. Embedded Replicas (Local-First Reads)

Embedded Replicas give you a local SQLite file that automatically syncs with your remote Turso database. This provides **zero-latency reads** for high-performance scenarios.

### Setup

```javascript
import { createClient } from '@libsql/client'

const db = createClient({
  // Local file path for the replica (created automatically)
  url: 'file:local-replica.db',

  // Remote Turso URL to sync with
  syncUrl: process.env.TURSO_DB_URL,

  // Auth token for the remote database
  authToken: process.env.TURSO_DB_TOKEN,

  // How often to sync (in seconds). Default is to sync on every write.
  syncInterval: 60,
})

// Explicitly trigger a sync
await db.sync()

// All reads hit the local file (instant)
const rows = await db.execute('SELECT * FROM products')

// Writes go to the remote database and are synced back
await db.execute({
  sql: 'INSERT INTO products (slug, product_name) VALUES (?, ?)',
  args: ['new-product', 'New Product'],
})
```

### Use Cases

- High-read, low-write applications
- Edge functions where cold starts matter
- Offline-capable applications
- Reducing egress costs

---

## 11. Advanced Patterns

### Prepared Statements

Always use parameterized queries (never string interpolation) to prevent SQL injection:

```javascript
// Positional arguments (?)
await db.execute({
  sql: 'SELECT * FROM products WHERE category = ? AND rating >= ?',
  args: ['Kitchen', 4.0],
})

// Multiple ? placeholders
await db.execute({
  sql: 'UPDATE products SET description = ?, updated_at = datetime(\'now\') WHERE slug = ?',
  args: ['New description text', 'product-slug'],
})
```

### Transactions

```javascript
await db.transaction(async (tx) => {
  await tx.execute({
    sql: 'INSERT INTO products (slug, product_name) VALUES (?, ?)',
    args: ['product-a', 'Product A'],
  })

  await tx.execute({
    sql: 'INSERT INTO sync_state (id, last_sync_at) VALUES (1, datetime(\'now\'))',
    args: [],
  })
  // If either fails, both are rolled back
})
```

### Multi-Region / Dual-Database Pattern

For serving different regions with separate databases (e.g., US and India):

```javascript
import { createClient } from '@libsql/client'

function getDb(region = 'US') {
  if (region === 'IN') {
    return createClient({
      url: process.env.TURSO_DB_URL_IN,
      authToken: process.env.TURSO_DB_TOKEN_IN,
    })
  }
  return createClient({
    url: process.env.TURSO_DB_URL,
    authToken: process.env.TURSO_DB_TOKEN,
  })
}

// Usage
const usDb = getDb('US')
const inDb = getDb('IN')

const usProducts = await usDb.execute('SELECT * FROM products')
const inProducts = await inDb.execute('SELECT * FROM products')
```

**Region Detection Priority (serverless):**

1. User cookie override (e.g., `user_region=IN`)
2. Query parameter (e.g., `?region=IN`)
3. GeoIP header (e.g., `x-vercel-ip-country`)
4. Default fallback

### Serverless Proxy Pattern

For Vercel/AWS Lambda, create a proxy endpoint that routes to Turso:

```javascript
// api/turso.js — Vercel Serverless Function
import { createClient } from '@libsql/client'

// Lazy-initialized clients (cached across invocations)
let dbCache = {}

function getDb(region) {
  const key = region || 'US'
  if (dbCache[key]) return dbCache[key]

  const url = key === 'IN'
    ? process.env.TURSO_DB_URL_IN
    : process.env.TURSO_DB_URL
  const token = key === 'IN'
    ? process.env.TURSO_DB_TOKEN_IN
    : process.env.TURSO_DB_TOKEN

  if (!url) throw new Error(`TURSO_DB_URL${key === 'IN' ? '_IN' : ''} not configured`)

  dbCache[key] = createClient({ url, authToken: token || '' })
  return dbCache[key]
}

export default async function handler(req, res) {
  // GET = read-only queries
  if (req.method === 'GET') {
    const sql = req.query.sql
    const region = req.query.region || 'US'

    if (!/^\s*(SELECT|PRAGMA|EXPLAIN|WITH)\b/i.test(sql)) {
      return res.status(400).json({ error: 'Only SELECT queries allowed on GET' })
    }

    try {
      const db = getDb(region)
      const result = await db.execute(sql)
      return res.json({ success: true, rows: result.rows, region })
    } catch (err) {
      return res.status(500).json({ error: err.message })
    }
  }

  // POST = write queries (requires admin auth)
  if (req.method === 'POST') {
    const adminKey = req.headers['x-admin-key']
    const { sql, params, region } = req.body
    const expectedKey = region === 'IN'
      ? process.env.ADMIN_SECRET_IN
      : process.env.ADMIN_SECRET

    if (expectedKey && adminKey !== expectedKey) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    try {
      const db = getDb(region || 'US')
      const result = await db.execute(sql, params || [])
      return res.json({
        success: true,
        changes: result.rowsAffected ?? result.changes ?? 0,
        lastInsertRowid: Number(result.lastInsertRowid) || null,
        region: region || 'US',
      })
    } catch (err) {
      return res.status(500).json({ error: err.message })
    }
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
```

---

## 12. Environment Variables Reference

```bash
# Required
TURSO_DB_URL=libsql://your-db-username.turso.io
TURSO_DB_TOKEN=eyJhbGciOiJIUzI1NiIs...

# Optional — for India region (or any second region)
TURSO_DB_URL_IN=libsql://your-db-in-username.turso.io
TURSO_DB_TOKEN_IN=eyJhbGciOiJIUzI1NiIs...

# Optional — admin write auth for serverless proxy
ADMIN_SECRET=your-shared-admin-secret
ADMIN_SECRET_IN=your-shared-admin-secret-in

# Vite frontend (must start with VITE_)
VITE_ADMIN_SECRET=your-admin-secret-us
VITE_ADMIN_SECRET_IN=your-admin-secret-in
```

### `.env` File Template

```bash
# ── Turso DB (US / Primary) ──
TURSO_DB_URL=libsql://your-db-username.turso.io
TURSO_DB_TOKEN=eyJhbGciOiJIUzI1NiIs...

# ── Turso DB (India / Secondary) ──
TURSO_DB_URL_IN=libsql://your-db-in-username.turso.io
TURSO_DB_TOKEN_IN=eyJhbGciOiJIUzI1NiIs...

# ── Admin Auth ──
ADMIN_SECRET=choose-a-strong-random-secret
ADMIN_SECRET_IN=choose-another-strong-random-secret
VITE_ADMIN_SECRET=choose-a-strong-random-secret
VITE_ADMIN_SECRET_IN=choose-another-strong-random-secret
```

> **Important:** `TURSO_DB_TOKEN` is used server-side only. Never expose it to the browser. In Vite projects, only `VITE_*` variables are available on the frontend.

---

## 13. Troubleshooting

### Common Issues & Fixes

| Problem | Solution |
|---------|----------|
| `TURSO_DB_URL not configured` | Ensure the env var is set. In Vercel, add it in Project Settings → Environment Variables. |
| `BigInt serialization error` | Convert BigInt to Number before `JSON.stringify`: use a custom `JSON.stringify(data, (k, v) => typeof v === 'bigint' ? Number(v) : v)` |
| `connect ECONNREFUSED` | Check your database URL format. It should start with `libsql://`. |
| `Unauthorized` | Regenerate your token: `turso db tokens create my-app-db` |
| `SQLITE_ERROR: no such table` | Run your schema first: `turso db shell my-app-db < schema.sql` |
| `Cannot find module '@libsql/client'` | Make sure to install it: `npm install @libsql/client` |

### Quick Validation Script

```javascript
import 'dotenv/config'
import { createClient } from '@libsql/client'

const db = createClient({
  url: process.env.TURSO_DB_URL,
  authToken: process.env.TURSO_DB_TOKEN || '',
});

(async () => {
  try {
    const result = await db.execute('SELECT 1 as test')
    console.log('✅ Turso connection OK')
    console.log('Result:', result.rows[0].test) // Should print 1
  } catch (err) {
    console.error('❌ Turso connection FAILED:', err.message)
  }
})()
```

---

## Reference: Quick Start (TL;DR)

```bash
# 1. Install CLI
curl -sSfL https://get.turso.tech | bash

# 2. Login & create a database
turso auth login
turso db create my-app-db

# 3. Get credentials
turso db show my-app-db --url       # → copy the URL
turso db tokens create my-app-db    # → copy the token

# 4. Add to .env
echo "TURSO_DB_URL=libsql://my-app-db-username.turso.io" >> .env
echo "TURSO_DB_TOKEN=eyJhbGciOiJIUzI1NiIs..." >> .env

# 5. Install client
npm install @libsql/client

# 6. Apply schema
turso db shell my-app-db < schema.sql

# 7. Query from code
node --input-type=module -e "
import { createClient } from '@libsql/client'
import 'dotenv/config'
const db = createClient({ url: process.env.TURSO_DB_URL, authToken: process.env.TURSO_DB_TOKEN })
const r = await db.execute('SELECT sqlite_version() as v')
console.log('Turso ready ✓ libSQL v' + r.rows[0].v)
"
```

---

---

## 14. Admin CRUD Flow (Create, Read, Update, Delete)

This section documents the admin dashboard pattern used in this project for managing products, blog posts, homepage content, and categories against Turso DB.

### Architecture

```
React Frontend (AdminPage.jsx)
  → ProductForm.jsx / ProductsList.jsx / BlogEditor.jsx / BlogList.jsx
    → adminCrud.js (service layer)
      → POST /api/turso (with x-admin-key header)
        → api/turso.js (Vercel Serverless Function)
          → @libsql/client
            → Turso Cloud (libSQL)
```

### Authentication Flow

1. **Frontend password gate** (`AdminPage.jsx`): User enters the `VITE_ADMIN_SECRET` value. Stored in `sessionStorage` for the session.
2. **Server-side auth**: Every write operation (create/update/delete) sends the secret as the `x-admin-key` HTTP header.
3. **Validation**: The `api/turso.js` serverless function compares `x-admin-key` against the server-side `ADMIN_SECRET` env var. If they don't match, the request is rejected with 401.

```javascript
// .env (frontend-accessible via VITE_ prefix)
VITE_ADMIN_SECRET=your-strong-random-secret

// Vercel project settings (server-side only, for api/turso.js)
ADMIN_SECRET=your-strong-random-secret
```

> ⚠️ The frontend password gate is a UX convenience, **not** security. The real protection is server-side — the `x-admin-key` header is validated on every write.

---

### List Products (Read)

**`ProductsList.jsx` → `adminCrud.js` → `listProducts()` → `tursoQuery()`**

```javascript
// adminCrud.js — List with search, filter, sort
import { ADMIN_SECRET, ADMIN_TIMEOUT_MS, TURSO_API_URL } from '../../config'

async function tursoQuery(sql) {
  const url = `${TURSO_API_URL}?sql=${encodeURIComponent(sql)}`
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), ADMIN_TIMEOUT_MS)

  const res = await fetch(url, { signal: controller.signal })
  clearTimeout(timeoutId)

  const data = await res.json()
  return data.rows || []
}

export async function listProducts({ search = '', category = '', sort = 'product_name', dir = 'asc' } = {}) {
  const conditions = []
  const params = []

  // Build WHERE clause with LIKE for search, exact match for category
  if (search) {
    conditions.push('(product_name LIKE ? OR description LIKE ?)')
    params.push(`%${search}%`, `%${search}%`)
  }
  if (category && category !== 'All') {
    conditions.push('category = ?')
    params.push(category)
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''

  // Validate sort column against allowlist (prevents SQL injection)
  const ALLOWED_SORT = ['product_name', 'category', 'rating', 'review_count', 'sort_order', 'created_at', 'updated_at', 'id', 'slug']
  const safeSort = ALLOWED_SORT.includes(sort) ? sort : 'product_name'
  const safeDir = dir === 'desc' ? 'DESC' : 'ASC'

  const rows = await tursoQuery(`SELECT * FROM products ${where} ORDER BY ${escId(safeSort)} ${safeDir}`)
  return { success: true, products: rows, total: rows.length }
}
```

**Key points:**
- Uses `GET /api/turso?sql=...` (read-only endpoint)
- Sort column validated against an allowlist to prevent SQL injection
- Search uses `LIKE` with `%` wildcards
- Results are cached in `sessionStorage` with a 30-second TTL to avoid re-fetching on tab switches

---

### Create Product

**`ProductForm.jsx` → `adminCrud.js` → `createProduct()` → `tursoWrite()`**

```javascript
// adminCrud.js — Create
async function tursoWrite(sql, params = []) {
  const res = await fetch(TURSO_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-admin-key': ADMIN_SECRET,  // ← server-side auth
    },
    body: JSON.stringify({ sql, params }),
  })
  return await res.json()
}

export async function createProduct(product) {
  const fields = [
    'slug', 'product_name', 'description', 'category',
    'image_link', 'affiliate_link', 'rating', 'review_count', 'sort_order', 'product_details_images',
  ]

  const cols = fields.filter((f) => product[f] !== undefined && product[f] !== null)
  const placeholders = cols.map(() => '?')
  const values = cols.map((f) => product[f])

  const sql = `INSERT INTO products (${cols.map(escId).join(', ')})
               VALUES (${placeholders.join(', ')})`

  const result = await tursoWrite(sql, values)

  return {
    success: true,
    message: 'Product created',
    product: { ...product, id: Number(result.lastInsertRowid) },
  }
}
```

**Key points:**
- Uses `POST /api/turso` (write endpoint)
- Sends `x-admin-key` header with the admin secret
- Uses parameterized queries (`?` placeholders) — safe against SQL injection
- Returns the `lastInsertRowid` from Turso
- After creating, **auto-enrichment** fires: scrapes Amazon for images, descriptions, ratings

---

### Update Product

**`ProductForm.jsx` → `adminCrud.js` → `updateProduct()`**

```javascript
// adminCrud.js — Update (partial, only sends changed fields)
export async function updateProduct(product) {
  const { slug } = product
  if (!slug) return { success: false, error: 'Product slug is required for update' }

  const { clause, values } = buildSetClause({
    product_name: product.product_name,
    description: product.description,
    category: product.category,
    image_link: product.image_link,
    affiliate_link: product.affiliate_link,
    rating: product.rating,
    review_count: product.review_count,
    sort_order: product.sort_order,
    product_details_images: product.product_details_images,
    amazon_content: product.amazon_content,
    updated_at: new Date().toISOString(),
  })

  if (!clause) return { success: false, error: 'No fields to update' }

  values.push(slug)  // ← slug is the last param (WHERE slug = ?)

  const sql = `UPDATE products SET ${clause} WHERE slug = ?`
  await tursoWrite(sql, values)
  return { success: true, message: 'Product updated' }
}

// Helper: builds "col1 = ?, col2 = ?" from an object
function buildSetClause(fields) {
  const entries = Object.entries(fields).filter(([_, v]) => v !== null && v !== undefined)
  const clause = entries.map(([key]) => `"${String(key).replace(/"/g, '""')}" = ?`).join(', ')
  const values = entries.map(([_, v]) => v)
  return { clause, values }
}
```

**Key points:**
- Only sends **non-null fields** — partial updates (no need to send every column)
- Matches by `slug` (unique identifier)
- Sets `updated_at` to the current timestamp
- Uses parameterized queries throughout (`?` placeholders)

---

### Delete Product

**`ProductsList.jsx` → `adminCrud.js` → `deleteProduct()`**

```javascript
// adminCrud.js — Delete
export async function deleteProduct(slug) {
  const sql = `DELETE FROM products WHERE slug = '${safeString(slug)}'`
  const result = await tursoWrite(sql)

  if (Number(result.changes) === 0) {
    return { success: false, error: 'Product not found or already deleted' }
  }
  return { success: true, message: 'Product deleted' }
}

function safeString(val) {
  return String(val).replace(/'/g, "''")
}
```

**In the UI** (`ProductsList.jsx`):
```javascript
const handleDelete = async (product) => {
  // Confirmation dialog
  if (!window.confirm(`Delete "${product.product_name}"? This cannot be undone.`)) return

  setDeleting(product.slug)
  const result = await deleteProduct(product.slug)
  setDeleting(null)

  if (result.success) {
    loadProducts()  // ← refresh the list
  } else {
    alert('Failed to delete product.')
  }
}
```

**Key points:**
- Shows a confirmation dialog before deleting
- Disables the delete button while the request is in progress (prevents double-clicks)
- Refreshes the product list after successful deletion
- Checks `result.changes` to verify the row was actually deleted (0 changes = not found)

---

### Blog Post CRUD

Blog posts follow the same pattern but make direct `fetch()` calls from the component instead of going through a service layer:

**List** (`BlogList.jsx`):
```javascript
const res = await fetch('/api/turso?sql=' + encodeURIComponent(
  'SELECT slug, title, subtitle, category, featured_image, published_at, author, sort_order FROM blog_posts ORDER BY sort_order'
))
const data = await res.json()
```

**Create** (`BlogEditor.jsx`):
```javascript
const sql = `INSERT INTO blog_posts (slug, title, subtitle, category, content, featured_image, author, tags, product_slugs, published_at, sort_order)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
const params = [slug, title, subtitle, category, content, featured_image, author, tags, product_slugs, publishedAt, sortOrder]

await fetch('/api/turso?region=US', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', 'x-admin-key': adminSecret },
  body: JSON.stringify({ sql, params, region: 'US' }),
})
```

**Update** (`BlogEditor.jsx`):
```javascript
const sql = `UPDATE blog_posts SET title = ?, subtitle = ?, category = ?, content = ?,
             featured_image = ?, author = ?, tags = ?, product_slugs = ?,
             published_at = ?, sort_order = ? WHERE slug = ?`
// Send same SQL as create but with WHERE slug = ? at the end
```

**Delete** (`BlogList.jsx`):
```javascript
const sql = `DELETE FROM blog_posts WHERE slug = '${post.slug.replace(/'/g, "''")}'`
await fetch('/api/turso?region=US', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', 'x-admin-key': adminSecret },
  body: JSON.stringify({ sql, params: [], region: 'US' }),
})
```

---

### Homepage Editor

Simpler CRUD — singleton row (id=1):

```javascript
// adminCrud.js — Update homepage hero
export async function updateHomepage(hero) {
  const { clause, values } = buildSetClause({
    title: hero.title,
    subtitle: hero.subtitle,
    image: hero.image,
  })

  const sql = `UPDATE homepage SET ${clause} WHERE id = 1`
  await tursoWrite(sql, values)
  return { success: true, message: 'Homepage updated' }
}
```

---

### Serverless Proxy (Write Handling)

The `api/turso.js` function handles writes with admin key validation:

```javascript
// api/turso.js — POST handler (simplified)
if (req.method === 'POST') {
  const adminKey = req.headers['x-admin-key']
  const expectedKey = region === 'IN'
    ? process.env.ADMIN_SECRET_IN
    : process.env.ADMIN_SECRET

  // Validate admin key
  if (expectedKey && adminKey !== expectedKey) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const { sql, params } = req.body
  const db = getDb(region)
  const result = await db.execute(sql, params || [])

  return res.json({
    success: true,
    changes: result.rowsAffected ?? result.changes ?? 0,
    lastInsertRowid: Number(result.lastInsertRowid) || null,
    region,
  })
}
```

---

### Summary: CRUD Data Flow Table

| Operation | HTTP Method | URL | Auth | Service Function | SQL Pattern |
|-----------|-------------|-----|------|-----------------|-------------|
| **List** | GET | `/api/turso?sql=SELECT...` | None (read-only) | `listProducts()` | `SELECT * FROM products WHERE ... ORDER BY ...` |
| **Read One** | GET | `/api/turso?sql=SELECT...` | None (read-only) | `getProduct(slug)` | `SELECT * FROM products WHERE slug = '...' LIMIT 1` |
| **Create** | POST | `/api/turso` | `x-admin-key` | `createProduct(product)` | `INSERT INTO products (...) VALUES (...)`, returns `lastInsertRowid` |
| **Update** | POST | `/api/turso` | `x-admin-key` | `updateProduct(product)` | `UPDATE products SET ... WHERE slug = ?` |
| **Delete** | POST | `/api/turso` | `x-admin-key` | `deleteProduct(slug)` | `DELETE FROM products WHERE slug = '...'`, checks `changes` count |
| **Create Blog** | POST | `/api/turso` | `x-admin-key` | (inline in BlogEditor) | `INSERT INTO blog_posts (...) VALUES (...)` |
| **Update Blog** | POST | `/api/turso` | `x-admin-key` | (inline in BlogEditor) | `UPDATE blog_posts SET ... WHERE slug = ?` |
| **Delete Blog** | POST | `/api/turso` | `x-admin-key` | (inline in BlogList) | `DELETE FROM blog_posts WHERE slug = '...'` |
| **Update Homepage** | POST | `/api/turso` | `x-admin-key` | `updateHomepage(hero)` | `UPDATE homepage SET ... WHERE id = 1` |

---

## References

- [Turso Documentation](https://docs.turso.tech)
- [@libsql/client on npm](https://www.npmjs.com/package/@libsql/client)
- [libSQL GitHub](https://github.com/tursodatabase/libsql)
- [Embedded Replicas Guide](https://docs.turso.tech/features/embedded-replicas/introduction)
