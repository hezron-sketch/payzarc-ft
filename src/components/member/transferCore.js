import React from "react";
import { transactionsApi } from "../../utility/axiosInstance";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { countries } from "../../utility/countries";
import { GLOBAL_AVG_REMITTANCE_COST } from "../../utility/constants";
import {
  primaryBtnClass,
  assertDelivered,
} from "./shared";

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

export const authorize = async (pin, requestFace) => {
  if (pin.length === 4) return { pin };
  const faceImage = await requestFace();
  return faceImage ? { faceImage } : null;
};

export const calcTransferFee = (amount) =>
  amount > 0 ? Math.max(1, amount * 0.015) : 0;

export const addFavouriteBtnClass =
  "self-start bg-transparent border-none text-gold text-[0.8rem] font-semibold cursor-pointer p-0 -mt-[0.6rem] transition-opacity hover:opacity-75";

export const isoToFlagEmoji = (iso) =>
  /^[A-Z]{2}$/.test(iso)
    ? String.fromCodePoint(...[...iso].map((c) => 127397 + c.charCodeAt(0)))
    : iso;

export const recipientLabel = (r) => r.name || r.full_name || r.phone || r.value;

export const findCountryByName = (name) =>
  name
    ? countries.find((c) => c.name.toLowerCase() === name.toLowerCase())
    : null;

export const detectCountryFromPhone = (value) => {
  const digits = (value || "").replace(/[^\d+]/g, "");
  if (!digits) return null;
  const matches = countries
    .filter((c) => digits.startsWith(c.code))
    .sort((a, b) => b.code.length - a.code.length);
  return matches[0] || null;
};

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
  // What the same amount would cost at the global average, minus our fee.
  const saved = (total - fee) * GLOBAL_AVG_REMITTANCE_COST - fee;
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
      {saved >= 0.01 && (
        <p className="m-0 pt-1.5 mt-0.5 border-t border-white/[0.06] text-[0.75rem] text-muted-foreground tabular-nums">
          ≈ {currency} {saved.toFixed(2)} less than the global average fee
          ({+(GLOBAL_AVG_REMITTANCE_COST * 100).toFixed(2)}%)
        </p>
      )}
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
