// Shared plumbing for the dashboard's money-out flows (SendMoney.js,
// SendToMany.js, Withdraw.js). They all authorize the same way (transaction
// PIN, or Face ID chosen in ReviewSheet.js; see authorize()),
// and postTransfer() below stays the single place that credential is
// attached to a request.
import React from "react";
import { transactionsApi } from "../../utility/axiosInstance";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { countries } from "../../utility/countries";
import {
  primaryBtnClass,
  assertDelivered,
} from "./shared";

// The one place a transaction credential goes out: `{ pin }` as JSON, or
// `{ faceImage }` (a JPEG data URL from Face.js) as a multipart upload the
// backend re-verifies. `idempotencyKey` (see newIdempotencyKey) rides along
// as a header so retrying the same reviewed transfer can't charge twice.
// Resolves to the response body; rejects if the body says it failed.
export const postTransfer = async (
  url,
  body,
  { pin, faceImage },
  idempotencyKey,
) => {
  let payload;
  if (pin) {
    payload = { ...body, transaction_pin: pin, authentication_method: "PIN" };
  } else {
    payload = new FormData();
    Object.entries(body).forEach(([k, v]) => payload.append(k, String(v)));
    payload.append("authentication_method", "FACE");
    const blob = await (await fetch(faceImage)).blob();
    payload.append("face_image", blob, "face_verification.jpg");
  }
  const { data } = await transactionsApi.post(url, payload, {
    headers: idempotencyKey ? { "Idempotency-Key": idempotencyKey } : {},
  });
  return assertDelivered(data, "Transaction could not be delivered.");
};

// A full PIN wins; a blank one falls back to face verification. Resolves to
// postTransfer's credential, or null if the user cancelled the face scan.
export const authorize = async (pin, requestFace) => {
  if (pin.length === 4) return { pin };
  const faceImage = await requestFace();
  return faceImage ? { faceImage } : null;
};

// ponytail: flat 1.5% with a $1 minimum — placeholder pricing shared by
// single Send and Send to Many until a real fees/pricing API replaces it.
export const calcTransferFee = (amount) =>
  amount > 0 ? Math.max(1, amount * 0.015) : 0;

export const addFavouriteBtnClass =
  "self-start bg-transparent border-none text-gold text-[0.8rem] font-semibold cursor-pointer p-0 -mt-[0.6rem] transition-opacity hover:opacity-75";

// countries.js stores each entry's ISO alpha-2 code under `flag` (e.g. "KE");
// this turns that into an actual flag emoji. Already-emoji values (the
// getCurrentCountry error-fallback returns one directly) pass through as-is.
export const isoToFlagEmoji = (iso) =>
  /^[A-Z]{2}$/.test(iso)
    ? String.fromCodePoint(...[...iso].map((c) => 127397 + c.charCodeAt(0)))
    : iso;

export const recipientLabel = (r) => r.name || r.full_name || r.phone || r.value;

// Recipient's country, detected from whatever was typed/picked so we can
// show their flag. A phone number's dial code gives this away instantly;
// an email only reveals it if that address already belongs to one of our
// favourites/contacts (i.e. an existing user) — otherwise we know nothing
// about them yet.
export const findCountryByName = (name) =>
  name
    ? countries.find((c) => c.name.toLowerCase() === name.toLowerCase())
    : null;

// Country from a phone number's dial code alone (longest/most specific
// code wins, e.g. +1 US vs +1 area-coded territories).
export const detectCountryFromPhone = (value) => {
  const digits = (value || "").replace(/[^\d+]/g, "");
  if (!digits) return null;
  const matches = countries
    .filter((c) => digits.startsWith(c.code))
    .sort((a, b) => b.code.length - a.code.length);
  return matches[0] || null;
};

// A stored country name wins if present (favourites), otherwise fall back
// to their phone's dial code.
export const detectRecipientCountry = (r) =>
  findCountryByName(r?.country || r?.country_name) ||
  detectCountryFromPhone(r?.phone || r?.value || r?.phone_number);

export const errorMessage = (error, fallback) =>
  error.response
    ? error.response.data?.message ||
      error.response.data?.error ||
      error.response.data?.reason ||
      fallback
    : error.message || fallback;

// Resolves a phone/email to the registered account holder's name before any
// money moves, so the confirm dialog shows who will actually receive it.
// Throws (with the server's message) when the recipient isn't found.
export const lookupRecipientName = async (value) => {
  const { data = {} } = await transactionsApi.post("/api/recipient-lookup/", {
    recipient_phone: value,
  });
  if (data.success === false || data.recipient_found === false) {
    throw new Error(
      data.error || data.message || `Recipient ${value} could not be found.`,
    );
  }
  const r = data.recipient || data;
  return r.full_name || r.name || value;
};

export const lookupErrorMessage = (error) =>
  error.response?.data?.error ||
  error.response?.data?.message ||
  error.response?.data?.detail ||
  error.message ||
  "Unable to find this recipient.";

export function FeeSummary({ currency, fee, total, className }) {
  return (
    <div
      aria-live="polite"
      className={cn(
        "flex flex-col gap-1.5 bg-white/[0.03] border border-white/[0.06] rounded-xl px-4 py-[0.85rem]",
        className,
      )}
    >
      <div className="flex items-center justify-between text-[0.85rem] text-muted-foreground">
        <span>Transaction Fee</span>
        <span>
          {currency} {fee.toFixed(2)}
        </span>
      </div>
      <div className="flex items-center justify-between text-[0.85rem] text-muted-foreground">
        <span>Total to pay</span>
        <span className="text-gold font-bold">
          {currency} {total.toFixed(2)}
        </span>
      </div>
    </div>
  );
}

export function InsufficientBalance({
  currency,
  total,
  formattedBalance,
  onAddMoney,
}) {
  return (
    <div
      role="status"
      className="flex flex-col gap-2 bg-destructive/10 border border-destructive/30 rounded-xl px-4 py-3.5">
      <span className="text-sm font-semibold text-destructive">
        Insufficient balance for this transfer.
      </span>
      <span className="text-xs text-muted-foreground">
        You need {currency} {total.toFixed(2)} but your balance is {currency}{" "}
        {formattedBalance}.
      </span>
      <Button type="button" className={primaryBtnClass} onClick={onAddMoney}>
        Deposit
      </Button>
    </div>
  );
}
