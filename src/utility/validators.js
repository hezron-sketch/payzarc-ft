// Shared field validators — pulled out so new forms don't each reinvent an
// email/phone/card regex (several already do, ad hoc, per-file).
export const isValidEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());

export const isValidPhone = (v) => /^\+?\d{7,15}$/.test(v.trim());

export const isValidCardNumber = (v) => /^\d{13,19}$/.test(v.replace(/\s/g, ""));

// MM/YY, and not already expired.
export const isValidExpiry = (v) => {
  const m = /^(\d{2})\/(\d{2})$/.exec(v.trim());
  if (!m) return false;
  const month = Number(m[1]);
  if (month < 1 || month > 12) return false;
  const year = 2000 + Number(m[2]);
  const expiry = new Date(year, month); // first of the month *after* expiry
  return expiry > new Date();
};

export const isPositiveAmount = (v) => v !== "" && Number(v) > 0;

// Rejects the one pair of characters every HTML/script injection payload
// needs (<script>, <img onerror=...>, etc.) so free-text fields (names,
// addresses, messages) can't carry markup through to the API.
//
// This is client-side defense-in-depth ONLY. React already escapes every
// value it renders (this app has no dangerouslySetInnerHTML), so there's no
// XSS-via-render path today — and no frontend check can stop a request sent
// straight to the API, bypassing the form entirely. SQL/command injection in
// particular is not a client-side problem at all: it's fixed by parameterized
// queries and output encoding on the server, not by filtering here.
export const isSafeText = (v) => !/[<>]/.test(v);
