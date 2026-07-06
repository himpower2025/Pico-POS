
/**
 * Currency configuration and conversion utilities
 */

export const CURRENCY_CONFIG: Record<string, { rate: number; symbol: string; decimals: number }> = {
  'USD': { rate: 1.0, symbol: '$', decimals: 2 },
  'KRW': { rate: 1350.0, symbol: '₩', decimals: 0 },
  'NPR': { rate: 133.0, symbol: 'Rs.', decimals: 0 },
  'EUR': { rate: 0.92, symbol: '€', decimals: 2 },
  'INR': { rate: 83.50, symbol: '₹', decimals: 2 },
};

/**
 * Retrieves the configuration (rate, symbol, decimals) for a specific currency code,
 * supporting customized configurations loaded from localStorage.
 */
export const getCurrencyConfig = (currencyCode: string): { rate: number; symbol: string; decimals: number } => {
  try {
    const savedCustom = localStorage.getItem('pico_custom_currencies');
    if (savedCustom) {
      const parsed = JSON.parse(savedCustom);
      if (parsed[currencyCode]) {
        return parsed[currencyCode];
      }
    }
  } catch (e) {
    console.error('Error loading custom currency config:', e);
  }
  return CURRENCY_CONFIG[currencyCode] || CURRENCY_CONFIG['USD'];
};

/**
 * Converts a base USD amount to the target currency and formats it.
 * @param amountInUsd The base amount in USD
 * @param currencyCode The target currency code (USD, KRW, NPR, EUR, INR or custom)
 * @returns Formatted string with symbol and converted value
 */
export const formatCurrency = (amountInUsd: number, currencyCode: string = 'USD'): string => {
  const config = getCurrencyConfig(currencyCode);
  const convertedAmount = amountInUsd * config.rate;
  
  // Try using Intl formatting if the currencyCode is standard ISO
  const isStandardIso = /^[A-Z]{3}$/.test(currencyCode);
  if (isStandardIso) {
    try {
      const locale = 
        currencyCode === 'KRW' ? 'ko-KR' : 
        currencyCode === 'NPR' ? 'en-NP' : 
        currencyCode === 'INR' ? 'en-IN' : 
        'en-US';
      
      return new Intl.NumberFormat(locale, {
        style: 'currency',
        currency: currencyCode,
        minimumFractionDigits: config.decimals,
        maximumFractionDigits: config.decimals,
      }).format(convertedAmount);
    } catch (e) {
      // Fallback if formatting fails
    }
  }

  // Safe Manual Fallback for custom currencies or invalid codes
  const formattedNumber = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: config.decimals,
    maximumFractionDigits: config.decimals,
  }).format(convertedAmount);
  
  return `${config.symbol}${formattedNumber}`;
};

/**
 * Converts a base USD amount to the target currency value (number).
 * @param amountInUsd The base amount in USD
 * @param currencyCode The target currency code
 * @returns Converted numeric value
 */
export const convertCurrency = (amountInUsd: number, currencyCode: string = 'USD'): number => {
  const config = getCurrencyConfig(currencyCode);
  const converted = amountInUsd * config.rate;
  return config.decimals === 0 ? Math.round(converted) : Number(converted.toFixed(config.decimals));
};
