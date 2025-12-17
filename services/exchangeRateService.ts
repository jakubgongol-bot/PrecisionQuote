
export const fetchExchangeRate = async (fromCurrency: string, toCurrency: string): Promise<number | null> => {
  try {
    // Using frankfurter.app - a free, open-source API for exchange rates
    // It does not require an API key.
    const response = await fetch(`https://api.frankfurter.app/latest?from=${fromCurrency}&to=${toCurrency}`);
    
    if (!response.ok) {
      throw new Error('Network response was not ok');
    }

    const data = await response.json();
    return data.rates[toCurrency];
  } catch (error) {
    console.error("Failed to fetch exchange rate:", error);
    return null;
  }
};
