
const countryCurrencyMap: { [key: string]: string } = {
    'US': 'USD',
    'GB': 'GBP',
    'ZA': 'ZAR', // Added South Africa
    'JP': 'JPY',
    'AU': 'AUD',
    'CA': 'CAD',
    'CH': 'CHF',
    'CN': 'CNY',
    'SE': 'SEK',
    'NZ': 'NZD',
    // Add more mappings as needed
};

export const currencySymbolMap: { [key: string]: string } = {
    'USD': '$',
    'GBP': '£',
    'EUR': '€',
    'ZAR': 'R', // Added South African Rand symbol
    'JPY': '¥',
    'AUD': '$',
    'CAD': '$',
    'CHF': 'Fr',
    'CNY': '¥',
    'SEK': 'kr',
    'NZD': '$',
};

export const getCurrencyFromLocale = (locale: string): string => {
    const countryCode = locale.split('-')[1];
    return countryCurrencyMap[countryCode] || 'USD'; // Default to USD
};

export const getCurrencySymbol = (currency: string): string => {
    return currencySymbolMap[currency] || '$'; // Default to $
};
