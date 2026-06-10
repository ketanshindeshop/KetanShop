/**
 * Marathi Transliteration Training Dataset Generator
 *
 * Generates 10,000+ English→Marathi transliteration pairs following the
 * rules in public/marathi_transliteration_training_guide.txt.
 *
 * Output: JSONL format (one {"english":"...","marathi":"..."} per line)
 * Usage:  node scripts/generate-training-data.js
 */

import { writeFileSync } from 'fs'

// ═══════════════════════════════════════════════════════════════════════
//  1. Character maps (per training guide)
// ═══════════════════════════════════════════════════════════════════════

const CONSONANTS = {
  'k': 'क', 'kh': 'ख', 'g': 'ग', 'gh': 'घ', 'ng': 'ङ',
  'ch': 'च', 'chh': 'छ', 'j': 'ज', 'jh': 'झ', 'ny': 'ञ',
  'T': 'ट', 'Th': 'ठ', 'D': 'ड', 'Dh': 'ढ', 'N': 'ण',
  't': 'त', 'th': 'थ', 'd': 'द', 'dh': 'ध', 'n': 'न',
  'p': 'प', 'ph': 'फ', 'f': 'फ', 'b': 'ब', 'bh': 'भ', 'm': 'म',
  'y': 'य', 'r': 'र', 'l': 'ल', 'v': 'व', 'w': 'व',
  'sh': 'श', 'Sh': 'ष', 's': 'स', 'h': 'ह',
  'z': 'झ़',
  // Compounds
  'ksh': 'क्ष', 'tr': 'त्र', 'gny': 'ज्ञ', 'shr': 'श्र',
}

// Also include 'c' as 'च' for alternative spellings
CONSONANTS['c'] = 'च'

// Training guide maps 'ssa' → ष
CONSONANTS['ssa'] = 'ष'
CONSONANTS['ssh'] = 'ष'

// Vowel key → Devanagari standalone character
const VOWELS = {
  'a': 'अ', 'aa': 'आ', 'i': 'इ', 'ii': 'ई',
  'u': 'उ', 'uu': 'ऊ', 'e': 'ए', 'ai': 'ऐ',
  'o': 'ओ', 'au': 'औ', 'am': 'अं', 'ah': 'अः',
}

// Vowel key → combining matra (used after a consonant)
const MATRAS = {
  'a': '',    'aa': 'ा', 'i': 'ि', 'ii': 'ी',
  'u': 'ु',   'uu': 'ू', 'e': 'े', 'ai': 'ै',
  'o': 'ो',   'au': 'ौ',
}

// Set of all consonant keys for look-ahead
const CONSONANT_KEYS = new Set(Object.keys(CONSONANTS))

// ═══════════════════════════════════════════════════════════════════════
//  2. Transliteration engine (English → Devanagari)
// ═══════════════════════════════════════════════════════════════════════

function toMarathiRaw(text) {
  if (!text) return ''
  let out = ''
  let i = 0

  while (i < text.length) {
    const ch = text[i].toLowerCase()

    // ── Anusvara: n/m before a consonant → ं ──
    if ((ch === 'n' || ch === 'm') && i + 1 < text.length) {
      if (isConsonantStart(text, i + 1)) {
        out += 'ं'
        i++
        continue
      }
    }

    // ── Try to match a consonant (multi-char first) ──
    let consumed = 0
    let dev = ''

    for (let len = 3; len >= 1; len--) {
      if (i + len > text.length) continue
      const seg = text.substring(i, i + len).toLowerCase()
      if (CONSONANTS[seg] !== undefined) {
        dev = CONSONANTS[seg]
        consumed = len
        break
      }
    }

    if (consumed > 0) {
      // Consonant matched — check for following vowel
      const ns = i + consumed
      let vMatch = ''
      let vLen = 0

      for (let len = 2; len >= 1; len--) {
        if (ns + len > text.length) continue
        const vs = text.substring(ns, ns + len).toLowerCase()
        if (MATRAS[vs] !== undefined) { vMatch = vs; vLen = len; break }
      }

      if (vMatch) {
        if (vMatch === 'a') {
          out += dev          // inherent 'a'
        } else {
          out += dev + MATRAS[vMatch]
        }
        i = ns + vLen
      } else {
        // No vowel — if next char is a consonant, add halant
        if (ns < text.length && isConsonantStart(text, ns)) {
          out += dev + '्'
        } else {
          out += dev
        }
        i = ns
      }
    } else {
      // ── Standalone vowel ──
      let vMatch = ''
      let vLen = 0
      for (let len = 2; len >= 1; len--) {
        if (i + len > text.length) continue
        const vs = text.substring(i, i + len).toLowerCase()
        if (VOWELS[vs] !== undefined) { vMatch = vs; vLen = len; break }
      }
      if (vMatch) {
        out += VOWELS[vMatch]
        i += vLen
      } else {
        // Unknown — pass through
        out += text[i]
        i++
      }
    }
  }
  return out
}

function isConsonantStart(word, idx) {
  for (let len = 3; len >= 1; len--) {
    if (idx + len > word.length) continue
    if (CONSONANT_KEYS.has(word.substring(idx, idx + len).toLowerCase())) return true
  }
  return false
}

