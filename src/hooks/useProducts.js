import { useState, useEffect, useCallback, useRef } from 'react'

const PAGE_LIMIT = 20

/**
 * Convert a base64 string to a Blob URL for instant image rendering.
 * This eliminates the waterfall of individual image HTTP requests.
 */
function base64ToBlobUrl(base64, mimeType) {
  try {
    const byteChars = atob(base64)
    const byteNumbers = new Array(byteChars.length)
    for (let i = 0; i < byteChars.length; i++) {
      byteNumbers[i] = byteChars.charCodeAt(i)
    }
    const byteArray = new Uint8Array(byteNumbers)
    const blob = new Blob([byteArray], { type: mimeType || 'image/webp' })
    return URL.createObjectURL(blob)
  } catch {
    return null
  }
}

/**
 * Preload product images by creating Image objects.
 * Once cached by the browser (7-day Cache-Control), subsequent renders are instant.
 */
function preloadImages(products) {
  for (const product of products) {
    if (!product.id) continue
    const img = new Image()
    img.src = `/api/products/${product.id}/image?v=${encodeURIComponent(product.updated_at || '0')}`
  }
}

export function useProducts() {
  const [products, setProducts] = useState([])
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState(null)
  const [page, setPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [hasMore, setHasMore] = useState(false)    // Generation counter to discard stale loadMore responses after a filter change
  const generationRef = useRef(0)

  // Track blob URLs so we can revoke them on cleanup
  const blobUrlsRef = useRef([])

  // Filter state
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('all')
  const [minPrice, setMinPrice] = useState('')
  const [maxPrice, setMaxPrice] = useState('')
  const [sort, setSort] = useState('sort_order')
  const [dir, setDir] = useState('asc')
  const [showOutOfStock, setShowOutOfStock] = useState(true)

  const buildParams = useCallback((pageNum) => {
    const params = new URLSearchParams()
    if (search) params.set('search', search)
    if (category && category !== 'all') params.set('category', category)
    if (minPrice) params.set('minPrice', minPrice)
    if (maxPrice) params.set('maxPrice', maxPrice)
    if (!showOutOfStock) params.set('show_out_of_stock', 'false')
    params.set('sort', sort)
    params.set('dir', dir)
    params.set('page', String(pageNum))
    params.set('limit', String(PAGE_LIMIT))
    return params
  }, [search, category, minPrice, maxPrice, sort, dir, showOutOfStock])

  // Revoke all tracked blob URLs to prevent memory leaks
  const revokeBlobUrls = useCallback(() => {
    const urls = blobUrlsRef.current
    for (const url of urls) {
      try { URL.revokeObjectURL(url) } catch {}
    }
    blobUrlsRef.current = []
  }, [])

  /**
   * Convert image_data from product list into blob URLs for instant rendering.
   * Returns a copy of the products array with _blobUrl added (image_data removed to
   * keep the state lean).
   */
  const attachBlobUrls = useCallback((products) => {
    const urls = []
    const processed = products.map((p) => {
      if (!p.image_data) return p
      const bUrl = base64ToBlobUrl(p.image_data, p.image_type)
      if (bUrl) urls.push(bUrl)
      const { image_data, image_type, ...rest } = p
      return { ...rest, _blobUrl: bUrl }
    })
    return { processed, urls }
  }, [])

  const fetchProducts = useCallback(async () => {
    generationRef.current += 1
    const gen = generationRef.current
    setLoading(true)
    setLoadingMore(false)
    setError(null)
    setPage(1)

    // Revoke blob URLs from previous fetch
    revokeBlobUrls()

    try {
      const params = buildParams(1)
      const res = await fetch(`/api/products?${params.toString()}`)
      const data = await res.json()

      if (gen !== generationRef.current) return // discard stale response
      if (data.success) {
        // Convert base64 images to blob URLs for instant rendering
        const { processed, urls } = attachBlobUrls(data.products)
        blobUrlsRef.current = urls

        setProducts(processed)
        setCategories(data.categories)
        setTotalCount(data.total || 0)
        setTotalPages(data.totalPages || 1)
        setHasMore(data.hasMore || false)

        // Also preload via the image endpoint for browser cache (subsequent visits)
        preloadImages(data.products)
      } else {
        setError(data.error)
      }
    } catch (err) {
      if (gen === generationRef.current) setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [buildParams, revokeBlobUrls, attachBlobUrls])

  useEffect(() => {
    fetchProducts()
  }, [fetchProducts])

  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore) return

    setLoadingMore(true)
    const gen = generationRef.current
    const nextPage = page + 1

    try {
      const params = buildParams(nextPage)
      const res = await fetch(`/api/products?${params.toString()}`)
      const data = await res.json()

      if (gen !== generationRef.current) return // discard stale response
      if (data.success) {
        // Convert incoming images to blob URLs
        const { processed, urls } = attachBlobUrls(data.products)
        blobUrlsRef.current = [...blobUrlsRef.current, ...urls]

        setProducts((prev) => [...prev, ...processed])
        setTotalCount(data.total || 0)
        setTotalPages(data.totalPages || 1)
        setHasMore(data.hasMore || false)
        setPage(nextPage)
      } else {
        setError(data.error)
      }
    } catch (err) {
      if (gen === generationRef.current) setError(err.message)
    } finally {
      setLoadingMore(false)
    }
  }, [loadingMore, hasMore, page, buildParams, attachBlobUrls])

  const clearFilters = useCallback(() => {
    setSearch('')
    setCategory('all')
    setMinPrice('')
    setMaxPrice('')
    setSort('sort_order')
    setDir('asc')
    setShowOutOfStock(true)
  }, [])

  const handleSortChange = useCallback((value) => {
    switch (value) {
      case 'default':
        setSort('sort_order')
        setDir('asc')
        break
      case 'price-asc':
        setSort('price')
        setDir('asc')
        break
      case 'price-desc':
        setSort('price')
        setDir('desc')
        break
      case 'name':
        setSort('product_name')
        setDir('asc')
        break
      default:
        setSort('sort_order')
        setDir('asc')
    }
  }, [])

  const hasActiveFilters = search || (category && category !== 'all') || minPrice || maxPrice

  return {
    products,
    categories,
    loading,
    loadingMore,
    error,
    totalCount,
    hasMore,
    search,
    setSearch,
    category,
    setCategory,
    minPrice,
    setMinPrice,
    maxPrice,
    setMaxPrice,
    showOutOfStock,
    setShowOutOfStock,
    sort,
    dir,
    setSort,
    setDir,
    handleSortChange,
    clearFilters,
    hasActiveFilters,
    loadMore,
    refetch: fetchProducts,
  }
}
