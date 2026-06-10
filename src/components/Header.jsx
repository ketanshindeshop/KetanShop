import React from 'react'

export default function Header({ lang, toggleLang, t, onAdminClick }) {
  return (
    <header className="header">
      <div className="container header-inner">
        <div className="brand">
          <a href="/" className="brand-link" onClick={(e) => { e.preventDefault(); window.location.href = '/' }}>
            <span className="brand-icon">🛒</span>
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
        </div>
      </div>
    </header>
  )
}
