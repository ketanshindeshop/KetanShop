import { useState, useCallback } from 'react'
import translations from '../translations'

function getSavedLang() {
  try {
    return localStorage.getItem('lang') || 'en'
  } catch {
    return 'en'
  }
}

function saveLang(lang) {
  try {
    localStorage.setItem('lang', lang)
  } catch {
    // localStorage unavailable (private browsing, etc.)
  }
}

export function useLanguage() {
  const [lang, setLang] = useState(getSavedLang)

  const toggleLang = useCallback(() => {
    setLang((prev) => {
      const next = prev === 'en' ? 'mr' : 'en'
      saveLang(next)
      return next
    })
  }, [])

  const t = useCallback(
    (key) => {
      return translations[lang]?.[key] || translations.en[key] || key
    },
    [lang]
  )

  return { lang, toggleLang, t }
}