// ═══════════════════════════════════════════════════════════════════════
//  3. Build the pair set
// ═══════════════════════════════════════════════════════════════════════

const seen = new Set()
const pairs = []

function add(english, marathi) {
  const key = english.toLowerCase().trim()
  if (seen.has(key)) return
  seen.add(key)
  pairs.push({ english: english.trim(), marathi: marathi.trim() })
}

// ── 3a. Hand-curated pairs from the training guide ──────────────────

const HANDPICKED = [
  // Common words
  ['aai', 'आई'],
  ['baba', 'बाबा'],
  ['ghar', 'घर'],
  ['gaav', 'गाव'],
  ['paani', 'पाणी'],
  ['mulga', 'मुलगा'],
  ['mulgi', 'मुलगी'],
  ['shala', 'शाळा'],
  ['pustak', 'पुस्तक'],
  ['shetkari', 'शेतकरी'],
  ['shet', 'शेत'],
  ['maharashtra', 'महाराष्ट्र'],
  ['maharastra', 'महाराष्ट्र'],
  ['marathi', 'मराठी'],
  ['nashik', 'नाशिक'],
  ['nasik', 'नाशिक'],
  ['pune', 'पुणे'],
  ['mumbai', 'मुंबई'],
  ['kolhapur', 'कोल्हापूर'],
  ['nagpur', 'नागपूर'],
  ['namaskar', 'नमस्कार'],
  ['namaskaar', 'नमस्कार'],
  ['dhanyavaad', 'धन्यवाद'],
  ['krupaya', 'कृपया'],
  ['shubh sakal', 'शुभ सकाळ'],
  ['shubh', 'शुभ'],
  ['sakal', 'सकाळ'],
  ['swaroop', 'स्वरूप'],
  ['aahe', 'आहे'],
  ['rahto', 'राहतो'],
  ['aahat', 'आहात'],

  // Food vocabulary
  ['shengadana', 'शेंगदाणा'],
  ['shengdana', 'शेंगदाणा'],
  ['shengadanyachi chikki', 'शेंगदाण्याची चिक्की'],
  ['chikki', 'चिक्की'],
  ['gul', 'गूळ'],
  ['pohe', 'पोहे'],
  ['bhakari', 'भाकरी'],
  ['pithla', 'पिठलं'],
  ['misal', 'मिसळ'],
  ['vadapav', 'वडापाव'],
  ['modak', 'मोदक'],
  ['ladoo', 'लाडू'],
  ['chakli', 'चकली'],
  ['karanji', 'करंजी'],

  // Sample sentences
  ['majha nav swaroop aahe', 'माझं नाव स्वरूप आहे'],
  ['mi maharashtrat rahto', 'मी महाराष्ट्रात राहतो'],
  ['tumhi kase aahat', 'तुम्ही कसे आहात'],

  // Store products
  ['kashmiri garlic black', 'काश्मिरी काळा लसूण'],
  ['organic gud', 'सेंद्रिय गूळ'],
  ['pure haldi powder', 'शुद्ध हळद पूड'],
  ['premium basmati rice', 'प्रीमियम बासमती तांदूळ'],
  ['mango pickle aam ka achar', 'आंब्याचे लोणचे'],
  ['aam ka achar', 'आंब्याचे लोणचे'],
  ['aam', 'आम'],
  ['haldi', 'हळद'],
  ['basmati', 'बासमती'],
  ['kashmiri', 'काश्मिरी'],
  ['shengdanyachi chakli', 'शेंगदाण्याची चकली'],

  // Shopping/grocery terms
  ['groceries', 'किराणा'],
  ['kirana', 'किराणा'],
  ['spices', 'मसाले'],
  ['masala', 'मसाला'],
  ['grains', 'धान्य'],
  ['rice', 'तांदूळ'],
  ['dal', 'डाळ'],
  ['flour', 'पीठ'],
  ['powder', 'पूड'],
  ['pickle', 'लोणचे'],
  ['chutney', 'चटणी'],
  ['mango', 'आंबा'],
  ['garlic', 'लसूण'],
  ['gud', 'गूळ'],
  ['jaggery', 'गूळ'],
  ['tea', 'चहा'],
  ['coffee', 'कॉफी'],
  ['ghee', 'तूप'],
  ['sugar', 'साखर'],
  ['salt', 'मीठ'],
  ['oil', 'तेल'],
  ['milk', 'दूध'],
  ['sweet', 'गोड'],
  ['black', 'काळा'],
  ['organic', 'सेंद्रिय'],
  ['pure', 'शुद्ध'],
  ['premium', 'प्रीमियम'],
  ['fresh', 'ताजे'],
  ['achaar', 'आचार'],
]

for (const [en, mr] of HANDPICKED) add(en, mr)

// ── 3b. Days of week ────────────────────────────────────────────────

