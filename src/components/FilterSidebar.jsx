import React, { useState, useEffect, useRef } from 'react'
import { CATEGORY_MAP } from '../translations'

function DebouncedPriceInput({ value, onChange, label, placeholder, currency, id }) {
  const [local, setLocal] = useState(value)
  const debounceRef = useRef(null)

  // Sync when external value changes (e.g. clear filters)
  useEffect(() => {
    setLocal(value)
  }, [value])

  // Debounce
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      if (local !== value) {
        onChange(local)
      }
    }, 500)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [local])

  return (
    <div className="price-input-group">
      <label htmlFor={id}>{label}</label>
      <div className="price-input-wrapper">
        <span className="price-currency">{currency}</span>
        <input
          id={id}
          type="number"
          min="0"
          placeholder={placeholder}
          value={local}
          onChange={(e) => setLocal(e.target.value)}
        />
      </div>
    </div>
  )
}

export default function FilterSidebar({
  lang,
  categories,
  selectedCategory,
  setCategory,
  minPrice,
  setMinPrice,
  maxPrice,
  setMaxPrice,
  showOutOfStock,
  setShowOutOfStock,
  hasActiveFilters,
  clearFilters,
  t,
}) {
  return (
    <div className="filter-sidebar">
      <div className="filter-header">
        <h3 className="filter-title">{t('filters')}</h3>
        {hasActiveFilters && (
          <button className="clear-filters-btn" onClick={clearFilters}>
            {t('clearFilters')}
          </button>
        )}
      </div>

      {/* Category Filter */}
      <div className="filter-section">
        <h4 className="filter-section-title">{t('category')}</h4>
        <div className="category-list">
          <button
            className={`category-item ${selectedCategory === 'all' ? 'active' : ''}`}
            onClick={() => setCategory('all')}
          >
            {t('allCategories')}
          </button>
          {categories.map((cat) => (
            <button
              key={cat}
              className={`category-item ${selectedCategory === cat ? 'active' : ''}`}
              onClick={() => setCategory(cat)}
            >
              {CATEGORY_MAP[cat]?.[lang] || cat}
            </button>
          ))}
        </div>
      </div>

      {/* Price Range Filter */}
      <div className="filter-section">
        <h4 className="filter-section-title">{t('priceRange')}</h4>
        <div className="price-range">
          <DebouncedPriceInput
            id="minPrice"
            label={t('minPrice')}
            placeholder="0"
            currency={t('currency')}
            value={minPrice}
            onChange={setMinPrice}
          />
          <span className="price-separator">—</span>
          <DebouncedPriceInput
            id="maxPrice"
            label={t('maxPrice')}
            placeholder="999"
            currency={t('currency')}
            value={maxPrice}
            onChange={setMaxPrice}
          />
        </div>
      </div>

      {/* Out of Stock Toggle */}
      <div className="filter-section">
        <h4 className="filter-section-title">{t('availability')}</h4>
        <label className="toggle-row">
          <span className="toggle-label">{t('showOutOfStock')}</span>
          <span className={`toggle-switch ${showOutOfStock ? 'on' : 'off'}`}>
            <input
              type="checkbox"
              checked={showOutOfStock}
              onChange={(e) => setShowOutOfStock(e.target.checked)}
              className="toggle-input"
            />
            <span className="toggle-slider" />
          </span>
        </label>
      </div>
    </div>
  )
}
