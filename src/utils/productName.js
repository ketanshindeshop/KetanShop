/**
 * Cleans a product name by stripping parenthetical English text
 * that shouldn't be transliterated.
 *
 * E.g., "Turmeric Powder (Haldi Powder)"  → "Turmeric Powder"
 *        "Shengadanyachi Chikki"           → "Shengadanyachi Chikki"
 *        "Organic Gud (Jaggery)"           → "Organic Gud"
 */
export function cleanProductName(name) {
  if (!name) return '';
  // Remove anything in parentheses (including the parentheses themselves)
  let cleaned = name.replace(/\s*\([^)]*\)/g, '').trim();
  // Clean up double spaces
  cleaned = cleaned.replace(/\s+/g, ' ').trim();
  return cleaned;
}


