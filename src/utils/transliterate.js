/**
 * Data-driven English → Marathi (Devanagari) transliterator.
 *
 * Strategy:
 *   1. Check a built-in fallback map for common words the rule engine can't handle.
 *   2. Lazy-load the full WORD_MAP (98K entries from training dataset) — only on
 *      server-side where toMarathi() is actually used.
 *   3. For unseen words, fall back to a rule-based engine using Devanagari phonetics.
 *
 * Performance: The 2.2 MB wordMap is NOT bundled into the frontend because it's
 * loaded via dynamic import. The client-side bundle stays small.
 */

// ═══════════════════════════════════════════════════════════════════════
//  Built-in fallback for words the rule engine can't handle correctly
//  (extracted from the training dataset — these are semantic word mappings
//   that can't be derived from phonetic rules alone)
// ═══════════════════════════════════════════════════════════════════════

const FALLBACK_MAP = {
  // Beverages
  'chai': 'चहा',
  'tea': 'चहा',
  'coffee': 'कॉफी',
  'masala chai': 'मसाला चहा',

  // Animals / products derived from
  'cow': 'गाय',
  'buffalo': 'म्हैस',

  // Common food items not covered by phonetics
  'mango pickle': 'आंब्याचे लोणचे',
  'lemon pickle': 'लिंबाचे लोणचे',
  'garlic pickle': 'लसणाचे लोणचे',
  'mixed pickle': 'मिक्स लोणचे',

  // Grains & staples
  'basmati rice': 'बासमती तांदूळ',
  'brown rice': 'ब्राऊन तांदूळ',
  'wheat flour': 'गहू पीठ',
  'gram flour': 'बेसन',
  'rice flour': 'तांदळाचे पीठ',

  // Spices & Seasonings
  'chilli powder': 'मिरची पूड',
  'chili powder': 'मिरची पूड',
  'red chilli powder': 'लाल तिखट',
  'red chili powder': 'लाल तिखट',
  'turmeric powder': 'हळद पूड',
  'coriander powder': 'धणे पूड',
  'cumin seeds': 'जिरे',
  'mustard seeds': 'मोहरी',
  'fennel seeds': 'बडीशेप',
  'fenugreek seeds': 'मेथी',
  'garam masala': 'गरम मसाला',
  'goda masala': 'गोडा मसाला',
  'kitchen king': 'किचन किंग',
  'pav bhaji masala': 'पाव भाजी मसाला',
  'chicken masala': 'चिकन मसाला',
  'mutton masala': 'मटण मसाला',
  'fish masala': 'फिश मसाला',
  'black pepper': 'काळी मिरी',
  'green cardamom': 'हिरवी वेलची',
  'cinnamon sticks': 'दालचिनी',
  'cloves': 'लवंग',
  'asafoetida': 'हिंग',
  'saffron': 'केसर',
  'nutmeg': 'जायफळ',
  'mace': 'जावित्री',
  'curry leaves': 'कढीपत्ता',
  'curry leaves powder': 'कढीपत्ता पूड',
  'dry mango powder': 'आमचूर पूड',
  'pomegranate seed powder': 'डाळिंब दाणे पूड',

  // Oils & Ghee
  'cow ghee': 'गायीचे तूप',
  'mustard oil': 'मोहरीचे तेल',
  'coconut oil': 'नारळाचे तेल',
  'groundnut oil': 'शेंगदाण्याचे तेल',
  'sunflower oil': 'सूर्यफूल तेल',

  // Sweets
  'til ladoo': 'तिळ लाडू',
  'besan ladoo': 'बेसन लाडू',
  'peanut chikki': 'शेंगदाण्याची चिक्की',
  'til chikki': 'तिळाची चिक्की',

  // Pickles & Chutneys
  'mango chutney': 'आंब्याची चटणी',
  'coconut chutney': 'नारळाची चटणी',
  'dry coconut chutney': 'सुके नारळ चटणी',
  'tamarind chutney': 'चिंचेची चटणी',
  'green chutney': 'हिरवी चटणी',
  'mixed vegetable pickle': 'मिक्स भाजी लोणचे',
  'green chili pickle': 'हिरवी मिरची लोणचे',

  // Grains & pulses
  'toor dal': 'तूर डाळ',
  'moong dal': 'मूग डाळ',
  'chana dal': 'चणा डाळ',
  'urad dal': 'उडीद डाळ',
  'masoor dal': 'मसूर डाळ',
  'whole wheat flour': 'गहू पीठ',
  'jowar flour': 'ज्वारीचे पीठ',
  'bajra flour': 'बाजरीचे पीठ',
  'ragi flour': 'नाचणीचे पीठ',
  'sonam masoori rice': 'सोनम मसूरी तांदूळ',
  'poha': 'पोहे',

  // Oils & Ghee
  'kachi ghani mustard oil': 'कच्ची घाणी मोहरीचे तेल',
  'peanut oil': 'शेंगदाण्याचे तेल',

  // Sweets & Snacks
  'bhakarwadi': 'भकरवडी',
  'shankarpali': 'शंकरपाळी',

  // Other foods & products
  'gud': 'गूळ',
  'jaggery': 'गूळ',
  'organic gud': 'सेंद्रिय गूळ',
  'pure ghee': 'शुद्ध तूप',
  'tup': 'तूप',
  'fresh cream': 'ताजी मलई',
  'amul butter': 'अमूल बटर',
  'paneer': 'पनीर',
  'shrikhand': 'श्रीखंड',
  'amrakhand': 'आम्रखंड',

  // Category names
  'oils & ghee': 'तेल व तूप',
  'beverages': 'पेये',
  'spices': 'मसाले',
  'grains & rice': 'धान्य व तांदूळ',
  'sweets & snacks': 'गोडे व स्नॅक्स',
  'pickles & chutneys': 'लोणची व चटण्या',
  'groceries': 'किराणा',
  'kirana': 'किराणा',
  'masala': 'मसाला',
  'dal': 'डाळ',
  'flour': 'पीठ',
  'powder': 'पूड',
  'pickle': 'लोणचे',
  'chutney': 'चटणी',
  'mango': 'आंबा',
  'garlic': 'लसूण',
  'haldi': 'हळद',
  'basmati': 'बासमती',
  'kashmiri': 'काश्मिरी',
  'black': 'काळा',
  'organic': 'सेंद्रिय',
  'pure': 'शुद्ध',
  'premium': 'प्रीमियम',
  'rice': 'तांदूळ',
  'fresh': 'ताजे',
  'achaar': 'आचार',
  'aam': 'आम',
  'sugar': 'साखर',
  'salt': 'मीठ',
  'oil': 'तेल',
  'milk': 'दूध',
  'sweet': 'गोड',
  'pohe': 'पोहे',
  'bhakari': 'भाकरी',
  'pithla': 'पिठलं',
  'misal': 'मिसळ',
  'vadapav': 'वडापाव',
  'modak': 'मोदक',
  'ladoo': 'लाडू',
  'chakli': 'चकली',
  'karanji': 'करंजी',

  // Common words (from training dataset)
  'paani': 'पाणी',
  'gaav': 'गाव',
  'mulga': 'मुलगा',
  'ghar': 'घर',
  'baba': 'बाबा',
  'aai': 'आई',
  'shala': 'शाळा',
  'pustak': 'पुस्तक',
  'shetkari': 'शेतकरी',
  'shet': 'शेत',
  'maharashtra': 'महाराष्ट्र',
  'maharastra': 'महाराष्ट्र',
  'marathi': 'मराठी',
  'nashik': 'नाशिक',
  'nasik': 'नाशिक',
  'pune': 'पुणे',
  'mumbai': 'मुंबई',
  'kolhapur': 'कोल्हापूर',
  'nagpur': 'नागपूर',
  'namaskar': 'नमस्कार',
  'namaskaar': 'नमस्कार',
  'dhanyavaad': 'धन्यवाद',
  'krupaya': 'कृपया',
  'swaroop': 'स्वरूप',
  'aahe': 'आहे',
  'rahto': 'राहतो',
  'aahat': 'आहात',
  'shengadana': 'शेंगदाणा',
  'shengdana': 'शेंगदाणा',
  'shengadanyachi chikki': 'शेंगदाण्याची चिक्की',
  'shengdanyachi chakli': 'शेंगदाण्याची चकली',
  'chikki': 'चिक्की',
  'gul': 'गूळ',
};

