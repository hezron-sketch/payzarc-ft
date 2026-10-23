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
