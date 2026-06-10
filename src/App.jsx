import React, { useState, useEffect } from 'react'
import { useLanguage } from './hooks/useLanguage'
import { useProducts } from './hooks/useProducts'
import Header from './components/Header'
import SearchBar from './components/SearchBar'
import FilterSidebar from './components/FilterSidebar'
import ProductGrid from './components/ProductGrid'
import Footer from './components/Footer'
import AdminPage from './admin/AdminPage'

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
    return <AdminPage onBackToSite={navigateToHome} />
  }

  return <MainShop />
}

function MainShop() {
  const { lang, toggleLang, t } = useLanguage()

  const {
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
    handleSortChange,
    clearFilters,
    hasActiveFilters,
  } = useProducts()

  return (
    <div className="app">
      <Header
        lang={lang}
        toggleLang={toggleLang}
        t={t}
      />

      <main className="main-content">
        <div className="container">

          <SearchBar
            search={search}
            setSearch={setSearch}
            t={t}
          />

          <div className="content-layout">
            <aside className="sidebar">
              <FilterSidebar
                categories={categories}
                selectedCategory={category}
                setCategory={setCategory}
                minPrice={minPrice}
                setMinPrice={setMinPrice}
                maxPrice={maxPrice}
                setMaxPrice={setMaxPrice}
                hasActiveFilters={hasActiveFilters}
                clearFilters={clearFilters}
                t={t}
              />
            </aside>

            <section className="products-section">
              <ProductGrid
                products={products}
                loading={loading}
                error={error}
                lang={lang}
                t={t}
                handleSortChange={handleSortChange}
                hasActiveFilters={hasActiveFilters}
              />
            </section>
          </div>
        </div>
      </main>

      <Footer t={t} />
    </div>
  )
}