// ═══════════════════════════════════════════════════════════════════════
//  Character maps (derived from the dataset)
// ═══════════════════════════════════════════════════════════════════════

const VOWELS = {
  'a': 'अ', 'aa': 'आ', 'i': 'इ', 'ii': 'ई',
  'u': 'उ', 'uu': 'ऊ', 'e': 'ए', 'ai': 'ऐ',
  'o': 'ओ', 'au': 'औ',
};

const MATRAS = {
  'a': '',    'aa': 'ा',  'i': 'ि',   'ii': 'ी',
  'u': 'ु',   'uu': 'ू',  'e': 'े',   'ai': 'ै',
  'o': 'ो',   'au': 'ौ',
};

const CONSONANTS = {
  'k': 'क', 'kh': 'ख', 'g': 'ग', 'gh': 'घ', 'ng': 'ङ',
  'ch': 'च', 'chh': 'छ', 'j': 'ज', 'jh': 'झ', 'ny': 'ञ',
  't': 'ट', 'th': 'ठ', 'd': 'ड', 'dh': 'ढ', 'n': 'ण',
  'T': 'ट', 'Th': 'ठ', 'D': 'ड', 'Dh': 'ढ', 'N': 'ण',
  'p': 'प', 'ph': 'फ', 'f': 'फ', 'b': 'ब', 'bh': 'भ',
  'm': 'म', 'y': 'य', 'r': 'र', 'l': 'ल', 'v': 'व',
  'w': 'व', 'sh': 'श', 'Sh': 'ष', 's': 'स', 'h': 'ह',
  'z': 'झ़', 'c': 'च',
  // Compounds
  'ksh': 'क्ष', 'tr': 'त्र', 'gny': 'ज्ञ', 'shr': 'श्र',
  'dny': 'ज्ञ', 'gy': 'ज्ञ',
};

