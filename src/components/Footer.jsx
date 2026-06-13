import React from 'react'

export default function Footer({ t }) {
  return (
    <footer className="footer" id="footer-contact">
      <div className="footer-brand-section">
        <div className="container">
          <div className="footer-brand-section-inner">
            <img src="/ShriRamTradersLogo.png" alt="Shriram Traders" className="footer-logo-img" />
            <span className="footer-logo-text">{t('brandName')}<span className="footer-logo-text-mr"> | {t('brandNameMr')}</span></span>
          </div>
          <p className="footer-tagline">{t('footerTagline')}</p>
        </div>
      </div>

      <div className="container">
        <div className="footer-grid">
          <div className="footer-card">
            <h4 className="footer-card-title">{t('quickLinks')}</h4>
            <div className="footer-card-links">
              <a href="#page-top" onClick={(e) => { e.preventDefault(); window.history.pushState({}, '', '/home'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}>{t('home')}</a>
              <a href="#products-section" onClick={(e) => { e.preventDefault(); window.history.pushState({}, '', '/products'); const target = document.getElementById('products-section'); if (target) { const y = target.getBoundingClientRect().top + window.scrollY - 20; window.scrollTo({ top: y, behavior: 'smooth' }); } }}>{t('products')}</a>
            </div>
          </div>

          <div className="footer-card" id="contact-card">
            <a
              href="#contact-card"
              className="footer-card-title"
              style={{ display: 'block', cursor: 'pointer', textDecoration: 'none', textTransform: 'uppercase', letterSpacing: '0.5px', fontSize: '0.8rem', fontWeight: '700', color: 'var(--text-muted)', marginBottom: '12px' }}
              onClick={(e) => {
                e.preventDefault()
                window.history.pushState({}, '', '/contact')
                const card = document.getElementById('contact-card')
                if (card) {
                  const targetY = card.getBoundingClientRect().top + window.scrollY - 80
                  window.scrollTo({ top: targetY, behavior: 'smooth' })
                }
              }}
            >
              {t('contactUs')}
            </a>
            <div className="footer-contact-info">
              <div className="footer-contact-row">
                <span className="footer-contact-icon">👤</span>
                <div>
                  <span className="footer-contact-label">{t('owner')}</span>
                  <span className="footer-contact-value">{t('ownerName')}</span>
                </div>
              </div>
              <a href="tel:+917387513192" className="footer-phone-link">
                <span className="footer-contact-icon">📞</span>
                <div>
                  <span className="footer-contact-label">{t('phone')}</span>
                  <span className="footer-contact-value footer-phone-number">7387513192</span>
                </div>
              </a>
            </div>
          </div>
        </div>
      </div>

      <div className="footer-bottom">
        <div className="container">
          <p>&copy; {new Date().getFullYear()} {t('brandName')} | {t('brandNameMr')}. {t('allRightsReserved')}</p>
          <p className="footer-credit">
            Developed by{' '}
            <a href="https://growthpulseapp.vercel.app/" target="_blank" rel="noopener noreferrer">
              GrowthPulse
            </a>
          </p>
        </div>
      </div>
    </footer>
  )
}
