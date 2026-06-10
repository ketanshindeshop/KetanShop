/**
 * Transliterates English text to Marathi (Devanagari) script.
 *
 * Strategy:
 *   1. Check the full input against a lookup table (WORD_MAP) for known words/phrases.
 *   2. For unknown words, use a rule-based character-by-character transliterator.
 *   3. The rule-based engine now handles anusvara (ं) when 'n' or 'm' precedes
 *      a consonant, and supports all standard Marathi character mappings.
 *
 * Examples:
 *   toMarathi('Shengadanyachi Chikki', 'mr') → 'शेंगदाण्याची चिक्की'
 *   toMarathi('Pune', 'mr')                  → 'पुणे'
 *   toMarathi('Pune', 'en')                  → 'Pune'  (no conversion)
 */

// ═══════════════════════════════════════════════════════════════════════
//  Known word / phrase look-up table (trained from the guide)
// ═══════════════════════════════════════════════════════════════════════

const WORD_MAP = {

  // ── Existing product translations ──────────────────────────────────
  'shengadanyachi chikki':         'शेंगदाण्याची चिक्की',
  'kashmiri garlic black':         'काश्मिरी काळा लसूण',
  'organic gud':                   'सेंद्रिय गूळ',
  'organic gud jaggery':           'सेंद्रिय गूळ',
  'pure haldi powder':             'शुद्ध हळद पूड',
  'premium basmati rice':          'प्रीमियम बासमती तांदूळ',
  'mango pickle aam ka achar':     'आंब्याचे लोणचे',
  'aam ka achar':                  'आंब्याचे लोणचे',
  'aam':                          'आम',

  // ── Common product-level words ─────────────────────────────────────
  'chikki':    'चिक्की',
  'ladoo':     'लाडू',
  'masala':    'मसाला',
  'basmati':   'बासमती',
  'rice':      'तांदूळ',
  'dal':       'डाळ',
  'flour':     'पीठ',
  'powder':    'पूड',
  'spice':     'मसाला',
  'pickle':    'लोणचे',
  'chutney':   'चटणी',
  'mango':     'आंबा',
  'garlic':    'लसूण',
  'haldi':     'हळद',
  'gud':       'गूळ',
  'jaggery':   'गूळ',
  'tea':       'चहा',
  'coffee':    'कॉफी',
  'sweet':     'गोड',
  'snacks':    'स्नॅक्स',
  'black':     'काळा',
  'kashmiri':  'काश्मिरी',
  'organic':   'सेंद्रिय',
  'pure':      'शुद्ध',
  'premium':   'प्रीमियम',
  'achaar':    'आचार',
  'fresh':     'ताजे',
  'ghee':      'तूप',
  'sugar':     'साखर',
  'salt':      'मीठ',
  'oil':       'तेल',
  'milk':      'दूध',
  'spices':    'मसाले',

  // ── Category names ─────────────────────────────────────────────────
  'grains & rice':          'धान्य व तांदूळ',
  'sweets & snacks':        'गोडे व स्नॅक्स',
  'pickles & chutneys':     'लोणची व चटण्या',
  'groceries':              'किराणा',
  'grains':                 'धान्य',
  'sweets':                 'गोडे',
  'pickles':                'लोणची',
  'chutneys':               'चटण्या',

  // ── Training guide: common words ───────────────────────────────────
  'aai':         'आई',
  'baba':        'बाबा',
  'ghar':        'घर',
  'gaav':        'गाव',
  'paani':       'पाणी',
  'mulga':       'मुलगा',
  'mulgi':       'मुलगी',
  'shala':       'शाळा',
  'pustak':      'पुस्तक',
  'shetkari':    'शेतकरी',
  'shet':        'शेत',
  'maharashtra': 'महाराष्ट्र',
  'maharastra':  'महाराष्ट्र',
  'marathi':     'मराठी',
  'nashik':      'नाशिक',
  'nasik':       'नाशिक',
  'pune':        'पुणे',
  'mumbai':      'मुंबई',
  'kolhapur':    'कोल्हापूर',
  'nagpur':      'नागपूर',
  'namaskar':    'नमस्कार',
  'namaskaar':   'नमस्कार',

  // ── Training guide: food vocabulary ────────────────────────────────
  'shengadana':  'शेंगदाणा',
  'shengdana':   'शेंगदाणा',
  'gul':         'गूळ',
  'pohe':        'पोहे',
  'bhakari':     'भाकरी',
  'pithla':      'पिठलं',
  'misal':       'मिसळ',
  'vadapav':     'वडापाव',
  'modak':       'मोदक',
  'chakli':      'चकली',
  'karanji':     'करंजी',

  // ── Training guide: sample sentences ───────────────────────────────
  'majha nav swaroop aahe':  'माझं नाव स्वरूप आहे',
  'mi maharashtrat rahto':   'मी महाराष्ट्रात राहतो',
  'tumhi kase aahat':        'तुम्ही कसे आहात',
  'shubh sakal':             'शुभ सकाळ',
  'shubh':                   'शुभ',
  'sakal':                   'सकाळ',
  'dhanyavaad':              'धन्यवाद',
  'krupaya':                 'कृपया',
  'swaroop':                 'स्वरूप',
  'aahe':                    'आहे',
  'rahto':                   'राहतो',
  'aahat':                   'आहात',
}

