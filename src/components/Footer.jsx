import React from 'react'

export default function Footer({ t }) {
  return (
    <footer className="footer" id="footer-contact">
      <div className="footer-brand-section">
        <div className="container">
          <div className="footer-brand-section-inner">
            <img src="/ShriRamTradersLogo.png" alt="Shriram Traders" className="footer-logo-img" />
            <span className="footer-logo-text">{t('brandName')}</span>
          </div>
          <p className="footer-tagline">{t('footerTagline')}</p>
        </div>
      </div>

      <div className="container">
        <div className="footer-grid">
          <div className="footer-card">
            <h4 className="footer-card-title">{t('quickLinks')}</h4>
            <div className="footer-card-links">
              <a href="/">{t('home')}</a>
              <a href="/">{t('products')}</a>
            </div>
          </div>

          <div className="footer-card">
            <h4 className="footer-card-title">{t('contactUs')}</h4>
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
          <p>&copy; {new Date().getFullYear()} {t('brandName')}. {t('allRightsReserved')}</p>
        </div>
      </div>
    </footer>
  )
}
