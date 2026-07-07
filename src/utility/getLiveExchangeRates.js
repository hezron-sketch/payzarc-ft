// Free, keyless FX rates API (same no-signup style as getCurrentCountry.js's
// ipapi.co call). Returns rates for every currency it tracks, so the Send
// Money conversion isn't limited to the small mocked EXCHANGE_RATES table.
export async function getLiveExchangeRates(baseCurrency) {
  try {
    const response = await fetch(
      `https://open.er-api.com/v6/latest/${baseCurrency}`,
    );
    if (!response.ok) throw new Error("Network response was not ok");
    const data = await response.json();
    if (data.result !== "success" || !data.rates) {
      throw new Error(data["error-type"] || "Failed to fetch exchange rates");
    }
    return data.rates;
  } catch (error) {
    console.error("Live exchange rate fetch failed:", error);
    return null;
  }
}