// ═══════════════════════════════════════════════════════════════════════
//  Character maps — English → Devanagari
// ═══════════════════════════════════════════════════════════════════════

const CONSONANTS = {
  // Velar
  'k':   'क',   'kh':  'ख',   'g':   'ग',   'gh':  'घ',   'ng':  'ङ',
  // Palatal
  'ch':  'च',   'chh': 'छ',   'j':   'ज',   'jh':  'झ',   'ny':  'ञ',
  // Retroflex
  'T':   'ट',   'Th':  'ठ',   'D':   'ड',   'Dh':  'ढ',   'N':   'ण',
  // Dental
  't':   'त',   'th':  'थ',   'd':   'द',   'dh':  'ध',   'n':   'न',
  // Labial
  'p':   'प',   'ph':  'फ',   'f':   'फ',   'b':   'ब',   'bh':  'भ',
  'm':   'म',
  // Semivowels / fricatives / others
  'y':   'य',   'r':   'र',   'l':   'ल',   'v':   'व',   'w':   'व',
  'sh':  'श',   'Sh':  'ष',   's':   'स',   'h':   'ह',   'z':   'झ़',
  'c':   'च',
  // Compounds
  'ksh': 'क्ष', 'tr':  'त्र', 'gny': 'ज्ञ', 'shr': 'श्र',
}

const VOWELS = {
  'a':   'अ',   'aa':  'आ',   'i':   'इ',   'ii':  'ई',
  'u':   'उ',   'uu':  'ऊ',   'e':   'ए',   'ai':  'ऐ',
  'o':   'ओ',   'au':  'औ',
}

const MATRAS = {
  'a':   '',    'aa':  'ा',   'i':   'ि',   'ii':  'ी',
  'u':   'ु',   'uu':  'ू',   'e':   'े',   'ai':  'ै',
  'o':   'ो',   'au':  'ौ',
}

// Words passed through unchanged (brands, names, etc.)
const SKIP = new Set([
  'shriram', 'traders', 'ketan', 'shinde',
])

// Set of consonant keys used for quick look-ahead
const CONSONANT_KEYS = new Set(Object.keys(CONSONANTS))

// ═══════════════════════════════════════════════════════════════════════
//  Public API
// ═══════════════════════════════════════════════════════════════════════

