import React, { useState, useEffect, lazy, Suspense, useCallback } from 'react'
import { useLanguage } from './hooks/useLanguage'
import { useProducts } from './hooks/useProducts'
import LenisSmoothScroll, { useLenis } from './components/LenisSmoothScroll'
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
  const { lang, t } = useLanguage()
  const lenisRef = useLenis()

  /** Scroll to an element by selector, using Lenis when available */
  const scrollToElement = useCallback((selector, offset = 0) => {
    requestAnimationFrame(() => {
      const el = document.querySelector(selector)
      if (!el) return
      const targetY = el.getBoundingClientRect().top + window.scrollY - offset
      if (lenisRef?.current) {
        lenisRef.current.scrollTo(targetY, { immediate: false, duration: 1.5 })
      } else {
        window.scrollTo({ top: targetY, behavior: 'smooth' })
      }
    })
  }, [lenisRef])

  // Handle SPA routes — /home, /products, /contact
  useEffect(() => {
    const path = window.location.pathname
    if (path === '/home') {
      if (lenisRef?.current) {
        lenisRef.current.scrollTo(0, { immediate: false, duration: 1.2 })
      } else {
        window.scrollTo({ top: 0, behavior: 'smooth' })
      }
    } else if (path === '/products') {
      scrollToElement('#products-section', 20)
    } else if (path === '/contact') {
      scrollToElement('#contact-card', 80)
    }
  }, [])

  // Listen for popstate to handle route changes on back/forward
  useEffect(() => {
    const handleRouteChange = () => {
      const path = window.location.pathname
      if (path === '/home') {
        if (lenisRef?.current) {
          lenisRef.current.scrollTo(0, { immediate: false, duration: 1.2 })
        } else {
          window.scrollTo({ top: 0, behavior: 'smooth' })
        }
      } else if (path === '/products') {
        scrollToElement('#products-section', 20)
      } else if (path === '/contact') {
        scrollToElement('#contact-card', 80)
      }
    }
    window.addEventListener('popstate', handleRouteChange)
    return () => window.removeEventListener('popstate', handleRouteChange)
  }, [scrollToElement, lenisRef])

  const {
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
    handleSortChange,
    clearFilters,
    hasActiveFilters,
    loadMore,
  } = useProducts()

  return (
    <LenisSmoothScroll>
    <div className="app" id="page-top">
      <Header
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

            <section className="products-section" id="products-section">
              <ProductGrid
                products={products}
                loading={loading}
                loadingMore={loadingMore}
                error={error}
                totalCount={totalCount}
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