const DAYS = [
  ['somvar', 'सोमवार'],
  ['mangalvar', 'मंगळवार'],
  ['budhvar', 'बुधवार'],
  ['guruvar', 'गुरुवार'],
  ['shukravar', 'शुक्रवार'],
  ['shanivar', 'शनिवार'],
  ['ravivar', 'रविवार'],
  ['soma', 'सोम'],
  ['mangala', 'मंगळ'],
  ['budha', 'बुध'],
  ['guru', 'गुरु'],
  ['shukra', 'शुक्र'],
  ['shani', 'शनी'],
  ['ravi', 'रवि'],
]
for (const [en, mr] of DAYS) {
  add(en, mr)
  // Alternate: var ending with English suffix
  add(en + 'var', mr)
}

// ── 3c. Months ──────────────────────────────────────────────────────

const MONTHS = [
  ['january', 'जानेवारी'],
  ['february', 'फेब्रुवारी'],
  ['march', 'मार्च'],
  ['april', 'एप्रिल'],
  ['may', 'मे'],
  ['june', 'जून'],
  ['july', 'जुलै'],
  ['august', 'ऑगस्ट'],
  ['september', 'सप्टेंबर'],
  ['october', 'ऑक्टोबर'],
  ['november', 'नोव्हेंबर'],
  ['december', 'डिसेंबर'],
]
for (const [en, mr] of MONTHS) add(en, mr)

// ── 3d. Colors ──────────────────────────────────────────────────────

const COLORS = [
  ['lal', 'लाल'],
  ['niLa', 'निळा'],
  ['hirava', 'हिरवा'],
  ['pivLa', 'पिवळा'],
  ['kaLa', 'काळा'],
  ['pandhra', 'पांढरा'],
  ['jambhLa', 'जांभळा'],
  ['bhagva', 'भगवा'],
  ['gulabi', 'गुलाबी'],
  ['kari', 'करी'],
  ['soneri', 'सोनेरी'],
  ['rakta', 'रक्त'],
]

for (const [en, mr] of COLORS) {
  add(en, mr)
  // Feminine forms
  add(en.replace(/a$/, 'i'), mr.replace(/ा$/, 'ी'))
}

// ── 3e. Fruits ──────────────────────────────────────────────────────

const FRUITS = [
  ['amba', 'आंबा'],
  ['keli', 'केळी'],
  ['saphal', 'सफल'],
  ['safarchand', 'सफरचंद'],
  ['mosambi', 'मोसंबी'],
  ['drakshe', 'द्राक्षे'],
  ['papai', 'पपई'],
  ['daLimba', 'डाळिंब'],
  ['naral', 'नारळ'],
  ['ananas', 'अननस'],
  ['santra', 'संत्रे'],
  ['limbu', 'लिंबू'],
  ['peru', 'पेरू'],
  ['jambhul', 'जांभूळ'],
  ['bor', 'बोर'],
  ['sitaphal', 'सीताफळ'],
  ['tarbuj', 'टरबूज'],
  ['kalingad', 'कलिंगड'],
]

for (const [en, mr] of FRUITS) add(en, mr)

// ── 3f. Vegetables ──────────────────────────────────────────────────

const VEGGIES = [
  ['batata', 'बटाटा'],
  ['kanda', 'कांदा'],
  ['tamatar', 'टमाटर'],
  ['vangi', 'वांगी'],
  ['phula kopi', 'फुलकोबी'],
  ['kobi', 'कोबी'],
  ['mattar', 'मटार'],
  ['gajar', 'गाजर'],
  ['muLa', 'मुळा'],
  ['palak', 'पालक'],
  ['bhopLa', 'भोपळा'],
  ['kakdi', 'काकडी'],
  ['bhendi', 'भेंडी'],
  ['dudhi', 'दुधी'],
  ['karela', 'करेला'],
  ['mula', 'मुळा'],
  ['Lal bhopLa', 'लाल भोपळा'],
  ['vangi', 'वांगी'],
]

for (const [en, mr] of VEGGIES) add(en, mr)

// ── 3g. Common Marathi names ────────────────────────────────────────

const NAMES = [
  ['suresh', 'सुरेश'],
  ['ramesh', 'रमेश'],
  ['mahesh', 'महेश'],
  ['arun', 'अरुण'],
  ['anil', 'अनिल'],
  ['sunil', 'सुनील'],
  ['vijay', 'विजय'],
  ['rajesh', 'राजेश'],
  ['prakash', 'प्रकाश'],
  ['sanjay', 'संजय'],
  ['dilip', 'दिलीप'],
  ['ashok', 'अशोक'],
  ['kishor', 'किशोर'],
  ['amit', 'अमित'],
  ['nitin', 'नितीन'],
  ['ketan', 'केतन'],
  ['shinde', 'शिंदे'],
  ['patil', 'पाटील'],
  ['deshmukh', 'देशमुख'],
  ['joshi', 'जोशी'],
  ['kulkarni', 'कुलकर्णी'],
  ['bhosale', 'भोसले'],
  ['more', 'मोरे'],
  ['pawar', 'पवार'],
  ['gaikwad', 'गायकवाड'],
  ['jadhav', 'जाधव'],
  ['shinde', 'शिंदे'],
  ['sathe', 'साठे'],
  ['karve', 'कर्वे'],
  ['apte', 'आपटे'],
  ['mane', 'माने'],
  ['desai', 'देसाई'],
  ['chavan', 'चव्हाण'],
  ['salunkhe', 'साळुंखे'],
  ['kamal', 'कमल'],
  ['anita', 'अनिता'],
  ['sunita', 'सुनीता'],
  ['mangala', 'मंगला'],
  ['usha', 'उषा'],
  ['geeta', 'गीता'],
  ['seeta', 'सीता'],
  ['reva', 'रेवा'],
  ['ganga', 'गंगा'],
  ['yamuna', 'यमुना'],
]

