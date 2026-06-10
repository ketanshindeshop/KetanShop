import React, { useState, useCallback, useEffect, useRef } from 'react'

export default function SearchBar({ search, setSearch, t }) {
  const [localValue, setLocalValue] = useState(search)
  const debounceRef = useRef(null)

  // Sync local value when search prop changes externally
  useEffect(() => {
    setLocalValue(search)
  }, [search])

  // Debounced auto-search
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      if (localValue !== search) {
        setSearch(localValue)
      }
    }, 400)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [localValue])

  const handleClear = useCallback(() => {
    setLocalValue('')
    setSearch('')
  }, [setSearch])

  return (
    <div className="search-bar">
      <div className="search-input-wrapper">
        <svg className="search-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="11" cy="11" r="8" />
          <path d="M21 21l-4.35-4.35" />
        </svg>
        <input
          type="text"
          className="search-input"
          placeholder={t('searchPlaceholder')}
          value={localValue}
          onChange={(e) => setLocalValue(e.target.value)}
        />
        {localValue && (
          <button type="button" className="search-clear" onClick={handleClear}>
            ✕
          </button>
        )}
      </div>
    </div>
  )
}
