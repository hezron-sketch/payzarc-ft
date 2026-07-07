// Mock indicative rates — shared by the landing-page converter (App.js) and
// the Send Money flow (Home.js). Swap for a live FX API when one exists.
export const EXCHANGE_RATES = {
  USD: { KES: 129.5, INR: 83.3, NGN: 1500, GHS: 15.5, UGX: 3700 },
  GBP: { KES: 165, INR: 106, NGN: 1920, GHS: 19.8, UGX: 4730 },
  EUR: { KES: 140, INR: 90, NGN: 1640, GHS: 16.8, UGX: 4020 },
  CAD: { KES: 95, INR: 61, NGN: 1100, GHS: 11.4, UGX: 2720 },
  AUD: { KES: 83, INR: 53, NGN: 960, GHS: 9.9, UGX: 2360 },
  KES: { USD: 0.0077, INR: 0.64, NGN: 11.6, GHS: 0.12, UGX: 28.6 },
};
