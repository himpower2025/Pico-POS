
/**
 * Currency configuration and conversion utilities
 */

export const CURRENCY_CONFIG: Record<string, { rate: number; symbol: string; decimals: number }> = {
  'USD': { rate: 1.0, symbol: '$', decimals: 2 },
  'KRW': { rate: 1350.0, symbol: '₩', decimals: 0 },
  'NPR': { rate: 133.0, symbol: 'Rs.', decimals: 0 },
  'EUR': { rate: 0.92, symbol: '€', decimals: 2 },
};

/**
 * Converts a base USD amount to the target currency and formats it.
 * @param amountInUsd The base amount in USD
 * @param currencyCode The target currency code (USD, KRW, NPR, EUR)
 * @returns Formatted string with symbol and converted value
 */
export const formatCurrency = (amountInUsd: number, currencyCode: string = 'USD'): string => {
  const config = CURRENCY_CONFIG[currencyCode] || CURRENCY_CONFIG['USD'];
  const convertedAmount = amountInUsd * config.rate;
  
  return new Intl.NumberFormat(currencyCode === 'KRW' ? 'ko-KR' : currencyCode === 'NPR' ? 'en-NP' : 'en-US', {
    style: 'currency',
    currency: currencyCode,
    minimumFractionDigits: config.decimals,
    maximumFractionDigits: config.decimals,
  }).format(convertedAmount);
};

/**
 * Converts a base USD amount to the target currency value (number).
 * @param amountInUsd The base amount in USD
 * @param currencyCode The target currency code
 * @returns Converted numeric value
 */
export const convertCurrency = (amountInUsd: number, currencyCode: string = 'USD'): number => {
  const config = CURRENCY_CONFIG[currencyCode] || CURRENCY_CONFIG['USD'];
  const converted = amountInUsd * config.rate;
  return config.decimals === 0 ? Math.round(converted) : Number(converted.toFixed(config.decimals));
};