for (const [en, mr] of NAMES) add(en, mr)

// ── 3h. Maharashtrian places ─────────────────────────────────────────

const PLACES = [
  ['mumbai', 'मुंबई'],
  ['pune', 'पुणे'],
  ['nagpur', 'नागपूर'],
  ['kolhapur', 'कोल्हापूर'],
  ['nashik', 'नाशिक'],
  ['aurangabad', 'औरंगाबाद'],
  ['solapur', 'सोलापूर'],
  ['sangli', 'सांगली'],
  ['satara', 'सातारा'],
  ['ratnagiri', 'रत्नागिरी'],
  ['amravati', 'अमरावती'],
  ['jalgaon', 'जळगाव'],
  ['akola', 'अकोला'],
  ['latur', 'लातूर'],
  ['ahmednagar', 'अहमदनगर'],
  ['dhule', 'धुळे'],
  ['chandrapur', 'चंद्रपूर'],
  ['parbhani', 'परभणी'],
  ['osmanabad', 'उस्मानाबाद'],
  ['nanded', 'नांदेड'],
  ['wardha', 'वर्धा'],
  ['gondia', 'गोंदिया'],
  ['mahabaleshwar', 'महाबळेश्वर'],
  ['lonavala', 'लोणावळा'],
  ['panchgani', 'पाचगणी'],
  ['matheran', 'माथेरान'],
  ['alibaug', 'अलिबाग'],
  ['shirdi', 'शिर्डी'],
  ['pandharpur', 'पंढरपूर'],
  ['tryambakeshwar', 'त्र्यंबकेश्वर'],
  ['bhimashankar', 'भीमाशंकर'],
]

for (const [en, mr] of PLACES) add(en, mr)

// ── 3i. Festivals ───────────────────────────────────────────────────

const FESTIVALS = [
  ['diwali', 'दिवाळी'],
  ['dussehra', 'दसरा'],
  ['holi', 'होळी'],
  ['ganesh chaturthi', 'गणेश चतुर्थी'],
  ['gudi padwa', 'गुढी पाडवा'],
  ['makar sankranti', 'मकर संक्रांती'],
  ['shivratri', 'शिवरात्री'],
  ['ram navami', 'राम नवमी'],
  ['janmashtami', 'जन्माष्टमी'],
  ['navratri', 'नवरात्री'],
  ['pola', 'पोळा'],
  ['bhau bij', 'भाऊ बीज'],
  ['narak chaturdashi', 'नरक चतुर्दशी'],
  ['dhanteras', 'धनत्रयोदशी'],
]

for (const [en, mr] of FESTIVALS) add(en, mr)

// ── 3j. Family relations ─────────────────────────────────────────────

const FAMILY = [
  ['aai', 'आई'],
  ['baba', 'बाबा'],
  ['aajoba', 'आजोबा'],
  ['aajji', 'आज्जी'],
  ['bhai', 'भाऊ'],
  ['bahin', 'बहीण'],
  ['kaka', 'काका'],
  ['kaki', 'काकी'],
  ['mama', 'मामा'],
  ['mami', 'मामी'],
  ['atya', 'आत्या'],
  ['mavashi', 'मावशी'],
  ['bhao', 'भाऊ'],
  ['putra', 'पुत्र'],
  ['mulga', 'मुलगा'],
  ['mulgi', 'मुलगी'],
  ['patni', 'पत्नी'],
  ['navra', 'नवरा'],
  ['baiko', 'बायको'],
  ['sasara', 'सासरा'],
  ['sasu', 'सासू'],
  ['bhave', 'भावे'],
]

for (const [en, mr] of FAMILY) add(en, mr)

// ── 3k. Common verbs (infinitive) ────────────────────────────────────

const VERBS = [
  ['jane', 'जाणे'],
  ['yene', 'येणे'],
  ['karne', 'करणे'],
  ['khane', 'खाणे'],
  ['piene', 'पिणे'],
  ['bolne', 'बोलणे'],
  ['baghne', 'बघणे'],
  ['aikne', 'ऐकणे'],
  ['vachne', 'वाचणे'],
  ['likhne', 'लिहिणे'],
  ['dhavne', 'धावणे'],
  ['bassne', 'बसणे'],
  ['udhne', 'उठणे'],
  ['jhapne', 'झोपणे'],
  ['hasne', 'हसणे'],
  ['radne', 'रडणे'],
  ['khelne', 'खेळणे'],
  ['shikne', 'शिकणे'],
  ['shikvne', 'शिकवणे'],
  ['vikhne', 'विकणे'],
]

for (const [en, mr] of VERBS) add(en, mr)

