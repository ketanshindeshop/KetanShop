import { useState, useEffect, useCallback, useRef } from 'react'

const PAGE_LIMIT = 20

export function useProducts() {
  const [products, setProducts] = useState([])
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState(null)
  const [page, setPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [hasMore, setHasMore] = useState(false)

  // Generation counter to discard stale loadMore responses after a filter change
  const generationRef = useRef(0)

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

  const fetchProducts = useCallback(async () => {
    generationRef.current += 1
    const gen = generationRef.current
    setLoading(true)
    setLoadingMore(false)
    setError(null)
    setPage(1)

    try {
      const params = buildParams(1)
      const res = await fetch(`/api/products?${params.toString()}`)
      const data = await res.json()

      if (gen !== generationRef.current) return // discard stale response
      if (data.success) {
        setProducts(data.products)
        setCategories(data.categories)
        setTotalCount(data.total || 0)
        setTotalPages(data.totalPages || 1)
        setHasMore(data.hasMore || false)
      } else {
        setError(data.error)
      }
    } catch (err) {
      if (gen === generationRef.current) setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [buildParams])

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
        setProducts((prev) => [...prev, ...data.products])
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
  }, [loadingMore, hasMore, page, buildParams])

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
