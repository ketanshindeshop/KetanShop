import React from 'react'

export default function Footer({ t }) {
  return (
    <footer className="footer" id="footer-contact">
      <div className="container footer-inner">
        <div className="footer-brand">
          <span className="footer-logo">🛒 {t('brandName')}</span>
          <p className="footer-tagline">{t('footerTagline')}</p>
        </div>

        <div className="footer-links">
          <div className="footer-col">
            <h4>{t('quickLinks')}</h4>
            <a href="/">{t('home')}</a>
            <a href="/">{t('products')}</a>
          </div>
          <div className="footer-col">
            <h4>{t('contactUs')}</h4>
            <p className="footer-owner"><strong>{t('owner')}:</strong> {t('ownerName')}</p>
            <p className="footer-phone">
              <strong>{t('phone')}:</strong>{' '}
              <a href="tel:+917387513192">7387513192</a>
            </p>
          </div>
        </div>

        <div className="footer-bottom">
          <p>&copy; {new Date().getFullYear()} {t('brandName')}. {t('allRightsReserved')}</p>
        </div>
      </div>
    </footer>
  )
}