// ── 3l. Numbers 0-100 ───────────────────────────────────────────────

const UNIT_MR = ['शून्य', 'एक', 'दोन', 'तीन', 'चार', 'पाच', 'सहा', 'सात', 'आठ', 'नऊ']
const TEENS_MR = ['दहा', 'अकरा', 'बारा', 'तेरा', 'चौदा', 'पंधरा', 'सोळा', 'सतरा', 'अठरा', 'एकोणीस']
const TENS_MR = ['', 'दहा', 'वीस', 'तीस', 'चाळीस', 'पन्नास', 'साठ', 'सत्तर', 'ऐंशी', 'नव्वद']

const MARATHI_DIGITS = ['०', '१', '२', '३', '४', '५', '६', '७', '८', '९']

function numberToMarathiWord(n) {
  if (n >= 0 && n <= 9) return UNIT_MR[n]
  if (n >= 10 && n <= 19) return TEENS_MR[n - 10]
  if (n < 100) {
    const t = Math.floor(n / 10)
    const u = n % 10
    if (u === 0) return TENS_MR[t]
    return TENS_MR[t] + ' ' + UNIT_MR[u]
  }
  return ''
}

function numberToMarathiDigits(n) {
  return String(n).split('').map(d => MARATHI_DIGITS[parseInt(d)]).join('')
}

