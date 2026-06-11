import React, { memo, useState } from 'react'
import { toMarathiNumerals } from '../utils/format'
import { toMarathi } from '../utils/transliterate'

const ProductCard = memo(function ProductCard({ product, lang, t }) {
  const [imgLoaded, setImgLoaded] = useState(false)
  const [imgError, setImgError] = useState(false)

  // Prefer the database-stored Marathi name; fall back to client-side transliteration
  const name = lang === 'mr' && product.product_name_mr
    ? product.product_name_mr
    : toMarathi(product.product_name, lang)

  // Serve images via the dedicated endpoint with cache-busting via updated_at.
  // Images are cached by the browser for 7 days (Cache-Control on the endpoint).
  const imageSrc = product.id
    ? `/api/products/${product.id}/image?v=${encodeURIComponent(product.updated_at || '0')}`
    : null

  const availabilityClass =
    product.availability === 'yes' ? 'in-stock' :
    product.availability === 'no' ? 'out-stock' :
    'disabled'

  const availabilityLabel =
    product.availability === 'yes' ? t('inStock') :
    product.availability === 'no' ? t('outOfStock') :
    'Disabled'

  return (
    <div className="product-card">
      <div className="product-image-wrapper">
        {imageSrc && !imgError && (
          <img
            className="product-image"
            src={imageSrc}
            alt={name}
            onLoad={() => setImgLoaded(true)}
            onError={() => setImgError(true)}
          />
        )}
        <div
          className="product-image-placeholder"
          style={{ opacity: imgLoaded ? 0 : 1 }}
        >
          <span className="product-emoji">🛍️</span>
        </div>
        {product.availability === 'no' && (
          <span className="out-of-stock-badge">{t('outOfStock')}</span>
        )}
      </div>

      <div className="product-info">
        <h3 className="product-name">{name}</h3>

        <div className="product-price-row">
          <span className="product-price">
            {t('currency')}{toMarathiNumerals(Number(product.price).toLocaleString('en-IN'), lang)}
          </span>
        </div>

        <span className={`stock-badge ${availabilityClass}`}>
          {availabilityLabel}
        </span>

      </div>
    </div>
  )
})

export default ProductCard
