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