const TENS_EN = ['zero', 'ten', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety']
const UNIT_EN = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine']
const TEENS_EN = ['ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen']

function numberToEnglishWord(n) {
  if (n >= 0 && n <= 9) return UNIT_EN[n]
  if (n >= 10 && n <= 19) return TEENS_EN[n - 10]
  if (n < 100) {
    const t = Math.floor(n / 10)
    const u = n % 10
    if (u === 0) return TENS_EN[t]
    return TENS_EN[t] + ' ' + UNIT_EN[u]
  }
  return ''
}

// Number pairs: English word → Marathi word
for (let n = 0; n <= 100; n++) {
  const en = numberToEnglishWord(n)
  const mr = numberToMarathiWord(n)
  if (en && mr) add(en, mr)
  // Also digit form
  add(String(n), numberToMarathiDigits(n))
}

// Round numbers
for (const n of [200, 300, 400, 500, 600, 700, 800, 900, 1000]) {
  add(String(n), numberToMarathiDigits(n))
}

// Prices as spoken
const PRICES = [
  ['five rupees', 'पाच रुपये'],
  ['ten rupees', 'दहा रुपये'],
  ['twenty rupees', 'वीस रुपये'],
  ['fifty rupees', 'पन्नास रुपये'],
  ['one hundred rupees', 'शंभर रुपये'],
  ['two hundred rupees', 'दोनशे रुपये'],
  ['five hundred rupees', 'पाचशे रुपये'],
  ['one thousand rupees', 'एक हजार रुपये'],
]
for (const [en, mr] of PRICES) add(en, mr)

// ── 3m. Daily conversation phrases ──────────────────────────────────

const PHRASES = [
  ['namaskar', 'नमस्कार'],
  ['namaste', 'नमस्ते'],
  ['kasa aahes', 'कसा आहेस'],
  ['kashi aahes', 'कशी आहेस'],
  ['mi thik aahe', 'मी ठीक आहे'],
  ['tumhi kase aahat', 'तुम्ही कसे आहात'],
  ['dhanyavaad', 'धन्यवाद'],
  ['abhari aahe', 'आभारी आहे'],
  ['krupaya', 'कृपया'],
  ['ho', 'हो'],
  ['nahi', 'नाही'],
  ['mala mahit naahi', 'मला माहित नाही'],
  ['mala samajle', 'मला समजले'],
  ['punar bhetuya', 'पुन्हा भेटूया'],
  ['achha', 'छान'],
  ['bachha', 'बछा'],
  ['bhari aahe', 'भारी आहे'],
  ['kay re', 'काय रे'],
  ['kay mala sang', 'काय मला सांग'],
  ['ye na', 'ये ना'],
  ['jaa', 'जा'],
  ['thev', 'ठेव'],
  ['ghya', 'घ्या'],
  ['majha naam', 'माझं नाव'],
  ['tujha naam', 'तुझं नाव'],
  ['kitil', 'किती'],
  ['kuthla', 'कुठला'],
  ['kothe aahe', 'कोठे आहे'],
  ['kay pahije', 'काय पाहिजे'],
  ['mala pahije', 'मला पाहिजे'],
  ['kiti paise', 'किती पैसे'],
]

for (const [en, mr] of PHRASES) {
  add(en, mr)
  // Add title-cased version
  add(en.charAt(0).toUpperCase() + en.slice(1), mr)
}

// ── 3n. Systematic CV pairs: consonant + vowel ──────────────────────

// Build lists of consonant keys (in Devanagari sort order, all unique)
const CONSONANT_ENTRIES = [
  ['k', 'क'], ['kh', 'ख'], ['g', 'ग'], ['gh', 'घ'], ['ng', 'ङ'],
  ['ch', 'च'], ['chh', 'छ'], ['j', 'ज'], ['jh', 'झ'],
  ['T', 'ट'], ['Th', 'ठ'], ['D', 'ड'], ['Dh', 'ढ'], ['N', 'ण'],
  ['t', 'त'], ['th', 'थ'], ['d', 'द'], ['dh', 'ध'], ['n', 'न'],
  ['p', 'प'], ['ph', 'फ'], ['b', 'ब'], ['bh', 'भ'], ['m', 'म'],
  ['y', 'य'], ['r', 'र'], ['l', 'ल'], ['v', 'व'],
  ['sh', 'श'], ['Sh', 'ष'], ['s', 'स'], ['h', 'ह'],
]

// Vowel entries with their matra forms (skipping 'a' since it's inherent)
const VOWEL_ENTRIES = [
  ['aa', 'ा'], ['i', 'ि'], ['ii', 'ी'],
  ['u', 'ु'], ['uu', 'ू'], ['e', 'े'], ['ai', 'ै'],
  ['o', 'ो'], ['au', 'ौ'],
]

// CV pairs: each consonant + each explicit vowel
for (const [cKey, cDev] of CONSONANT_ENTRIES) {
  // C + inherent 'a'
  const inherentWord = cKey
  add(inherentWord, cDev)

  // C + each explicit vowel
  for (const [vKey, vMatra] of VOWEL_ENTRIES) {
    const en = cKey + vKey
    const mr = cDev + vMatra
    add(en, mr)
  }
}

// ── 3o. CV pairs with explicit 'a' (inherent vowel) ─────────────
// These are the most common Marathi syllable patterns:
//   'ka' → 'क'  (consonant + inherent 'a', spelled out)
//   'kata' → 'कत' (CVCV with inherent 'a')

for (const [cKey, cDev] of CONSONANT_ENTRIES) {
  // C + explicit 'a' (inherent vowel in romanized form)
  add(cKey + 'a', cDev)

  // Ca + C (sequence, not conjunct)
  for (const [c2Key, c2Dev] of CONSONANT_ENTRIES) {
    add(cKey + 'a' + c2Key, cDev + c2Dev)

    // Ca + C + explicit vowel
    for (const [v2Key, v2Matra] of VOWEL_ENTRIES) {
      add(cKey + 'a' + c2Key + v2Key, cDev + c2Dev + v2Matra)
    }
  }
}

// ── 3p. VCV pairs: vowel + consonant + vowel ────────────────────────

const VOWEL_KEYS = ['a', 'aa', 'i', 'ii', 'u', 'uu', 'e', 'ai', 'o', 'au']

for (const v1 of VOWEL_KEYS) {
  for (const [cKey, cDev] of CONSONANT_ENTRIES) {
    // V1 + C + inherent 'a'
    const en1 = v1 + cKey
    const mr1 = VOWELS[v1] + cDev
    add(en1, mr1)

    // V1 + C + each explicit vowel
    for (const [v2Key, v2Matra] of VOWEL_ENTRIES) {
      const en = v1 + cKey + v2Key
      const mr = VOWELS[v1] + cDev + v2Matra
      add(en, mr)
    }
  }
}

// ── 3p. CVC pairs: each CV + final C + V ────────────────────────────

for (const [c1Key, c1Dev] of CONSONANT_ENTRIES) {
  // CV1 with inherent 'a'
  for (const [c2Key, c2Dev] of CONSONANT_ENTRIES) {
    const en = c1Key + c2Key
    const mr = c1Dev + '्' + c2Dev
    add(en, mr)
  }

  // CV1 + each explicit vowel + C2
  for (const [v1Key, v1Matra] of VOWEL_ENTRIES) {
    const cv = c1Dev + v1Matra
    const prefix = c1Key + v1Key

    // Just CV (no second consonant) — already covered in CV pairs above
    // CV + inherent C2 (with halant if consonant follows)
    for (const [c2Key, c2Dev] of CONSONANT_ENTRIES) {
      const en = prefix + c2Key
      const mr = cv + '्' + c2Dev
      add(en, mr)
    }

    // CV + C2 + each explicit vowel
    for (const [c2Key, c2Dev] of CONSONANT_ENTRIES) {
      for (const [v2Key, v2Matra] of VOWEL_ENTRIES) {
        const en = prefix + c2Key + v2Key
        const mr = cv + c2Dev + v2Matra
        add(en, mr)
      }
    }
  }
}

// ── 3q. Anusvara pairs: consonant + vowel + n/m + consonant ────────

for (const [c1Key, c1Dev] of CONSONANT_ENTRIES) {
  for (const [vKey, vMatra] of VOWEL_ENTRIES) {
    const cv = c1Dev + vMatra
    const prefix = c1Key + vKey

    for (const [c2Key, c2Dev] of CONSONANT_ENTRIES) {
      // n + consonant → anusvara
      const enN = prefix + 'n' + c2Key
      const mrN = cv + 'ं' + c2Dev
      add(enN, mrN)

      // m + consonant → anusvara
      const enM = prefix + 'm' + c2Key
      const mrM = cv + 'ं' + c2Dev
      add(enM, mrM)
    }
  }
}

// ── 3r. Compound characters ─────────────────────────────────────────

const COMPOUNDS = [
  ['ksha', 'क्ष'], ['tra', 'त्र'], ['gya', 'ज्ञ'],
  ['jnya', 'ज्ञ'], ['shra', 'श्र'],
]

for (const [en, mr] of COMPOUNDS) {
  add(en, mr)

  // Compound with vowel endings
  for (const [vKey, vMatra] of VOWEL_ENTRIES) {
    add(en + vKey, mr + vMatra)
  }
}

// ── 3s. Marathi conjuncts (halant combinations) ─────────────────────

const COMMON_CONJUNCTS = [
  ['kta', 'क्त'], ['kya', 'क्य'], ['kra', 'क्र'],
  ['gya', 'ग्य'], ['gra', 'ग्र'],
  ['cha', 'च्च'], ['chra', 'च्र'],
  ['jna', 'ज्न'], ['jya', 'ज्य'],
  ['tta', 'त्त'], ['tya', 'त्य'], ['tra', 'त्र'],
  ['dda', 'द्द'], ['dya', 'द्य'], ['dra', 'द्र'], ['ddha', 'द्ध'],
  ['nta', 'न्त'], ['ntya', 'न्त्य'], ['ndra', 'न्द्र'],
  ['pya', 'प्य'], ['pra', 'प्र'], ['pla', 'प्ल'],
  ['bya', 'ब्य'], ['bra', 'ब्र'],
  ['mya', 'म्य'],
  ['rya', 'र्य'],
  ['lya', 'ल्य'],
  ['vya', 'व्य'], ['vra', 'व्र'],
  ['sha', 'श्श'], ['shra', 'श्र'], ['shya', 'श्य'],
  ['sna', 'स्न'], ['sma', 'स्म'], ['sya', 'स्य'], ['sra', 'स्र'],
  ['hma', 'ह्म'], ['hya', 'ह्य'],
]

for (const [en, mr] of COMMON_CONJUNCTS) {
  add(en, mr)
}

// ── 3t. Numbers in English digit form with numeral output ───────────

// Also add mixed-digit dates and prices
for (let y = 1900; y <= 2026; y++) {
  add(String(y), numberToMarathiDigits(y))
}

// Currency amounts
const CURRENCIES = ['5', '10', '20', '50', '100', '200', '500', '1000', '250', '75', '150', '350', '450', '1250', '2500']
for (const c of CURRENCIES) {
  add('₹' + c, '₹' + numberToMarathiDigits(parseInt(c)))
  add('Rs. ' + c, '₹' + numberToMarathiDigits(parseInt(c)))
  add(c + ' rupees', numberToMarathiDigits(parseInt(c)) + ' रुपये')
}

// ── 3u. More product/retail Marathi words ────────────────────────────

const RETAIL = [
  ['bhajani', 'भाजणी'],
  ['kurmura', 'कुरमुरे'],
  ['poha', 'पोहे'],
  ['sabudana', 'साबुदाणा'],
  ['rava', 'रवा'],
  ['maida', 'मैदा'],
  ['besan', 'बेसन'],
  ['soya', 'सोया'],
  ['papad', 'पापड'],
  ['shev', 'शेव'],
  ['farsaan', 'फरसाण'],
  ['bhaji', 'भाजी'],
  ['panipuri', 'पाणीपुरी'],
  ['sev puri', 'सेव पुरी'],
  ['bhel', 'भेळ'],
  ['dahi', 'दही'],
  ['lassi', 'लस्सी'],
  ['shrikhand', 'श्रीखंड'],
  ['kheer', 'खीर'],
  ['basaundi', 'बासुंदी'],
  ['peda', 'पेढा'],
  ['barfi', 'बर्फी'],
  ['shankarpali', 'शंकरपाळी'],
  ['anarsa', 'अनारसे'],
]

for (const [en, mr] of RETAIL) add(en, mr)

// ── 3v. Country names (Marathi transliterations) ─────────────────────

const COUNTRIES = [
  ['india', 'भारत'],
  ['america', 'अमेरिका'],
  ['england', 'इंग्लंड'],
  ['japan', 'जपान'],
  ['china', 'चीन'],
  ['russia', 'रशिया'],
  ['france', 'फ्रान्स'],
  ['germany', 'जर्मनी'],
  ['australia', 'ऑस्ट्रेलिया'],
  ['canada', 'कॅनडा'],
  ['brazil', 'ब्राझील'],
  ['south africa', 'दक्षिण आफ्रिका'],
  ['pakistan', 'पाकिस्तान'],
  ['bangladesh', 'बांगलादेश'],
  ['nepal', 'नेपाळ'],
  ['sri lanka', 'श्रीलंका'],
  ['thailand', 'थायलंड'],
  ['singapore', 'सिंगापूर'],
  ['dubai', 'दुबई'],
  ['qatar', 'कतार'],
]

for (const [en, mr] of COUNTRIES) add(en, mr)

// ── 3w. Attribute words ─────────────────────────────────────────────

const ATTRIBUTES = [
  ['good', 'चांगले'],
  ['bad', 'वाईट'],
  ['big', 'मोठे'],
  ['small', 'लहान'],
  ['hot', 'गरम'],
  ['cold', 'थंड'],
  ['new', 'नवीन'],
  ['old', 'जुने'],
  ['sweet', 'गोड'],
  ['sour', 'आंबट'],
  ['spicy', 'तीखट'],
  ['salty', 'खारट'],
  ['bitter', 'कडू'],
  ['soft', 'मऊ'],
  ['hard', 'कठीण'],
  ['light', 'हलके'],
  ['heavy', 'जड'],
  ['clean', 'स्वच्छ'],
  ['dirty', 'घाण'],
  ['dry', 'सुके'],
  ['wet', 'ओले'],
]

for (const [en, mr] of ATTRIBUTES) add(en, mr)

// ── 3x. Body parts ──────────────────────────────────────────────────

const BODY = [
  ['dok', 'डोक'],
  ['kes', 'केस'],
  ['kapal', 'कपाळ'],
  ['dol', 'डोळे'],
  ['nak', 'नाक'],
  ['tond', 'तोंड'],
  ['kan', 'कान'],
  ['gaal', 'गाल'],
  ['hoth', 'ओठ'],
  ['jibh', 'जीभ'],
  ['dant', 'दात'],
  ['gala', 'गळा'],
  ['khanda', 'खांदा'],
  ['hat', 'हात'],
  ['pangal', 'पंजा'],
  ['bot', 'बोट'],
  ['pott', 'पोट'],
  ['naal', 'नाळ'],
  ['paya', 'पाय'],
  ['gudgha', 'गुड्घा'],
  ['tak', 'टाक'],
]

for (const [en, mr] of BODY) add(en, mr)

// ── 3y. Generate alternate spellings ─────────────────────────────────

// For every existing pair whose English key has alternate viable input forms,
// add those alternates. (Many are already added explicitly above.)
// Now add systematic alternates: drop/reduce geminated vowels.
const newPairs = []
for (const p of pairs) {
  const e = p.english

  // 'aa' → 'a' at end of word
  if (e.endsWith('aa')) {
    newPairs.push({ english: e.slice(0, -2) + 'a', marathi: p.marathi })
  }

  // 'ii' → 'i' at end
  if (e.endsWith('ii')) {
    newPairs.push({ english: e.slice(0, -2) + 'i', marathi: p.marathi })
  }

  // 'uu' → 'u' at end
  if (e.endsWith('uu')) {
    newPairs.push({ english: e.slice(0, -2) + 'u', marathi: p.marathi })
  }

  // 'sh' → 's' variations (e.g. nashik / nasik)
  if (e.includes('sh')) {
    newPairs.push({ english: e.replace('sh', 's'), marathi: p.marathi })
  }

  // Double consonants → single (e.g. chikki → chiki)
  const dedup = e.replace(/([a-z])\1/g, '$1')
  if (dedup !== e && dedup.length > 1) {
    newPairs.push({ english: dedup, marathi: p.marathi })
  }

  // Remove trailing 'a' for masculine words (common in Marathi)
  if (e.endsWith('a') && !e.endsWith('aa')) {
    newPairs.push({ english: e.slice(0, -1), marathi: p.marathi })
  }

  // Capitalize first letter
  const cap = e.charAt(0).toUpperCase() + e.slice(1)
  if (cap !== e) {
    newPairs.push({ english: cap, marathi: p.marathi })
  }

  // 'w' → 'v' variation
  if (e.includes('w')) {
    newPairs.push({ english: e.replace('w', 'v'), marathi: p.marathi })
  }
  if (e.includes('v')) {
    newPairs.push({ english: e.replace('v', 'w'), marathi: p.marathi })
  }
}

// Add new alternate pairs (deduplicating)
for (const np of newPairs) {
  const key = np.english.toLowerCase().trim()
  if (!seen.has(key) && /^[a-zA-Z\s]+$/.test(key.trim())) {
    seen.add(key)
    pairs.push(np)
  }
}

// ── 3z. Final deduplication and shuffle ──────────────────────────────

// Remove any remaining duplicates by English (lowercase)
const unique = new Map()
for (const p of pairs) {
  const key = p.english.toLowerCase().trim()
  if (!unique.has(key)) {
    unique.set(key, p)
  }
}

const finalPairs = Array.from(unique.values())

// Shuffle for better training (deterministic for reproducibility)
for (let i = finalPairs.length - 1; i > 0; i--) {
  const j = (i * 7 + 13) % (i + 1)   // pseudo-random
  ;[finalPairs[i], finalPairs[j]] = [finalPairs[j], finalPairs[i]]
}

// ═══════════════════════════════════════════════════════════════════════
//  4. Write output
// ═══════════════════════════════════════════════════════════════════════

const jsonl = finalPairs.map(p => JSON.stringify(p)).join('\n')
writeFileSync('marathi_transliteration_dataset.jsonl', jsonl, 'utf-8')

console.log(`✅ Generated ${finalPairs.length} training pairs`)
console.log(`📁 Saved to marathi_transliteration_dataset.jsonl`)
console.log()
console.log('First 5 entries:')
for (let i = 0; i < Math.min(5, finalPairs.length); i++) {
  console.log(`  ${JSON.stringify(finalPairs[i])}`)
}
