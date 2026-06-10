import React, { useState } from 'react'

export default function Header({ lang, toggleLang, t, onAdminClick, categories, setCategory, minPrice, setMinPrice, maxPrice, setMaxPrice }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [priceOpen, setPriceOpen] = useState(false)

  const closeMenu = () => setMenuOpen(false)

  return (
    <header className="header">
      <div className="container header-inner">
        <div className="brand">
          <a href="/" className="brand-link" onClick={(e) => { e.preventDefault(); window.location.href = '/' }}>
            <img src="/ShriRamTradersLogo.png" alt="Shriram Traders" className="header-logo" />
            <span className="brand-name">{t('brandName')}</span>
          </a>
        </div>

        <nav className="nav-links">
          <button className="nav-link active">{t('home')}</button>
          <button className="nav-link">{t('products')}</button>
          <button className="nav-link" onClick={() => document.getElementById('footer-contact')?.scrollIntoView({ behavior: 'smooth' })}>{t('contact')}</button>
        </nav>

        <div className="header-right">
          {onAdminClick && (
            <button className="admin-nav-link" onClick={onAdminClick}>
              🔐 Admin
            </button>
          )}
          <button
            className="lang-toggle"
            onClick={toggleLang}
            title={t('language')}
            aria-label={t('language')}
          >
            <span className={`lang-option ${lang === 'en' ? 'active' : ''}`}>EN</span>
            <span className="lang-divider">|</span>
            <span className={`lang-option ${lang === 'mr' ? 'active' : ''}`}>मराठी</span>
          </button>
          {/* Hamburger — visible only on mobile */}
          <button
            className={`hamburger-btn ${menuOpen ? 'open' : ''}`}
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="Toggle navigation menu"
          >
            <span className="hamburger-line" />
            <span className="hamburger-line" />
            <span className="hamburger-line" />
          </button>
        </div>
      </div>

      {/* Mobile menu overlay */}
      <div className={`mobile-menu-overlay ${menuOpen ? 'visible' : ''}`} onClick={closeMenu} />
      <div className={`mobile-menu ${menuOpen ? 'open' : ''}`}>
        <div className="mobile-menu-header">
          <span className="mobile-menu-title">{t('home')}</span>
          <button className="mobile-menu-close" onClick={closeMenu}>✕</button>
        </div>

        <nav className="mobile-menu-nav">
          <a href="/" className="mobile-menu-item" onClick={closeMenu}>
            <span className="mobile-menu-icon">🏠</span>
            <span>{t('home')}</span>
          </a>
          <a href="/#products" className="mobile-menu-item" onClick={closeMenu}>
            <span className="mobile-menu-icon">📦</span>
            <span>{t('products')}</span>
          </a>
          <a href="#footer-contact" className="mobile-menu-item" onClick={(e) => { e.preventDefault(); closeMenu(); setTimeout(() => document.getElementById('footer-contact')?.scrollIntoView({ behavior: 'smooth' }), 200) }}>
            <span className="mobile-menu-icon">📞</span>
            <span>{t('contact')}</span>
          </a>
        </nav>

        <div className="mobile-menu-categories">
          <h4 className="mobile-menu-section-title">{t('category')}</h4>
          <div className="mobile-menu-cat-list">
            {(categories || []).map((cat) => (
              <button
                key={cat}
                className="mobile-menu-cat-item"
                onClick={() => { setCategory?.(cat); closeMenu(); }}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Collapsible Price Range */}
        <div className="mobile-menu-price">
          <button
            className="mobile-menu-price-toggle"
            onClick={() => setPriceOpen(!priceOpen)}
          >
            <span>{t('priceRange')}</span>
            <span className={`mobile-menu-chevron ${priceOpen ? 'open' : ''}`}>▾</span>
          </button>
          <div className={`mobile-menu-price-body ${priceOpen ? 'open' : ''}`}>
            <div className="mobile-menu-price-inputs">
              <div className="mobile-menu-price-group">
                <label htmlFor="mobile-min-price">{t('minPrice')}</label>
                <div className="mobile-menu-price-wrapper">
                  <span className="mobile-menu-price-currency">{t('currency')}</span>
                  <input
                    id="mobile-min-price"
                    type="number"
                    min="0"
                    placeholder="0"
                    value={minPrice}
                    onChange={(e) => setMinPrice?.(e.target.value)}
                  />
                </div>
              </div>
              <span className="mobile-menu-price-sep">—</span>
              <div className="mobile-menu-price-group">
                <label htmlFor="mobile-max-price">{t('maxPrice')}</label>
                <div className="mobile-menu-price-wrapper">
                  <span className="mobile-menu-price-currency">{t('currency')}</span>
                  <input
                    id="mobile-max-price"
                    type="number"
                    min="0"
                    placeholder="999"
                    value={maxPrice}
                    onChange={(e) => setMaxPrice?.(e.target.value)}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  )
}
