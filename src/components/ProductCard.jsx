import React, { useState } from 'react'
import { toMarathiNumerals } from '../utils/format'

export default function ProductCard({ product, lang, t }) {
  const [imgError, setImgError] = useState(false)
  const name = lang === 'mr' && product.product_name_m ? product.product_name_m : product.product_name
  const priceDisplay = lang === 'mr' && product.price_m ? product.price_m : product.price

  // Use the API endpoint to fetch image from DB. Falls back gracefully on error.
  // Cache-bust with updated_at so new images show immediately after product updates
  const imageSrc = product.id ? `/api/products/${product.id}/image?v=${encodeURIComponent(product.updated_at || '0')}` : null
  const showImg = !imgError && product.id

  return (
    <div className="product-card">
      <div className="product-image-wrapper">
        <img
          className="product-image"
          src={imageSrc}
          alt={name}
          loading="lazy"
          onError={() => setImgError(true)}
          style={{ display: showImg ? 'block' : 'none' }}
        />
        <div
          className="product-image-placeholder"
          style={{ display: showImg ? 'none' : 'flex' }}
        >
          <span className="product-emoji">🛍️</span>
        </div>
        {product.availability !== 'yes' && (
          <span className="out-of-stock-badge">{t('outOfStock')}</span>
        )}
      </div>

      <div className="product-info">
        <h3 className="product-name">{name}</h3>

        <div className="product-price-row">
          <span className="product-price">
            {t('currency')}{toMarathiNumerals(Number(priceDisplay).toLocaleString('en-IN'), lang)}
          </span>
        </div>

        <div className="product-meta">
          <span className="product-category-tag">{product.category}</span>
          <span className={`stock-badge ${product.availability === 'yes' ? 'in-stock' : 'out-stock'}`}>
            {product.availability === 'yes' ? t('inStock') : t('outOfStock')}
          </span>
        </div>

        <button
          className={`add-to-cart-btn ${product.availability !== 'yes' ? 'disabled' : ''}`}
          disabled={product.availability !== 'yes'}
        >
          {product.availability === 'yes' ? t('addToCart') : t('outOfStock')}
        </button>
      </div>
    </div>
  )
}
