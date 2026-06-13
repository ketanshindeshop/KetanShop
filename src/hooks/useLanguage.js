// Language is always Marathi. The English ↔ Marathi toggle is removed from the UI,
// but English translation entries are preserved in the translations file for reference.

import { useCallback } from 'react'
import translations from '../translations'

const LANG = 'mr';

export function useLanguage() {
  const t = useCallback(
    (key) => {
      return translations[LANG]?.[key] || translations.en[key] || key
    },
    []
  )

  return { lang: LANG, t }
}
