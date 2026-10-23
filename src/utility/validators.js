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

export const isSafeText = (v) => !/[<>]/.test(v);
