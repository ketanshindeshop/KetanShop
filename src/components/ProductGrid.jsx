import React, { useRef, useEffect } from 'react'
import ProductCard from './ProductCard'
import { toMarathiNumerals } from '../utils/format'

const SKELETON_COUNT = 8

function SkeletonCard() {
  return (
    <div className="skeleton-card">
      <div className="skeleton-image" />
      <div className="skeleton-body">
        <div className="skeleton-line medium" />
        <div className="skeleton-line short" />
        <div className="skeleton-line price" />
        <div className="skeleton-line badge" />
      </div>
    </div>
  )
}

/** Prefetch a list of image URLs by injecting <link rel="prefetch"> tags into the document head */
function prefetchImages(products) {
  if (!products || products.length === 0) return
  const fragment = document.createDocumentFragment()
  products.forEach((product) => {
    if (!product.id) return
    const link = document.createElement('link')
    link.rel = 'preload'
    link.as = 'image'
    link.href = `/api/products/${product.id}/image?v=${encodeURIComponent(product.updated_at || '0')}`
    fragment.appendChild(link)
    // The links will be cleaned up after they load or after a timeout
    setTimeout(() => { if (link.parentNode) link.parentNode.removeChild(link) }, 5000)
  })
  document.head.appendChild(fragment)
}

export default function ProductGrid({
  products,
  loading,
  loadingMore,
  error,
  hasMore,
  lang,
  t,
  handleSortChange,
  hasActiveFilters,
  loadMore,
}) {
  const sentinelRef = useRef(null)
  const prevProductCount = useRef(0)

  // When new products arrive, prefetch their images immediately
  useEffect(() => {
    if (products.length > prevProductCount.current) {
      const newProducts = products.slice(prevProductCount.current)
      prefetchImages(newProducts)
    }
    prevProductCount.current = products.length
  }, [products])

  // IntersectionObserver for infinite scroll — triggers loadMore when sentinel is visible
  useEffect(() => {
    const sentinel = sentinelRef.current
    if (!sentinel || !hasMore || loadingMore) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && hasMore && !loadingMore) {
          loadMore()
        }
      },
      { rootMargin: '200px' } // trigger 200px before the sentinel is visible
    )

    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [hasMore, loadingMore, loadMore])

  if (loading && products.length === 0) {
    return (
      <div className="products-toolbar" style={{ border: 'none' }}>
        <div className="skeleton-grid">
          {Array.from({ length: SKELETON_COUNT }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
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
          <strong>{toMarathiNumerals(products.length, lang)}</strong> {t('productsFound')}
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
        <>
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

          {/* Loading more skeleton grid */}
          {loadingMore && (
            <div className="skeleton-grid" style={{ marginTop: '20px' }}>
              {Array.from({ length: 4 }).map((_, i) => (
                <SkeletonCard key={`loading-${i}`} />
              ))}
            </div>
          )}

          {/* Sentinel element for infinite scroll */}
          {hasMore && !loadingMore && (
            <div ref={sentinelRef} className="products-status" style={{ padding: '10px' }}>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                Scroll for more
              </p>
            </div>
          )}
        </>
      )}
    </>
  )
}