const CONSONANT_KEYS = new Set(Object.keys(CONSONANTS));

const SKIP = new Set([
  'shriram', 'traders', 'ketan', 'shinde',
  'mr', 'en', 'kg', 'g', 'ml', 'l', 'pcs',
]);

// ═══════════════════════════════════════════════════════════════════════
//  Lazy word map loader (server-side only via dynamic import)
// ═══════════════════════════════════════════════════════════════════════

let _WORD_MAP = null;
let _WORD_MAP_LOADED = false;

export async function getWordMap() {
  if (_WORD_MAP_LOADED) return _WORD_MAP;
  try {
    const mod = await import('./wordMap.js');
    _WORD_MAP = mod.WORD_MAP;
  } catch {
    _WORD_MAP = {};
  }
  _WORD_MAP_LOADED = true;
  return _WORD_MAP;
}

function getWordMapSync() {
  return _WORD_MAP || {};
}

// ═══════════════════════════════════════════════════════════════════════
//  Core transliteration logic
// ═══════════════════════════════════════════════════════════════════════

function transliterateText(text, wordMap) {
  if (!text || !/[a-zA-Z]/.test(text) || /[\u0900-\u097F]/.test(text)) return text;

  const fullLower = text.toLowerCase().trim();

  // 1. Check the built-in fallback map first
  if (FALLBACK_MAP[fullLower] !== undefined) return FALLBACK_MAP[fullLower];

  // 2. Check exact match in WORD_MAP
  if (wordMap[fullLower] !== undefined) return wordMap[fullLower];

  // 3. Process word-by-word
  const result = text.split(/(\s+)/g).map((word) => {
    if (!word.trim() || /[^a-zA-Z]/.test(word)) return word;
    const lower = word.toLowerCase();
    if (SKIP.has(lower)) return word;
    if (FALLBACK_MAP[lower] !== undefined) return FALLBACK_MAP[lower];
    if (wordMap[lower] !== undefined) return wordMap[lower];
    return transliterateWord(word);
  });

  return result.join('');
}

