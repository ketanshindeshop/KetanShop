import React from 'react'
import ProductCard from './ProductCard'

export default function ProductGrid({
  products,
  loading,
  error,
  lang,
  t,
  handleSortChange,
  hasActiveFilters,
}) {
  if (loading) {
    return (
      <div className="products-status">
        <div className="loading-spinner" />
        <p>Loading products...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="products-status error">
        <p>❌ {error}</p>
      </div>
    )
  }

  return (
    <>
      <div className="products-toolbar">
        <p className="products-count">
          <strong>{products.length}</strong> {t('productsFound')}
        </p>
        <div className="sort-control">
          <label htmlFor="sort">{t('sortBy')}:</label>
          <select
            id="sort"
            className="sort-select"
            onChange={(e) => handleSortChange(e.target.value)}
          >
            <option value="default">{t('sortDefault')}</option>
            <option value="price-asc">{t('sortPriceLow')}</option>
            <option value="price-desc">{t('sortPriceHigh')}</option>
            <option value="name">{t('sortName')}</option>
          </select>
        </div>
      </div>

      {products.length === 0 ? (
        <div className="products-status empty">
          <span className="empty-icon">🔍</span>
          <p>{t('noProducts')}</p>
        </div>
      ) : (
        <div className="product-grid">
          {products.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              lang={lang}
              t={t}
            />
          ))}
        </div>
      )}
    </>
  )
}
