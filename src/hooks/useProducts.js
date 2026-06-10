import { useState, useEffect, useCallback } from 'react'

export function useProducts() {
  const [products, setProducts] = useState([])
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Filter state
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('all')
  const [minPrice, setMinPrice] = useState('')
  const [maxPrice, setMaxPrice] = useState('')
  const [sort, setSort] = useState('sort_order')
  const [dir, setDir] = useState('asc')
  const [showOutOfStock, setShowOutOfStock] = useState(true)

  const fetchProducts = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const params = new URLSearchParams()
      if (search) params.set('search', search)
      if (category && category !== 'all') params.set('category', category)
      if (minPrice) params.set('minPrice', minPrice)
      if (maxPrice) params.set('maxPrice', maxPrice)
      if (!showOutOfStock) params.set('show_out_of_stock', 'false')
      params.set('sort', sort)
      params.set('dir', dir)

      const res = await fetch(`/api/products?${params.toString()}`)
      const data = await res.json()

      if (data.success) {
        setProducts(data.products)
        setCategories(data.categories)
      } else {
        setError(data.error)
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [search, category, minPrice, maxPrice, sort, dir, showOutOfStock])

  useEffect(() => {
    fetchProducts()
  }, [fetchProducts])

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
    error,
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
    refetch: fetchProducts,
  }
}
