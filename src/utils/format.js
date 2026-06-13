/**
 * Format bytes into a human-readable string (e.g., 13.2 KB, 1.5 MB).
 */
export function formatBytes(bytes) {
  if (bytes == null || bytes === 0) return '—'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

/**
 * Converts English digits (0-9) to Marathi numerals (०-९).
 * Only converts when lang is 'mr' (Marathi).
 * Preserves all non-digit characters like commas, dots, currency symbols, etc.
 *
 * Examples:
 *   toMarathiNumerals('₹1,23,456', 'mr') → '₹१,२३,४५६'
 *   toMarathiNumerals('5', 'mr')          → '५'
 *   toMarathiNumerals('5', 'en')          → '5'
 */
const MARATHI_DIGITS = ['०', '१', '२', '३', '४', '५', '६', '७', '८', '९']

export function toMarathiNumerals(str, lang) {
  if (str == null) return str
  if (lang !== 'mr') return String(str)
  return String(str).replace(/\d/g, (digit) => MARATHI_DIGITS[parseInt(digit, 10)])
}
