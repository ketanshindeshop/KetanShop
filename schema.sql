CREATE TABLE IF NOT EXISTS products (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    product_name    TEXT    NOT NULL,
    product_name_mr TEXT    DEFAULT '',
    price           REAL    NOT NULL DEFAULT 0,
    image_path      TEXT    DEFAULT '',
    image_data      TEXT    DEFAULT NULL,
    image_type      TEXT    DEFAULT NULL,
    category        TEXT    DEFAULT 'Groceries',
    availability    TEXT    DEFAULT 'yes',
    sort_order      INTEGER DEFAULT 0,
    created_at      TEXT    DEFAULT (datetime('now')),
    updated_at      TEXT    DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
CREATE INDEX IF NOT EXISTS idx_products_availability ON products(availability);
