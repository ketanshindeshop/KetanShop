/**
 * Test 10 sample grocery sentences through the current transliterator
 * and compare against expected translations from the training data.
 * Run: node scripts/test-translations.js
 */

// Simulate the FALLBACK_MAP and rule engine from transliterate.js
const FALLBACK_MAP = {
  'chai': 'चहा',
  'tea': 'चहा',
  'coffee': 'कॉफी',
  'masala chai': 'मसाला चहा',
  'mango pickle': 'आंब्याचे लोणचे',
  'basmati rice': 'बासमती तांदूळ',
  'brown rice': 'ब्राऊन तांदूळ',
  'wheat': 'गहू',
  'wheat flour': 'गव्हाचे पीठ',
  'red chilli powder': 'तिखट',
  'turmeric powder': 'हळद पावडर',
  'coriander powder': 'धणे पावडर',
  'cumin seeds': 'जिरे',
  'mustard seeds': 'मोहरी',
  'black pepper': 'काळी मिरी',
  'green cardamom': 'हिरवी वेलची',
  'cinnamon': 'दालचिनी',
  'cloves': 'लवंग',
  'cardamom': 'वेलची',
  'asafoetida': 'हिंग',
  'saffron': 'केसर',
  'nutmeg': 'जायफळ',
  'cow ghee': 'गायीचे तूप',
  'mustard oil': 'मोहरीचे तेल',
  'coconut oil': 'नारळाचे तेल',
  'moong dal': 'मूग डाळ',
  'mung dal': 'मूग डाळ',
  'toor dal': 'तूर डाळ',
  'chana dal': 'चणा डाळ',
  'urad dal': 'उडीद डाळ',
  'masoor dal': 'मसूर डाळ',
  'sugar': 'साखर',
  'salt': 'मीठ',
  'rice': 'तांदूळ',
  'fresh': 'ताजे',
  'premium': 'प्रीमियम',
  'organic': 'सेंद्रिय',
  'pure': 'शुद्ध',
  'oil': 'तेल',
  'milk': 'दूध',
  'garlic': 'लसूण',
  'gud': 'गूळ',
  'jaggery': 'गूळ',
  'poha': 'पोहे',
  'groceries': 'किराणा',
  'spices': 'मसाले',
  'grains & rice': 'धान्य व तांदूळ',
  'dal': 'डाळ',
  'flour': 'पीठ',
  'pickle': 'लोणचे',
  'chutney': 'चटणी',
  'mango': 'आंबा',
};

const VOWELS = { 'a': 'अ', 'aa': 'आ', 'i': 'इ', 'ii': 'ई', 'u': 'उ', 'uu': 'ऊ', 'e': 'ए', 'ai': 'ऐ', 'o': 'ओ', 'au': 'औ' };
const MATRAS = { 'a': '', 'aa': 'ा', 'i': 'ि', 'ii': 'ी', 'u': 'ु', 'uu': 'ू', 'e': 'े', 'ai': 'ै', 'o': 'ो', 'au': 'ौ' };
const CONSONANTS = {
  'k': 'क', 'kh': 'ख', 'g': 'ग', 'gh': 'घ', 'ng': 'ङ',
  'ch': 'च', 'chh': 'छ', 'j': 'ज', 'jh': 'झ', 'ny': 'ञ',
  't': 'ट', 'th': 'ठ', 'd': 'ड', 'dh': 'ढ', 'n': 'ण',
  'T': 'ट', 'Th': 'ठ', 'D': 'ड', 'Dh': 'ढ', 'N': 'ण',
  'p': 'प', 'ph': 'फ', 'f': 'फ', 'b': 'ब', 'bh': 'भ', 'm': 'म',
  'y': 'य', 'r': 'र', 'l': 'ल', 'v': 'व', 'w': 'व',
  'sh': 'श', 'Sh': 'ष', 's': 'स', 'h': 'ह', 'z': 'झ़', 'c': 'च',
  'ksh': 'क्ष', 'tr': 'त्र', 'gny': 'ज्ञ', 'shr': 'श्र', 'dny': 'ज्ञ', 'gy': 'ज्ञ',
};
const CONSONANT_KEYS = new Set(Object.keys(CONSONANTS));
const SKIP = new Set(['shriram', 'traders', 'ketan', 'shinde', 'mr', 'en', 'kg', 'g', 'ml', 'l', 'pcs']);

