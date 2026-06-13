/**
 * English → Marathi lookup for all known category names stored in the database.
 * Categories are stored in English; this map translates them for Marathi display.
 */
export const CATEGORY_MAP = {
  // Current categories used in the store
  'Groceries': { en: 'Groceries', mr: 'किराणा' },
  'Sweets & Snacks': { en: 'Sweets & Snacks', mr: 'गोडे व स्नॅक्स' },
  'Spices': { en: 'Spices', mr: 'मसाले' },
  'Grains & Rice': { en: 'Grains & Rice', mr: 'धान्य व तांदूळ' },
  'Pickles & Chutneys': { en: 'Pickles & Chutneys', mr: 'लोणची व चटण्या' },
  'Beverages': { en: 'Beverages', mr: 'पेये' },

  // Future / expansion categories (translations ready when needed)
  'Oils & Ghee': { en: 'Oils & Ghee', mr: 'तेल व तूप' },
  'Dairy': { en: 'Dairy', mr: 'दुग्धजन्य पदार्थ' },
  'Dry Fruits': { en: 'Dry Fruits', mr: 'सुकामेवा' },
  'Snacks': { en: 'Snacks', mr: 'स्नॅक्स' },
  'Frozen Foods': { en: 'Frozen Foods', mr: 'गोठवलेले पदार्थ' },
  'Personal Care': { en: 'Personal Care', mr: 'वैयक्तिक काळजी' },
  'Household': { en: 'Household', mr: 'घरगुती वस्तू' },
  'Baby Care': { en: 'Baby Care', mr: 'बाळ काळजी' },
  'Puja Items': { en: 'Puja Items', mr: 'पूजा साहित्य' },
  'Organic': { en: 'Organic', mr: 'सेंद्रिय' },
}

const translations = {
  en: {
    // Header
    brandName: 'Shriram Traders',
    brandNameMr: 'श्रीराम ट्रेडर्स',
    tagline: 'Fresh Indian Groceries Delivered to Your Doorstep',
    home: 'Home',
    products: 'Products',
    contact: 'Contact',

    // Search
    searchPlaceholder: 'Search products...',

    // Filters
    filters: 'Filters',
    allCategories: 'All Categories',
    category: 'Category',
    priceRange: 'Price Range',
    minPrice: 'Min Price',
    maxPrice: 'Max Price',
    availability: 'Availability',
    showOutOfStock: 'Show Out of Stock',
    apply: 'Apply',
    clearFilters: 'Clear Filters',
    filtersApplied: 'Filters Applied',

    // Products
    productsFound: 'products found',
    noProducts: 'No products found. Try adjusting your filters.',
    sortBy: 'Sort by',
    sortDefault: 'Default',
    sortPriceLow: 'Price: Low to High',
    sortPriceHigh: 'Price: High to Low',
    sortName: 'Name',

    // Product Card
    outOfStock: 'Out of Stock',
    inStock: 'In Stock',
    viewDetails: 'View Details',
    of: 'of',

    // Language
    language: 'Language',

    // Footer
    footerTagline: 'Your trusted source for authentic Indian groceries.',
    followUs: 'Follow Us',
    quickLinks: 'Quick Links',
    contactUs: 'Contact Us',
    owner: 'Owner',
    ownerName: 'Ketan Shinde',
    phone: 'Phone',
    allRightsReserved: 'All rights reserved.',

    // Price
    currency: '₹',
    mrp: 'MRP',

    // Load More
    loadMore: 'Load More',

    // Loading
    loading: 'Loading...',
  },
  mr: {
    // Header
    brandName: 'Shriram Traders',
    brandNameMr: 'श्रीराम ट्रेडर्स',
    tagline: 'ताजे भारतीय किराणा तुमच्या दारापर्यंत',
    home: 'मुख्यपृष्ठ',
    products: 'उत्पादने',
    contact: 'संपर्क',

    // Search
    searchPlaceholder: 'उत्पादने शोधा...',

    // Filters
    filters: 'फिल्टर',
    allCategories: 'सर्व श्रेण्या',
    category: 'श्रेणी',
    priceRange: 'किंमत श्रेणी',
    minPrice: 'किमान किंमत',
    maxPrice: 'कमाल किंमत',
    availability: 'उपलब्धता',
    showOutOfStock: 'स्टॉक संपले दाखवा',
    apply: 'लागू करा',
    clearFilters: 'फिल्टर साफ करा',
    filtersApplied: 'फिल्टर लागू',

    // Products
    productsFound: 'उत्पादने सापडली',
    noProducts: 'कोणतीही उत्पादने सापडली नाहीत. कृपया फिल्टर बदलून पहा.',
    sortBy: 'क्रमवारी',
    sortDefault: 'डीफॉल्ट',
    sortPriceLow: 'किंमत: कमी ते जास्त',
    sortPriceHigh: 'किंमत: जास्त ते कमी',
    sortName: 'नाव',

    // Product Card
    outOfStock: 'स्टॉक संपला',
    inStock: 'स्टॉकमध्ये आहे',
    viewDetails: 'तपशील पहा',
    of: 'पैकी',

    // Category Names
    catGroceries: 'किराणा',
    catSweets: 'गोडे व स्नॅक्स',
    catSpices: 'मसाले',
    catGrains: 'धान्य व तांदूळ',
    catPickles: 'लोणची व चटण्या',
    catBeverages: 'पेये',

    // Language
    language: 'भाषा',

    // Footer
    footerTagline: 'प्रामाणिक भारतीय किराणा मालासाठी तुमचा विश्वासू स्रोत.',
    followUs: 'आमचे अनुसरण करा',
    quickLinks: 'Quick Links',
    contactUs: 'आमच्याशी संपर्क साधा',
    owner: 'मालक',
    ownerName: 'केतन शिंदे',
    phone: 'फोन',
    allRightsReserved: 'सर्व हक्क राखीव.',

    // Price
    currency: '₹',
    mrp: 'MRP',

    // Load More
    loadMore: 'अधिक लोड करा',

    // Loading
    loading: 'लोड होत आहे...',
  },
}

export default translations
