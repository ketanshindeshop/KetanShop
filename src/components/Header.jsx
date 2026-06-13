import React, { useState, useEffect, useRef } from 'react'
import { useLenis } from './LenisSmoothScroll'
import { CATEGORY_MAP } from '../translations'

export default function Header({ t, onAdminClick, categories, setCategory, minPrice, setMinPrice, maxPrice, setMaxPrice, showOutOfStock, setShowOutOfStock }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [priceOpen, setPriceOpen] = useState(false)
  const touchStartX = useRef(0)
  const menuPanelRef = useRef(null)

  // Helper to clear any inline styles left on the menu panel
  const clearMenuInlineStyles = () => {
    if (menuPanelRef.current) {
      menuPanelRef.current.style.transition = ''
      menuPanelRef.current.style.transform = ''
      menuPanelRef.current.style.opacity = ''
    }
  }

  // Lock body scroll and pause Lenis when mobile menu is open
  useEffect(() => {
    if (menuOpen) {
      document.body.style.overflow = 'hidden'
      lenisRef?.current?.stop()
    } else {
      document.body.style.overflow = ''
      lenisRef?.current?.start()
      clearMenuInlineStyles()
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [menuOpen])

  const lenisRef = useLenis()

  /** Navigate to /home — scroll to top */
  const goHome = () => {
    window.history.pushState({}, '', '/home')
    if (lenisRef?.current) {
      lenisRef.current.scrollTo(0, { immediate: false, duration: 1.2 })
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  /** Navigate to /products — scroll to first row of product catalog */
  const goToProducts = () => {
    window.history.pushState({}, '', '/products')
    requestAnimationFrame(() => {
      const el = document.querySelector('#products-section')
      if (!el) return
      const targetY = el.getBoundingClientRect().top + window.scrollY - 20
      if (lenisRef?.current) {
        lenisRef.current.scrollTo(targetY, { immediate: false, duration: 1.2 })
      } else {
        window.scrollTo({ top: targetY, behavior: 'smooth' })
      }
    })
  }

  /** Navigate to /contact route and scroll to the contact card with the phone number */
  const scrollToFooter = () => {
    window.history.pushState({}, '', '/contact')

    // Wait a frame so any layout settles, then target the contact card
    requestAnimationFrame(() => {
      const card = document.getElementById('contact-card')
      if (!card) {
        // Fallback: scroll to the footer
        const footer = document.getElementById('footer-contact')
        if (!footer) return
        if (lenisRef?.current) {
          lenisRef.current.scrollTo(footer.offsetTop, { immediate: false, duration: 1.5 })
        } else {
          footer.scrollIntoView({ behavior: 'smooth', block: 'start' })
        }
        return
      }
      // Get absolute Y position, subtract sticky header height (80px) for the offset
      const targetY = card.getBoundingClientRect().top + window.scrollY - 80
      if (lenisRef?.current) {
        lenisRef.current.scrollTo(targetY, { immediate: false, duration: 1.5 })
      } else {
        window.scrollTo({ top: targetY, behavior: 'smooth' })
      }
    })
  }

  const closeMenu = () => {
    setMenuOpen(false)
  }

  const toggleMenu = () => {
    // Ensure clean state when opening
    if (!menuOpen) {
      clearMenuInlineStyles()
    }
    setMenuOpen(!menuOpen)
  }

  /* ── Swipe-to-close gesture on the mobile menu panel ── */
  const handleTouchStart = (e) => {
    if (!menuOpen || !menuPanelRef.current) return
    touchStartX.current = e.touches[0].clientX
    // Disable CSS transition so the menu follows the finger immediately
    menuPanelRef.current.style.transition = 'none'
  }

  const handleTouchMove = (e) => {
    if (!menuOpen || !menuPanelRef.current) return
    const deltaX = e.touches[0].clientX - touchStartX.current
    // Only handle leftward swipes
    if (deltaX >= 0) return
    const cappedOffset = Math.max(deltaX, -300)
    // Translate the menu panel to follow the finger
    menuPanelRef.current.style.transform = `translateX(${cappedOffset}px)`
    // Fade opacity proportionally — from 1 to 0.3 as user swipes
    const progress = Math.abs(deltaX) / 300
    menuPanelRef.current.style.opacity = Math.max(0.3, 1 - progress)
  }

  const handleTouchEnd = () => {
    if (!menuPanelRef.current) return
    // Restore the CSS transition for a smooth snap-back or close animation
    menuPanelRef.current.style.transition = ''

    const currentTransform = menuPanelRef.current.style.transform
    const match = currentTransform.match(/translateX\((-?\d+\.?\d*)px\)/)
    const offset = match ? parseFloat(match[1]) : 0

    if (offset < -80) {
      // Swiped far enough — animate the menu off-screen, then close
      menuPanelRef.current.style.transform = 'translateX(-100%)'
      menuPanelRef.current.style.opacity = '0'
      setTimeout(() => closeMenu(), 350)
    } else {
      // Not far enough — snap back to open position
      menuPanelRef.current.style.transform = ''
      menuPanelRef.current.style.opacity = ''
    }
  }

  return (
    <header className="header">
      <div className="container header-inner">
        <div className="brand">
          <a href="/" className="brand-link" onClick={(e) => { e.preventDefault(); window.location.href = '/' }}>
            <img src="/ShriRamTradersLogo.png" alt="Shriram Traders" className="header-logo" />
            <span className="brand-name">{t('brandName')}<span className="brand-name-mr"> | {t('brandNameMr')}</span></span>
          </a>
        </div>

        <nav className="nav-links">
          <a href="#page-top" className="nav-link" onClick={(e) => { e.preventDefault(); goHome(); }}>{t('home')}</a>
          <a href="#products-section" className="nav-link" onClick={(e) => { e.preventDefault(); goToProducts(); }}>{t('products')}</a>
          <a href="#contact-card" className="nav-link" onClick={(e) => { e.preventDefault(); scrollToFooter(); }}>{t('contact')}</a>
        </nav>

        <div className="header-right">
          {/* Contact info — visible on desktop */}
          <div className="header-contact">
            <span className="header-contact-title">{t('contactUs')}</span>
            <div className="header-contact-details">
              <span className="header-contact-item">
                👤 {t('owner')}: <strong>{t('ownerName')}</strong>
              </span>
              <a href="tel:+917387513192" className="header-contact-phone">
                📞 {t('phone')}: <strong>7387513192</strong>
              </a>
            </div>
          </div>

          {onAdminClick && (
            <button className="admin-nav-link" onClick={onAdminClick}>
              🔐 Admin
            </button>
          )}
          {/* Hamburger — visible only on mobile */}
          <button
            className={`hamburger-btn ${menuOpen ? 'open' : ''}`}
            onClick={toggleMenu}
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
      <div
        className={`mobile-menu ${menuOpen ? 'open' : ''}`}
        ref={menuPanelRef}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <div className="mobile-menu-header">
          <a href="/" className="mobile-menu-brand" onClick={(e) => { e.preventDefault(); closeMenu(); setTimeout(goHome, 100); }}>
            {t('brandName')}<span className="brand-name-mr"> | {t('brandNameMr')}</span>
          </a>
          <button className="mobile-menu-close" onClick={closeMenu}>✕</button>
        </div>

        <nav className="mobile-menu-nav">
          <button className="mobile-menu-item" type="button" onClick={() => { closeMenu(); setTimeout(goHome, 100); }}>
            <span className="mobile-menu-icon">🏠</span>
            <span>{t('home')}</span>
          </button>
          <button className="mobile-menu-item" type="button" onClick={() => { closeMenu(); setTimeout(goToProducts, 100); }}>
            <span className="mobile-menu-icon">📦</span>
            <span>{t('products')}</span>
          </button>
          <button className="mobile-menu-item" type="button" onClick={() => { closeMenu(); setTimeout(() => { lenisRef?.current?.start(); scrollToFooter(); }, 100); }}>
            <span className="mobile-menu-icon">📞</span>
            <span>{t('contact')}</span>
          </button>
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
                {CATEGORY_MAP[cat]?.mr || cat}
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

        {/* Out of Stock Toggle */}
        <div className="mobile-menu-section" style={{ borderTop: '1px solid var(--border-light)', padding: '12px 20px' }}>
          <h4 className="mobile-menu-section-title">{t('availability')}</h4>
          <label className="toggle-row">
            <span className="toggle-label">{t('showOutOfStock')}</span>
            <span className={`toggle-switch ${showOutOfStock ? 'on' : 'off'}`}>
              <input
                type="checkbox"
                checked={showOutOfStock}
                onChange={(e) => setShowOutOfStock?.(e.target.checked)}
                className="toggle-input"
              />
              <span className="toggle-slider" />
            </span>
          </label>
        </div>
      </div>
    </header>
  )
}
