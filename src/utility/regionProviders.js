const REGIONS = {
  KE: {
    mobileMoney: ["Safaricom M-Pesa", "Airtel Money"],
    partnerBanks: [
      "KCB Bank",
      "Diamond Trust Bank",
      "Equity Bank",
      "Co-operative Bank",
    ],
  },
  EU: {
    mobileMoney: [],
    partnerBanks: ["Wise", "Revolut", "SEPA Bank Transfer"],
  },
  US: {
    mobileMoney: [],
    partnerBanks: ["Chase", "Wells Fargo", "ACH Bank Transfer"],
  },
  default: {
    mobileMoney: [],
    partnerBanks: ["Bank Transfer"],
  },
};

export function getRegionProviders(myCountry) {
  if (!myCountry) return REGIONS.default;
  if (myCountry.name === "Kenya") return REGIONS.KE;
  if (myCountry.name === "United States") return REGIONS.US;
  if (myCountry.currency === "EUR") return REGIONS.EU;
  return REGIONS.default;
}