export function toMarathi(text, lang) {
  if (!text || lang !== 'mr') return text
  if (typeof text !== 'string') return String(text)

  // Already Devanagari — no conversion needed
  if (/[\u0900-\u097F]/.test(text)) return text

  // Check full text against WORD_MAP (catches multi-word phrases)
  const fullLower = text.toLowerCase().trim()
  if (WORD_MAP[fullLower]) return WORD_MAP[fullLower]

  // Process word-by-word so WORD_MAP single-word look-ups work
  const result = text.split(/(\s+)/g).map((word) => {
    if (!word.trim() || /[^a-zA-Z]/.test(word)) return word
    const lower = word.toLowerCase()
    if (SKIP.has(lower)) return word
    if (WORD_MAP[lower]) return WORD_MAP[lower]
    return transliterateWord(word)
  })

  return result.join('')
}

// ═══════════════════════════════════════════════════════════════════════
//  Rule-based transliteration engine
// ═══════════════════════════════════════════════════════════════════════

function transliterateWord(word) {
  let out = ''
  let i = 0

  while (i < word.length) {
    const ch = word[i].toLowerCase()

    // ── Anusvara rule ──────────────────────────────────────────────
    //  When 'n' or 'm' appears before a consonant → output anusvara (ं)
    //  instead of 'न' or 'म' (e.g. shengadana → शेंगदाणा, mumbai → मुंबई)
    if ((ch === 'n' || ch === 'm') && i + 1 < word.length) {
      if (isConsonantAt(word, i + 1)) {
        out += 'ं'
        i++
        continue
      }
    }

    // ── Try to match a multi-character consonant ────────────────────
    let consumed = 0
    let dev = ''

    for (let len = 3; len >= 1; len--) {
      if (i + len > word.length) continue
      const seg = word.substring(i, i + len)
      const segLow = seg.toLowerCase()

      if (CONSONANTS[segLow] !== undefined) {
        dev = CONSONANTS[segLow]
        consumed = len
        break
      }
    }

    if (consumed > 0) {
      // We matched a consonant — check for a following vowel
      const nextStart = i + consumed
      let vowelMatch = ''
      let vowelLen = 0

      // Try multi-char vowel patterns first (aa, ii, uu, etc.)
      for (let len = 2; len >= 1; len--) {
        if (nextStart + len > word.length) continue
        const vSeg = word.substring(nextStart, nextStart + len).toLowerCase()
        if (MATRAS[vSeg] !== undefined) {
          vowelMatch = vSeg
          vowelLen = len
          break
        }
      }

      if (vowelMatch) {
        const matra = MATRAS[vowelMatch]
        if (vowelMatch === 'a') {
          // Inherent 'a' — consonant stands alone
          out += dev
        } else {
          // Explicit vowel — consonant + matra
          out += dev + matra
        }
        i = nextStart + vowelLen
      } else {
        // No vowel after consonant
        // If next character is a consonant, add halant connector
        if (nextStart < word.length && isConsonantAt(word, nextStart)) {
          out += dev + '्'
        } else {
          out += dev
        }
        i = nextStart
      }
    } else {
      // ── Standalone vowel (not preceded by a consonant) ──────────
      let vowelMatch = ''
      let vowelLen = 0
      for (let len = 2; len >= 1; len--) {
        if (i + len > word.length) continue
        const vSeg = word.substring(i, i + len).toLowerCase()
        if (VOWELS[vSeg] !== undefined) {
          vowelMatch = vSeg
          vowelLen = len
          break
        }
      }
      if (vowelMatch) {
        out += VOWELS[vowelMatch]
        i += vowelLen
      } else {
        // Unknown character — pass through as-is
        out += word[i]
        i++
      }
    }
  }

  return out
}

// ═══════════════════════════════════════════════════════════════════════
//  Helpers
// ═══════════════════════════════════════════════════════════════════════

/**
 * Returns true if the character at `startIndex` in `word` is the start
 * of a known consonant cluster (including multi-char consonants like 'sh').
 */
function isConsonantAt(word, startIndex) {
  for (let len = 3; len >= 1; len--) {
    if (startIndex + len > word.length) continue
    const seg = word.substring(startIndex, startIndex + len).toLowerCase()
    if (CONSONANT_KEYS.has(seg)) return true
  }
  return false
}