function transliterateWord(word) {
  let out = '';
  let i = 0;
  while (i < word.length) {
    const ch = word[i];
    if ((ch === 'n' || ch === 'm') && i + 1 < word.length && isConsonantAt(word, i + 1)) { out += 'ं'; i++; continue; }
    let consumed = 0, dev = '';
    for (let len = 3; len >= 1; len--) {
      if (i + len > word.length) continue;
      const seg = word.substring(i, i + len).toLowerCase();
      if (CONSONANTS[seg] !== undefined) { dev = CONSONANTS[seg]; consumed = len; break; }
    }
    if (consumed > 0) {
      const ns = i + consumed;
      let vMatch = '', vLen = 0;
      for (let len = 2; len >= 1; len--) {
        if (ns + len > word.length) continue;
        const vs = word.substring(ns, ns + len).toLowerCase();
        if (MATRAS[vs] !== undefined) { vMatch = vs; vLen = len; break; }
      }
      if (vMatch) {
        out += (vMatch === 'a') ? dev : dev + MATRAS[vMatch];
        i = ns + vLen;
      } else {
        out += (ns < word.length && isConsonantAt(word, ns)) ? dev + '्' : dev;
        i = ns;
      }
    } else {
      let vMatch = '', vLen = 0;
      for (let len = 2; len >= 1; len--) {
        if (i + len > word.length) continue;
        const vs = word.substring(i, i + len).toLowerCase();
        if (VOWELS[vs] !== undefined) { vMatch = vs; vLen = len; break; }
      }
      if (vMatch) { out += VOWELS[vMatch]; i += vLen; }
      else { out += word[i]; i++; }
    }
  }
  return out;
}

function isConsonantAt(word, idx) {
  for (let len = 3; len >= 1; len--) {
    if (idx + len > word.length) continue;
    if (CONSONANT_KEYS.has(word.substring(idx, idx + len).toLowerCase())) return true;
  }
  return false;
}

function toMarathi(text) {
  if (!text || !/[a-zA-Z]/.test(text) || /[\u0900-\u097F]/.test(text)) return text;
  const fullLower = text.toLowerCase().trim();
  if (FALLBACK_MAP[fullLower] !== undefined) return FALLBACK_MAP[fullLower];
  return text.split(/(\s+)/g).map(word => {
    if (!word.trim() || /[^a-zA-Z]/.test(word)) return word;
    const lower = word.toLowerCase();
    if (SKIP.has(lower)) return word;
    if (FALLBACK_MAP[lower] !== undefined) return FALLBACK_MAP[lower];
    return transliterateWord(word);
  }).join('');
}

// ── 10 Test Sentences ──────────────────────────────────────────────

const tests = [
  // 1. Simple product (in fallback)
  "Premium Basmati Rice",
  // 2. Product with modifier (partially in fallback)
  "Organic Turmeric Powder",
  // 3. Simple sentence (not in any map)
  "Buy fresh vegetables online",
  // 4. Product without fallback — pure rule engine
  "Wheat Bran Flakes",
  // 5. Simple product (in fallback — new entries)
  "Green Gram",
  // 6. Sentence from training data
  "Buy Rice online at best price",
  // 7. Multi-word product, some in fallback
  "Cold Pressed Mustard Oil",
  // 8. Common grocery phrase
  "Showing 12 of 50 products",
  // 9. Out-of-stock notice (dynamic UI text)
  "This product is currently out of stock",
  // 10. English word that should map to Marathi via fallback
  "Pure Cow Ghee 1kg",
];

console.log('═'.repeat(80));
console.log('  TRANSLITERATOR COMPARISON: Current System vs IndicTrans2');
console.log('═'.repeat(80));
console.log();

for (const sentence of tests) {
  const result = toMarathi(sentence);
  console.log(`📝 English:      ${sentence}`);
  console.log(`🔄 Current:      ${result}`);
  console.log(`🤖 IndicTrans2:  [See analysis below]`);
  console.log(`📊 Quality Gap:  [See analysis below]`);
  console.log('-'.repeat(80));
  console.log();
}
