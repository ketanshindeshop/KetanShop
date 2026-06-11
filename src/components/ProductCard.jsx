import React, { memo, useState } from 'react'
import { toMarathiNumerals } from '../utils/format'
import { toMarathi } from '../utils/transliterate'

const ProductCard = memo(function ProductCard({ product, lang, t }) {
  const [imgError, setImgError] = useState(false)
  // Prefer the database-stored Marathi name; fall back to client-side transliteration
  const name = lang === 'mr' && product.product_name_mr
    ? product.product_name_mr
    : toMarathi(product.product_name, lang)

  // Use inline data URI from the API response for instant image rendering.
  // Images are embedded directly in the products list JSON — zero additional HTTP requests.
  // Falls back to the separate endpoint only when inline data isn't available.
  const dataUri = product.image_data
    ? `data:${product.image_type || 'image/webp'};base64,${product.image_data}`
    : null
  const fallbackSrc = product.id && !dataUri
    ? `/api/products/${product.id}/image?v=${encodeURIComponent(product.updated_at || '0')}`
    : null
  const imageSrc = dataUri || fallbackSrc
  const showImg = !imgError && !!imageSrc

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
