// countries.js stores each entry's ISO alpha-2 code under `flag` (e.g. "KE");
// this turns that into an actual flag emoji. Already-emoji values pass
// through as-is (e.g. getCurrentCountry's error-fallback returns one directly).
export const isoToFlagEmoji = (iso) =>
  /^[A-Z]{2}$/.test(iso)
    ? String.fromCodePoint(...[...iso].map((c) => 127397 + c.charCodeAt(0)))
    : iso;