// ═══════════════════════════════════════════════════════════════════════
//  Public API
// ═══════════════════════════════════════════════════════════════════════

/** Synchronous version — uses only FALLBACK_MAP + cached wordMap + rule engine */
export function toMarathi(text, lang) {
  if (!text || lang !== 'mr') return text;
  if (typeof text !== 'string') return String(text);
  return transliterateText(text, getWordMapSync());
}

/** Async version — ensures the full word map is loaded before translating */
export async function toMarathiAsync(text, lang) {
  const wordMap = await getWordMap();
  if (!text || lang !== 'mr') return text;
  if (typeof text !== 'string') return String(text);
  return transliterateText(text, wordMap);
}

// ═══════════════════════════════════════════════════════════════════════
//  Rule-based transliteration engine (fallback for unseen words)
// ═══════════════════════════════════════════════════════════════════════

function transliterateWord(word) {
  let out = '';
  let i = 0;

  while (i < word.length) {
    const ch = word[i];

    // ── Anusvara (ं) rule ──────────────────────────────────────────
    if ((ch === 'n' || ch === 'm') && isConsonantAt(word, i + 1)) {
      out += 'ं';
      i++;
      continue;
    }

    // ── Match consonant ────────────────────────────────────────────
    let consumed = 0;
    let dev = '';

    for (let len = 3; len >= 1; len--) {
      if (i + len > word.length) continue;
      const seg = word.substring(i, i + len);
      const segLow = seg.toLowerCase();
      const c = CONSONANTS[segLow];
      if (c !== undefined) {
        dev = c;
        consumed = len;
        break;
      }
    }

    if (consumed > 0) {
      const nextStart = i + consumed;
      let vowelMatch = '';
      let vowelLen = 0;

      for (let len = 2; len >= 1; len--) {
        if (nextStart + len > word.length) continue;
        const vSeg = word.substring(nextStart, nextStart + len).toLowerCase();
        if (MATRAS[vSeg] !== undefined) {
          vowelMatch = vSeg;
          vowelLen = len;
          break;
        }
      }

      if (vowelMatch) {
        const matra = MATRAS[vowelMatch];
        if (vowelMatch === 'a') {
          if (nextStart + vowelLen < word.length && isConsonantAt(word, nextStart + vowelLen)) {
            out += dev + '्';
          } else {
            out += dev;
          }
        } else {
          out += dev + matra;
        }
        i = nextStart + vowelLen;
      } else {
        if (nextStart < word.length && isConsonantAt(word, nextStart)) {
          out += dev + '्';
        } else {
          out += dev;
        }
        i = nextStart;
      }
    } else {
      // ── Standalone vowel ─────────────────────────────────────────
      let vowelMatch = '';
      let vowelLen = 0;
      for (let len = 2; len >= 1; len--) {
        if (i + len > word.length) continue;
        const vSeg = word.substring(i, i + len).toLowerCase();
        if (VOWELS[vSeg] !== undefined) {
          vowelMatch = vSeg;
          vowelLen = len;
          break;
        }
      }
      if (vowelMatch) {
        out += VOWELS[vowelMatch];
        i += vowelLen;
      } else {
        out += word[i];
        i++;
      }
    }
  }

  return out;
}

function isConsonantAt(word, startIndex) {
  for (let len = 3; len >= 1; len--) {
    if (startIndex + len > word.length) continue;
    const seg = word.substring(startIndex, startIndex + len).toLowerCase();
    if (CONSONANT_KEYS.has(seg)) return true;
  }
  return false;
}
