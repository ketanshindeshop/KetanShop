import React, { useState, useEffect, lazy, Suspense } from 'react'
import { useLanguage } from './hooks/useLanguage'
import { useProducts } from './hooks/useProducts'
import LenisSmoothScroll from './components/LenisSmoothScroll'
import Header from './components/Header'
import SearchBar from './components/SearchBar'
import FilterSidebar from './components/FilterSidebar'
import ProductGrid from './components/ProductGrid'
import Footer from './components/Footer'

const AdminPage = lazy(() => import('./admin/AdminPage'))

export default function App() {
  const [isAdmin, setIsAdmin] = useState(() => window.location.pathname.startsWith('/admin'))

  useEffect(() => {
    const handlePopState = () => {
      setIsAdmin(window.location.pathname.startsWith('/admin'))
    }
    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [])

  const navigateToAdmin = () => {
    window.history.pushState({}, '', '/admin')
    setIsAdmin(true)
  }

  const navigateToHome = () => {
    window.history.pushState({}, '', '/')
    setIsAdmin(false)
  }

  if (isAdmin) {
    return (
      <Suspense fallback={
        <div className="admin-loading" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
          <div className="loading-spinner" />
          <p>Loading admin panel...</p>
        </div>
      }>
        <AdminPage onBackToSite={navigateToHome} />
      </Suspense>
    )
  }

  return <MainShop />
}

function MainShop() {
  const { lang, toggleLang, t } = useLanguage()

  const {
    products,
    categories,
    loading,
    loadingMore,
    error,
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
    handleSortChange,
    clearFilters,
    hasActiveFilters,
    loadMore,
  } = useProducts()

  return (
    <LenisSmoothScroll>
    <div className="app">
      <Header
        lang={lang}
        toggleLang={toggleLang}
        t={t}
        categories={categories}
        setCategory={setCategory}
        minPrice={minPrice}
        setMinPrice={setMinPrice}
        maxPrice={maxPrice}
        setMaxPrice={setMaxPrice}
        showOutOfStock={showOutOfStock}
        setShowOutOfStock={setShowOutOfStock}
      />

      <main className="main-content">
        <div className="container">

          <SearchBar
            search={search}
            setSearch={setSearch}
            t={t}
          />

          {/* Mobile-visible clear filters bar */}
          {hasActiveFilters && (
            <div className="clear-filters-bar">
              <span className="clear-filters-bar-label">{t('filtersApplied')}</span>
              <button className="clear-filters-bar-btn" onClick={clearFilters}>
                ✕ {t('clearFilters')}
              </button>
            </div>
          )}

          <div className="content-layout">
            <aside className="sidebar">
              <FilterSidebar
                lang={lang}
                categories={categories}
                selectedCategory={category}
                setCategory={setCategory}
                minPrice={minPrice}
                setMinPrice={setMinPrice}
                maxPrice={maxPrice}
                setMaxPrice={setMaxPrice}
                showOutOfStock={showOutOfStock}
                setShowOutOfStock={setShowOutOfStock}
                hasActiveFilters={hasActiveFilters}
                clearFilters={clearFilters}
                t={t}
              />
            </aside>

            <section className="products-section">
              <ProductGrid
                products={products}
                loading={loading}
                loadingMore={loadingMore}
                error={error}
                hasMore={hasMore}
                lang={lang}
                t={t}
                handleSortChange={handleSortChange}
                hasActiveFilters={hasActiveFilters}
                loadMore={loadMore}
              />
            </section>
          </div>
        </div>
      </main>

      <Footer t={t} />
    </div>
    </LenisSmoothScroll>
  )
}
