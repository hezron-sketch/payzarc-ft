// Every money-out flow on the dashboard lives here: Send, Send to Many and
// Withdraw. They're kept in one file on purpose — they all authorize with
// the same transaction PIN, and postTransfer() below is the single place
// that credential is attached to a request, so swapping/adding biometrics
// (e.g. a WebAuthn assertion instead of, or alongside, the PIN) is a change
// to that one function plus <PinInput>, not to each flow.
import React, { useEffect, useState } from "react";
import {
  Send,
  RefreshCw,
  Check,
  ChevronLeft,
  X,
  UsersRound,
} from "lucide-react";
import { contactsApi, transactionsApi } from "../../../utility/axiosInstance";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { countries } from "../../../utility/countries";
import { EXCHANGE_RATES } from "../../../utility/exchangeRates";
import { getRegionProviders } from "../../../utility/regionProviders";
import { isValidEmail, isValidPhone } from "../../../utility/validators";
import BankPicker from "./BankPicker";
import {
  formLabelClass,
  formInputClass,
  primaryBtnClass,
  modal3dClass,
  flowPanelClass,
  pickerDialogClass,
  modalAddLinkClass,
  methodBtnClass,
  favouriteChipClass,
  getRate,
} from "./shared";

// The one place a transaction credential goes out. Today that's the 4-digit
// PIN; for biometrics, collect the assertion in the caller (or here) and
// send it in place of / next to `transaction_pin`.
const postTransfer = (url, body, pin) =>
  transactionsApi.post(url, { ...body, transaction_pin: pin });

// ponytail: flat 1.5% with a $1 minimum — placeholder pricing shared by
// single Send and Send to Many until a real fees/pricing API replaces it.
const calcTransferFee = (amount) =>
  amount > 0 ? Math.max(1, amount * 0.015) : 0;

// Send to Many is capped for free-tier accounts; Payzarc Pro (see the
// Membership section on the Account page) removes the cap by flipping
// `user.plan`.
const FREE_SEND_MANY_LIMIT = 5;

// Send Money's in-transit stepper — each leg of the journey, top to bottom.
const SEND_STEPS = [
  { label: "Sent", sub: "Payment initiated from your wallet", icon: Send },
  {
    label: "Processing",
    sub: "Verifying and routing your transfer",
    icon: RefreshCw,
    spin: true,
  },
  {
    label: "Delivered",
    sub: "Funds have arrived with the recipient",
    icon: Check,
  },
];

const addFavouriteBtnClass =
  "self-start bg-transparent border-none text-gold text-[0.8rem] font-semibold cursor-pointer p-0 -mt-[0.6rem] transition-opacity hover:opacity-75";
// Withdrawal receipt dialog's rows — same label/value layout TransactionDetails.js
// uses for its details rows.
const receiptRowClass =
  "flex justify-between items-center gap-3 py-2.5 border-b border-white/[0.06] last:border-b-0";
const receiptLabelClass =
  "text-[11px] font-semibold text-muted-foreground uppercase tracking-wider shrink-0";
const receiptValueClass =
  "text-sm font-medium text-foreground text-right break-words min-w-0";
const avatarClass =
  "rounded-full bg-gradient-to-br from-gold/35 to-gold/15 text-gold font-bold flex items-center justify-center border border-[rgba(var(--gold-rgb),0.3)] text-sm";

// countries.js stores each entry's ISO alpha-2 code under `flag` (e.g. "KE");
// this turns that into an actual flag emoji. Already-emoji values (the
// getCurrentCountry error-fallback returns one directly) pass through as-is.
const isoToFlagEmoji = (iso) =>
  /^[A-Z]{2}$/.test(iso)
    ? String.fromCodePoint(...[...iso].map((c) => 127397 + c.charCodeAt(0)))
    : iso;

const recipientLabel = (r) => r.name || r.full_name || r.phone || r.value;

// Recipient's country, detected from whatever was typed/picked so we can
// show their flag. A phone number's dial code gives this away instantly;
// an email only reveals it if that address already belongs to one of our
// favourites/contacts (i.e. an existing user) — otherwise we know nothing
// about them yet.
const findCountryByName = (name) =>
  name
    ? countries.find((c) => c.name.toLowerCase() === name.toLowerCase())
    : null;

// Country from a phone number's dial code alone (longest/most specific
// code wins, e.g. +1 US vs +1 area-coded territories).
const detectCountryFromPhone = (value) => {
  const digits = (value || "").replace(/[^\d+]/g, "");
  if (!digits) return null;
  const matches = countries
    .filter((c) => digits.startsWith(c.code))
    .sort((a, b) => b.code.length - a.code.length);
  return matches[0] || null;
};

// A stored country name wins if present (favourites), otherwise fall back
// to their phone's dial code.
const detectRecipientCountry = (r) =>
  findCountryByName(r?.country || r?.country_name) ||
  detectCountryFromPhone(r?.phone || r?.value || r?.phone_number);

const errorMessage = (error, fallback) =>
  error.response?.data?.message || error.response?.data?.error || fallback;

function PinInput({ value, onChange }) {
  return (
    <>
      <Label className={formLabelClass}>Transaction PIN</Label>
      <Input
        type="password"
        inputMode="numeric"
        maxLength={4}
        className={formInputClass}
        placeholder="****"
        value={value}
        onChange={(e) =>
          onChange(e.target.value.replace(/\D/g, "").slice(0, 4))
        }
      />
    </>
  );
}

function FeeSummary({ currency, fee, total, className }) {
  return (
    <div
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

function InsufficientBalance({
  currency,
  total,
  formattedBalance,
  onAddMoney,
}) {
  return (
    <div className="flex flex-col gap-2 bg-destructive/10 border border-destructive/30 rounded-xl px-4 py-3.5">
      <span className="text-sm font-semibold text-destructive">
        Insufficient balance for this transfer.
      </span>
      <span className="text-xs text-muted-foreground">
        You need {currency} {total.toFixed(2)} but your balance is {currency}{" "}
        {formattedBalance}.
      </span>
      <Button type="button" className={primaryBtnClass} onClick={onAddMoney}>
        Add Money
      </Button>
    </div>
  );
}

export function SendMoney({
  initialRecipient,
  myCountry,
  displayCurrency: senderCurrency,
  liveRates,
  favourites,
  fetchFavourites,
  availableBalance,
  formattedBalance,
  showNotification,
  openConfirmationDialog,
  refreshWallet,
  goToDashboard,
  openSection,
}) {
  const [sendAmount, setSendAmount] = useState("");
  // Step-by-step "money in transit" visual shown while a send is in
  // flight — 0 hides it, 1-3 tracks which leg of the journey is reached.
  const [sendProgressStep, setSendProgressStep] = useState(0);
  const [selectedRecipient, setSelectedRecipient] = useState(initialRecipient);
  const [recipientSearchTerm, setRecipientSearchTerm] = useState(
    initialRecipient
      ? initialRecipient.display_name || recipientLabel(initialRecipient) || ""
      : "",
  );
  // Manual override for the recipient currency dropdown — only used when
  // nothing could be detected from the recipient, so the converted-amount
  // field always has a currency to show.
  const [recipientCurrencyChoice, setRecipientCurrencyChoice] = useState("");
  // Own phone number, used to block adding yourself as a favourite.
  const [myPhone, setMyPhone] = useState("");

  useEffect(() => {
    contactsApi
      .get("/api/my-contact/")
      .then((res) => {
        if (res.data.success) setMyPhone(res.data.phone);
      })
      .catch(() => {});
  }, []);

  const filteredFavourites = favourites.filter((f) => {
    const term = recipientSearchTerm.toLowerCase();
    if (!term) return false;
    const name = (f.name || f.full_name || "").toLowerCase();
    const phone = (f.phone || f.value || f.phone_number || "").toLowerCase();
    return name.includes(term) || phone.includes(term);
  });

  // A bare local number — all digits, no "+", no dial code already on it —
  // is assumed to be in the sender's own country, so typing "0707069007" (or
  // "707069007") while sending from Kenya resolves to "+254707069007"
  // without the user having to prefix it themselves. Left untouched for
  // emails, already-coded numbers, and once a favourite is picked.
  const withSenderCountryCode = (value) => {
    const trimmed = (value || "").trim();
    if (!trimmed || trimmed.includes("@") || !myCountry?.code) return trimmed;
    if (!/^\d+$/.test(trimmed) || detectCountryFromPhone(trimmed))
      return trimmed;
    return `${myCountry.code}${trimmed.replace(/^0+/, "")}`;
  };

  const recipientCountry = (() => {
    if (selectedRecipient) {
      return findCountryByName(
        selectedRecipient.country || selectedRecipient.country_name,
      );
    }
    const term = recipientSearchTerm.trim();
    if (!term) return null;
    if (term.includes("@")) {
      const match = favourites.find(
        (f) => (f.email || "").toLowerCase() === term.toLowerCase(),
      );
      return match
        ? findCountryByName(match.country || match.country_name)
        : null;
    }
    return detectCountryFromPhone(withSenderCountryCode(term));
  })();

  // Converted value of the amount being sent, in the recipient's currency.
  // Detection from the recipient's number always wins once it succeeds —
  // the manual dropdown only fills in when nothing could be detected yet.
  const availableCurrencies = Object.keys(
    liveRates || EXCHANGE_RATES[senderCurrency] || {},
  );
  const recipientCurrency =
    recipientCountry?.currency ||
    recipientCurrencyChoice ||
    availableCurrencies[0] ||
    "";
  const conversionRate = getRate(liveRates, senderCurrency, recipientCurrency);
  const convertedSendAmount = conversionRate
    ? (parseFloat(sendAmount || 0) * conversionRate).toFixed(2)
    : null;

  const sendAmountNum = parseFloat(sendAmount || 0);
  const sendFee = calcTransferFee(sendAmountNum);
  const sendTotal = sendAmountNum + sendFee;
  const insufficientBalance = sendAmountNum > 0 && sendTotal > availableBalance;

  const handleSelectRecipient = (fav) => {
    setSelectedRecipient(fav);
    setRecipientSearchTerm(recipientLabel(fav) || "");
  };

  const handleAddRecipientToFavourites = async () => {
    const value = withSenderCountryCode(recipientSearchTerm.trim());
    if (!value) return;
    const favouriteType = value.includes("@") ? "email" : "phone";
    if (
      favouriteType === "email" ? !isValidEmail(value) : !isValidPhone(value)
    ) {
      showNotification(
        "error",
        `Enter a valid ${favouriteType === "email" ? "email address" : "phone number"}`,
      );
      return;
    }
    if (favouriteType === "phone" && myPhone && value === myPhone) {
      showNotification(
        "error",
        "You cannot add your own phone number as a favorite.",
      );
      return;
    }
    try {
      // Step 1: Check — server-side validation the original flow ran before
      // ever saving a favourite (blocks e.g. numbers that don't resolve to
      // a real account).
      await contactsApi.post("/api/check/", { type: favouriteType, value });
      // Step 2: Save
      await contactsApi.post("/api/favorite/add/", {
        favourite_type: favouriteType,
        favourite_detail: value,
        label: value,
      });
      showNotification("success", "Recipient added to favourites!");
      fetchFavourites();
    } catch (error) {
      const errorMsg =
        error.response?.data?.detail ||
        error.response?.data?.error ||
        "Failed to add recipient to favourites";
      showNotification("error", errorMsg);
    }
  };

  const handleSendMoney = async () => {
    // Either a picked favourite OR a number typed straight into the search
    // box. A raw typed number gets the sender's own country code assumed (a
    // selectedRecipient's stored value is already fully qualified).
    const recipientValue =
      (selectedRecipient &&
        (selectedRecipient.value ||
          selectedRecipient.phone ||
          selectedRecipient.phone_number)) ||
      withSenderCountryCode(recipientSearchTerm);
    // Name for display only — recipientValue (a phone number/handle) is
    // still what's sent to the API below.
    const recipientDisplayName =
      (selectedRecipient &&
        (selectedRecipient.name || selectedRecipient.full_name)) ||
      recipientValue;

    if (!recipientValue || !sendAmount || Number(sendAmount) <= 0) {
      showNotification("error", "Please fill in recipient and a valid amount");
      return;
    }
    // Only format-check a raw typed value — a selectedRecipient came from
    // favourites/friends and was already validated when it was saved.
    if (
      !selectedRecipient &&
      !isValidPhone(recipientValue) &&
      !isValidEmail(recipientValue)
    ) {
      showNotification("error", "Enter a valid phone number or email");
      return;
    }

    openConfirmationDialog(
      "Confirm Send Money",
      `Send ${sendAmount} to ${recipientDisplayName}?\nFee: ${senderCurrency} ${sendFee.toFixed(2)} · Total: ${senderCurrency} ${sendTotal.toFixed(2)}\n\nEnter your 4-digit PIN and click Yes to confirm.`,
      async (pin, buttonChoice) => {
        if (buttonChoice !== "yes" || pin.length !== 4) {
          showNotification("error", "Transaction cancelled");
          return;
        }
        const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
        try {
          setSendProgressStep(1);
          const requestPromise = postTransfer(
            "/api/send-money/",
            {
              recipient_number: recipientValue,
              amount: parseFloat(sendAmount),
              fee: sendFee,
            },
            pin,
          );
          await wait(700);
          setSendProgressStep(2);
          await wait(700);
          setSendProgressStep(3);
          await requestPromise;
          await wait(600);
          setSendProgressStep(0);
          showNotification("success", "Money sent successfully!");
          refreshWallet();
          goToDashboard();
        } catch (error) {
          setSendProgressStep(0);
          showNotification("error", errorMessage(error, "Transfer failed"));
        }
      },
      { requirePin: true },
    );
  };

  return (
    <>
      <div className={flowPanelClass}>
        <div className="flex items-center justify-between">
          {myCountry && (
            <span className="flex items-center gap-1.5 text-[0.85rem] font-semibold text-[var(--muted)]">
              Sending From {isoToFlagEmoji(myCountry.flag)}
            </span>
          )}
          <button
            type="button"
            className="ml-auto text-gold text-[0.8rem] font-semibold hover:opacity-75 transition-opacity"
            onClick={() => openSection("send-many")}
          >
            Send to many →
          </button>
        </div>
        <Label className={formLabelClass}>
          Recipient
          {recipientCountry && (
            <span className="font-medium text-muted-foreground">
              {isoToFlagEmoji(recipientCountry.flag)} {recipientCountry.name}
            </span>
          )}
        </Label>
        <Input
          className={formInputClass}
          placeholder={
            myCountry
              ? `Search favourites or enter a local number, e.g. 707069007`
              : "Search favourites or enter a number"
          }
          value={recipientSearchTerm}
          onChange={(e) => {
            setRecipientSearchTerm(e.target.value);
            setSelectedRecipient(null);
          }}
        />
        {recipientSearchTerm && filteredFavourites.length > 0 && (
          <div className="flex flex-wrap gap-2 -mt-[0.6rem]">
            {filteredFavourites.map((fav, idx) => (
              <button
                key={fav.id || idx}
                type="button"
                className={favouriteChipClass(false)}
                onClick={() => handleSelectRecipient(fav)}
              >
                {recipientLabel(fav)}
              </button>
            ))}
          </div>
        )}
        {recipientSearchTerm && !selectedRecipient && (
          <button
            type="button"
            className={addFavouriteBtnClass}
            onClick={handleAddRecipientToFavourites}
          >
            + Add recipient to favourites
          </button>
        )}

        <Label className={formLabelClass}>Amount</Label>
        <Input
          type="number"
          min="0"
          step="0.01"
          className={formInputClass}
          placeholder="0.00"
          value={sendAmount}
          onChange={(e) => setSendAmount(e.target.value)}
        />
        <div className="bg-[var(--gold-pale)] border border-dashed border-[var(--gold-border)] rounded-xl px-4 py-[0.85rem] text-center -mt-[0.6rem]">
          {availableCurrencies.length > 0 ? (
            <>
              <div className="flex items-center justify-center gap-2">
                <span className="text-[1.2rem] font-bold text-gold tracking-[-0.3px]">
                  ≈ {Number(convertedSendAmount || 0).toLocaleString()}
                </span>
                <select
                  className="bg-white/[0.06] text-gold border border-[var(--gold-border)] rounded-sm px-2 py-1 text-[0.95rem] font-bold cursor-pointer outline-none disabled:opacity-85 disabled:cursor-default"
                  value={recipientCurrency}
                  disabled={!!recipientCountry}
                  title={
                    recipientCountry
                      ? "Detected from recipient's number"
                      : undefined
                  }
                  onChange={(e) => setRecipientCurrencyChoice(e.target.value)}
                >
                  {availableCurrencies.map((ccy) => (
                    <option key={ccy} value={ccy}>
                      {ccy}
                    </option>
                  ))}
                </select>
              </div>
              <span className="block text-xs text-gold/60 mt-1">
                1 {senderCurrency} = {conversionRate} {recipientCurrency} ·{" "}
                {liveRates ? "live rate" : "indicative rate"}
              </span>
            </>
          ) : (
            <span className="block text-xs text-gold/60 mt-1">
              Conversion unavailable for {senderCurrency}
            </span>
          )}
        </div>

        {sendAmountNum > 0 && (
          <FeeSummary
            currency={senderCurrency}
            fee={sendFee}
            total={sendTotal}
            className="-mt-[0.6rem]"
          />
        )}

        {insufficientBalance ? (
          <InsufficientBalance
            currency={senderCurrency}
            total={sendTotal}
            formattedBalance={formattedBalance}
            onAddMoney={() => openSection("add-money")}
          />
        ) : (
          <Button className={primaryBtnClass} onClick={handleSendMoney}>
            Send
          </Button>
        )}
      </div>

      {/* Step-by-step "money in transit" visual, shown while the transfer
          is in flight after confirming. Non-dismissible (no close button,
          no click-outside/Escape). */}
      {sendProgressStep > 0 && (
        <Dialog open onOpenChange={() => {}}>
          <DialogContent
            className={cn(pickerDialogClass, "[&>button:last-child]:hidden")}
            onEscapeKeyDown={(e) => e.preventDefault()}
            onPointerDownOutside={(e) => e.preventDefault()}
          >
            <DialogTitle className="text-center text-[1.1rem] font-bold text-foreground m-0">
              Sending money…
            </DialogTitle>

            <div className="flex flex-col py-2 px-1">
              {SEND_STEPS.map((step, idx) => {
                const stepNum = idx + 1;
                const isLast = idx === SEND_STEPS.length - 1;
                const isPast = sendProgressStep > stepNum;
                const isCurrent = sendProgressStep === stepNum;
                const reached = sendProgressStep >= stepNum;
                const StepIcon = isPast ? Check : step.icon;
                return (
                  <div key={step.label} className="flex gap-3.5">
                    <div className="flex flex-col items-center flex-shrink-0">
                      <div
                        className={cn(
                          "w-[34px] h-[34px] rounded-full bg-white/[0.03] border border-white/[0.06] text-[var(--muted)] flex items-center justify-center flex-shrink-0 transition-all duration-300",
                          reached &&
                            "bg-gold border-gold text-black shadow-[0_4px_14px_rgba(var(--gold-rgb),0.35)]",
                          isCurrent && !isLast && "animate-progress-pulse",
                        )}
                      >
                        <StepIcon
                          size={15}
                          className={
                            isCurrent && step.spin ? "animate-spin" : undefined
                          }
                        />
                      </div>
                      {!isLast && (
                        <div
                          className={cn(
                            "w-0.5 flex-1 min-h-[26px] bg-white/[0.08] my-[3px] transition-colors duration-[400ms]",
                            isPast && "bg-gold",
                          )}
                        />
                      )}
                    </div>
                    <div className="pb-5 pt-1">
                      <span
                        className={cn(
                          "text-[0.9rem] font-bold text-foreground transition-colors duration-300",
                          !reached && "text-[var(--muted)]",
                        )}
                      >
                        {step.label}
                      </span>
                      <p className="mt-0.5 text-[0.78rem] text-[var(--muted)]">
                        {step.sub}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>

            <p className="text-center text-[var(--muted)] text-[0.85rem] mt-1 pt-3 border-t border-dashed border-white/[0.08]">
              {senderCurrency}
              {sendAmount} to{" "}
              {selectedRecipient?.display_name ||
                selectedRecipient?.name ||
                recipientSearchTerm}
            </p>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}

// "Send to Many" — step "pick" (multi-select recipients) then "amount" (one
// shared amount, or per-recipient overrides). Recipients reuse the
// favourite object shape Send uses; typed numbers get wrapped the same way.
export function SendToMany({
  user,
  onPageChange,
  displayCurrency: senderCurrency,
  liveRates,
  favourites,
  availableBalance,
  formattedBalance,
  showNotification,
  openConfirmationDialog,
  refreshWallet,
  goToDashboard,
  openSection,
}) {
  const [step, setStep] = useState("pick"); // "pick" | "amount"
  const [phoneInput, setPhoneInput] = useState("");
  const [recipients, setRecipients] = useState([]);
  const [sameAmount, setSameAmount] = useState("");
  const [amounts, setAmounts] = useState({}); // key -> amount string
  const [inputPin, setInputPin] = useState("");
  const [sending, setSending] = useState(false);

  // Stable identity for a recipient — favourites have an id, ad-hoc typed
  // numbers don't, so fall back to whatever value identifies them.
  const keyOf = (r) => r.id ?? r.phone ?? r.value ?? r.name;
  const amountOf = (r) => parseFloat(amounts[keyOf(r)]) || 0;

  const isProUser = user?.plan === "pro";
  const limit = isProUser ? Infinity : FREE_SEND_MANY_LIMIT;
  const limitMsg = `Free plan is limited to ${FREE_SEND_MANY_LIMIT} recipients per send. Upgrade to Payzarc Pro to send to more friends at once.`;

  const toggleRecipient = (fav) => {
    const key = keyOf(fav);
    setRecipients((prev) => {
      if (prev.some((r) => keyOf(r) === key)) {
        return prev.filter((r) => keyOf(r) !== key);
      }
      if (prev.length >= limit) {
        showNotification("error", limitMsg);
        return prev;
      }
      return [...prev, fav];
    });
  };

  const addPhone = () => {
    const value = phoneInput.trim();
    if (!value) return;
    if (!isValidPhone(value)) {
      showNotification("error", "Enter a valid phone number");
      return;
    }
    if (recipients.length >= limit) {
      showNotification("error", limitMsg);
      return;
    }
    toggleRecipient({ name: value, phone: value, value });
    setPhoneInput("");
  };

  // Same amount fills every recipient's field, but only overwrites entries
  // that still match the previous same-amount value — anyone the sender has
  // since edited by hand keeps their custom amount.
  const applySameAmount = (value) => {
    setAmounts((prev) => {
      const next = { ...prev };
      recipients.forEach((r) => {
        const key = keyOf(r);
        if (next[key] === undefined || next[key] === sameAmount) {
          next[key] = value;
        }
      });
      return next;
    });
    setSameAmount(value);
  };

  // Per-recipient conversion, shown next to their amount field.
  const getConversion = (r) => {
    const amt = amountOf(r);
    const currency = detectRecipientCountry(r)?.currency;
    if (!currency || amt <= 0) return null;
    const rate = getRate(liveRates, senderCurrency, currency);
    if (!rate) return null;
    return { currency, amount: (amt * rate).toFixed(2) };
  };

  const amountTotal = recipients.reduce((sum, r) => sum + amountOf(r), 0);
  const feeTotal = recipients.reduce(
    (sum, r) => sum + calcTransferFee(amountOf(r)),
    0,
  );
  const total = amountTotal + feeTotal;
  const insufficientBalance = amountTotal > 0 && total > availableBalance;

  const handleSendToMany = async () => {
    if (
      recipients.length === 0 ||
      recipients.some((r) => amountOf(r) <= 0) ||
      inputPin.length !== 4 ||
      insufficientBalance
    ) {
      showNotification(
        "error",
        "Enter an amount for every recipient and your 4-digit PIN",
      );
      return;
    }

    openConfirmationDialog(
      "Confirm Send to Many",
      `Send ${senderCurrency} ${amountTotal.toFixed(2)} to ${recipients.length} people?\nFee: ${senderCurrency} ${feeTotal.toFixed(2)} · Total: ${senderCurrency} ${total.toFixed(2)}\n\nType 1 and click Yes to confirm.`,
      async (typedValue, buttonChoice) => {
        if (typedValue !== "1" || buttonChoice !== "yes") {
          showNotification("error", "Transaction cancelled");
          return;
        }
        setSending(true);
        try {
          // No batch endpoint exists yet — loop the same single-transfer
          // endpoint Send uses. ponytail: sequential, not Promise.all, so a
          // failure partway through stops cleanly instead of firing every
          // remaining transfer at once; swap for a real batch endpoint if
          // this list ever needs to be large or atomic.
          for (const r of recipients) {
            const amount = amountOf(r);
            await postTransfer(
              "/api/send-money/",
              {
                recipient_number: r.value || r.phone || r.phone_number,
                amount,
                fee: calcTransferFee(amount),
              },
              inputPin,
            );
          }
          showNotification(
            "success",
            `Sent to ${recipients.length} people successfully!`,
          );
          refreshWallet();
          goToDashboard();
        } catch (error) {
          showNotification(
            "error",
            errorMessage(error, "Some transfers failed"),
          );
        } finally {
          setSending(false);
        }
      },
    );
  };

  return (
    <div className={flowPanelClass}>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => openSection("send")}
          className="w-9 h-9 shrink-0 rounded-full bg-white/[0.06] flex items-center justify-center text-foreground hover:bg-white/[0.1] transition-colors"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <span className="flex-1 text-center text-base font-bold pr-9">
          Send to Many
        </span>
      </div>

      {step === "pick" && (
        <>
          <Label className={formLabelClass}>Recipient</Label>
          <Input
            className={formInputClass}
            placeholder="Enter phone number"
            value={phoneInput}
            onChange={(e) => setPhoneInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addPhone();
              }
            }}
          />
          {phoneInput.trim() && (
            <button
              type="button"
              className={addFavouriteBtnClass}
              onClick={addPhone}
            >
              + Add {phoneInput.trim()}
            </button>
          )}

          <Label className={formLabelClass}>
            Send to {recipients.length}
            {isProUser ? "" : `/${FREE_SEND_MANY_LIMIT}`}
          </Label>
          {!isProUser && recipients.length >= FREE_SEND_MANY_LIMIT && (
            <button
              type="button"
              onClick={() => onPageChange("account")}
              className="text-xs text-gold -mt-[0.6rem] text-left bg-transparent border-none p-0 cursor-pointer hover:opacity-75 transition-opacity"
            >
              Free plan limit reached — upgrade to Payzarc Pro to send to more
              friends at once.
            </button>
          )}
          {recipients.length > 0 && (
            <div className="flex flex-wrap gap-3 -mt-[0.4rem]">
              {recipients.map((r) => (
                <div
                  key={keyOf(r)}
                  className="relative flex flex-col items-center gap-1 w-16"
                >
                  <button
                    type="button"
                    onClick={() => toggleRecipient(r)}
                    className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-white/80 text-black flex items-center justify-center z-10"
                  >
                    <X className="w-3 h-3" />
                  </button>
                  <div className={cn(avatarClass, "w-12 h-12")}>
                    {(recipientLabel(r) || "?").slice(0, 1).toUpperCase()}
                  </div>
                  <span className="text-[0.7rem] text-center text-muted-foreground truncate w-full">
                    {recipientLabel(r)}
                  </span>
                </div>
              ))}
            </div>
          )}

          <Label className={formLabelClass}>Favourites</Label>
          <div className="flex flex-wrap gap-2 -mt-[0.6rem]">
            {favourites.map((fav, idx) => (
              <button
                key={fav.id || idx}
                type="button"
                className={favouriteChipClass(
                  recipients.some((r) => keyOf(r) === keyOf(fav)),
                )}
                onClick={() => toggleRecipient(fav)}
              >
                {recipientLabel(fav)}
              </button>
            ))}
          </div>

          <Button
            className={primaryBtnClass}
            disabled={recipients.length === 0}
            onClick={() => setStep("amount")}
          >
            Continue
          </Button>
        </>
      )}

      {step === "amount" && (
        <>
          <div className="flex items-center gap-3 bg-[var(--gold-pale)] border border-dashed border-[var(--gold-border)] rounded-xl px-4 py-4">
            <UsersRound className="w-8 h-8 text-gold shrink-0" />
            <div>
              <div className="text-lg font-bold text-gold">
                {senderCurrency} {amountTotal.toFixed(2)}
              </div>
              <div className="text-xs text-muted-foreground">
                Total amount to be sent
              </div>
            </div>
          </div>

          <Label className={formLabelClass}>Same amount</Label>
          <Input
            type="number"
            min="0"
            step="0.01"
            className={formInputClass}
            placeholder="0.00"
            value={sameAmount}
            onChange={(e) => applySameAmount(e.target.value)}
          />
          <span className="text-xs text-muted-foreground -mt-[0.6rem]">
            Balance: {senderCurrency} {formattedBalance}
          </span>

          <div className="flex flex-col gap-3">
            {recipients.map((r) => {
              const conversion = getConversion(r);
              const country = detectRecipientCountry(r);
              return (
                <div key={keyOf(r)} className="flex items-center gap-3">
                  <div className={cn(avatarClass, "w-11 h-11 shrink-0")}>
                    {(recipientLabel(r) || "?").slice(0, 1).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold truncate">
                      {r.name || r.full_name || r.value}
                    </div>
                    <div className="text-xs text-muted-foreground truncate">
                      {country ? isoToFlagEmoji(country.flag) : ""}{" "}
                      {r.phone || r.value}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      className={cn(
                        formInputClass,
                        "w-24 px-3 py-2 text-right",
                      )}
                      value={amounts[keyOf(r)] ?? ""}
                      onChange={(e) =>
                        setAmounts((prev) => ({
                          ...prev,
                          [keyOf(r)]: e.target.value,
                        }))
                      }
                    />
                    {conversion && (
                      <span className="text-[0.7rem] text-gold/80 whitespace-nowrap">
                        ≈ {Number(conversion.amount).toLocaleString()}{" "}
                        {conversion.currency}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {amountTotal > 0 && (
            <FeeSummary
              currency={senderCurrency}
              fee={feeTotal}
              total={total}
            />
          )}

          <PinInput value={inputPin} onChange={setInputPin} />

          {insufficientBalance ? (
            <InsufficientBalance
              currency={senderCurrency}
              total={total}
              formattedBalance={formattedBalance}
              onAddMoney={() => openSection("add-money")}
            />
          ) : (
            <Button
              className={primaryBtnClass}
              disabled={sending}
              onClick={handleSendToMany}
            >
              {sending ? "Sending..." : "Send"}
            </Button>
          )}
        </>
      )}
    </div>
  );
}

// Mpesa/bank withdrawals must land on an account already linked to this
// user (Profile "Payment Methods") — never a number typed in on the spot.
// Agent is the one exception: it's a physical cash-out code, not an
// account, so it stays free text.
export function Withdraw({
  myCountry,
  displayCurrency,
  paymentMethods,
  setPaymentMethods,
  showNotification,
  openConfirmationDialog,
  refreshWallet,
  goToDashboard,
}) {
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [inputPin, setInputPin] = useState("");
  const [showPopup, setShowPopup] = useState(false);
  const [destination, setDestination] = useState("mpesa"); // "mpesa" | "bank" | "agent"
  const [agentNumber, setAgentNumber] = useState("");
  const [selectedBankId, setSelectedBankId] = useState(null);
  const [selectedMobileMoneyId, setSelectedMobileMoneyId] = useState(null);
  const [showAddMobileMoneyForm, setShowAddMobileMoneyForm] = useState(false);
  const [newMobileMoney, setNewMobileMoney] = useState({
    provider: "",
    phoneNumber: "",
  });
  // Populated from the withdrawal endpoint's response on success; drives the
  // receipt dialog below (mirrors TransactionDetails.js's row layout).
  const [receipt, setReceipt] = useState(null);

  const region = getRegionProviders(myCountry);

  const selectedMobileMoney = paymentMethods.mobileMoney.find(
    (m) => m.id === selectedMobileMoneyId,
  );
  const selectedBank = paymentMethods.banks.find(
    (b) => b.id === selectedBankId,
  );
  const destinationLabel =
    destination === "mpesa"
      ? selectedMobileMoney
        ? `${selectedMobileMoney.provider} •••• ${String(selectedMobileMoney.phoneNumber).slice(-4)}`
        : ""
      : destination === "bank"
        ? selectedBank
          ? `${selectedBank.bankName} •••• ${String(selectedBank.accountNumber).slice(-4)}`
          : ""
        : agentNumber
          ? `agent ${agentNumber}`
          : "";

  const handleWithdrawClick = () => {
    if (
      !withdrawAmount ||
      Number(withdrawAmount) <= 0 ||
      inputPin.length !== 4
    ) {
      showNotification("error", "Enter an amount and 4-digit PIN");
      return;
    }
    // Mpesa is only a real withdrawal rail in Kenya — default elsewhere to
    // Bank, which (like Mpesa) is a linked-account destination.
    setDestination(region.mobileMoney.length > 0 ? "mpesa" : "bank");
    setShowAddMobileMoneyForm(paymentMethods.mobileMoney.length === 0);
    setShowPopup(true);
  };

  const handleAddMobileMoney = async () => {
    if (!newMobileMoney.provider || !newMobileMoney.phoneNumber) {
      showNotification("error", "Select a provider and enter a phone number");
      return;
    }
    if (!isValidPhone(newMobileMoney.phoneNumber)) {
      showNotification("error", "Enter a valid phone number");
      return;
    }
    try {
      const res = await transactionsApi.post(
        "/api/payment-methods/mobile-money/",
        newMobileMoney,
      );
      const mobileMoney = res.data || [];
      setPaymentMethods((pm) => ({ ...pm, mobileMoney }));
      setSelectedMobileMoneyId(mobileMoney[mobileMoney.length - 1]?.id ?? null);
      setShowAddMobileMoneyForm(false);
      setNewMobileMoney({ provider: "", phoneNumber: "" });
    } catch (error) {
      showNotification("error", "Failed to save mobile money account");
    }
  };

  const handleWithdraw = async () => {
    const validDestination =
      destination === "mpesa"
        ? !!selectedMobileMoneyId
        : destination === "bank"
          ? !!selectedBankId
          : /^[A-Za-z0-9-]{3,20}$/.test(agentNumber);
    if (
      !withdrawAmount ||
      Number(withdrawAmount) <= 0 ||
      !validDestination ||
      inputPin.length !== 4
    ) {
      const destinationName =
        destination === "mpesa"
          ? "a linked Mpesa account"
          : destination === "bank"
            ? "a linked bank account"
            : "a valid agent number";
      showNotification(
        "error",
        `Enter an amount, select ${destinationName}, and a 4-digit PIN`,
      );
      return;
    }

    openConfirmationDialog(
      "Confirm Withdrawal",
      `Withdraw ${displayCurrency}${withdrawAmount} to ${destinationLabel}?\n\nType 1 and click Yes to confirm.`,
      async (typedValue, buttonChoice) => {
        if (typedValue !== "1" || buttonChoice !== "yes") {
          showNotification("error", "Transaction cancelled");
          return;
        }
        try {
          // Agent path confirmed against MerchantWithdrawalService: it reads
          // `merchant_code`, not `agent_number`. Mpesa/bank paths send the id
          // of the linked account (mirroring Add Money's bank_id/card_id) —
          // ponytail: guessed field names, fix if the backend uses something
          // else once those rails are implemented.
          const { data } = await postTransfer(
            "/api/withdraw/",
            {
              destination,
              ...(destination === "mpesa"
                ? { mobile_money_id: selectedMobileMoneyId }
                : destination === "bank"
                  ? { bank_id: selectedBankId }
                  : { merchant_code: agentNumber }),
              amount: parseFloat(withdrawAmount),
            },
            inputPin,
          );
          showNotification("success", "Withdrawal successful!");
          setReceipt(data);
          refreshWallet();
        } catch (error) {
          showNotification("error", errorMessage(error, "Withdrawal failed"));
        }
      },
    );
  };

  const closeReceipt = () => {
    setReceipt(null);
    goToDashboard();
  };

  return (
    <>
      <div className={flowPanelClass}>
        <Label className={formLabelClass}>Amount</Label>
        <Input
          type="number"
          min="0"
          step="0.01"
          className={formInputClass}
          placeholder="0.00"
          value={withdrawAmount}
          onChange={(e) => setWithdrawAmount(e.target.value)}
        />

        <PinInput value={inputPin} onChange={setInputPin} />

        <Button className={primaryBtnClass} onClick={handleWithdrawClick}>
          Withdraw
        </Button>
      </div>

      {/* Service picker popup, shown once amount + PIN are entered */}
      <Dialog open={showPopup} onOpenChange={setShowPopup}>
        <DialogContent className={pickerDialogClass}>
          <DialogTitle className="text-center text-[1.1rem] font-bold text-foreground m-0">
            Withdraw via
          </DialogTitle>
          <div className="flex gap-2 -mt-[0.6rem]">
            {(region.mobileMoney.length > 0
              ? ["mpesa", "bank", "agent"]
              : ["bank", "agent"]
            ).map((dest) => (
              <button
                key={dest}
                type="button"
                className={methodBtnClass(destination === dest)}
                onClick={() => setDestination(dest)}
              >
                {dest === "mpesa"
                  ? "Mpesa"
                  : dest === "bank"
                    ? "Bank"
                    : "Agent"}
              </button>
            ))}
          </div>

          {destination === "mpesa" &&
            (showAddMobileMoneyForm ? (
              <>
                <Label className={formLabelClass}>Provider</Label>
                <select
                  className={formInputClass}
                  value={newMobileMoney.provider}
                  onChange={(e) =>
                    setNewMobileMoney({
                      ...newMobileMoney,
                      provider: e.target.value,
                    })
                  }
                >
                  <option value="">Select a provider</option>
                  {region.mobileMoney.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
                <Label className={formLabelClass}>Phone number</Label>
                <Input
                  className={formInputClass}
                  placeholder="e.g. 254712345678"
                  value={newMobileMoney.phoneNumber}
                  onChange={(e) =>
                    setNewMobileMoney({
                      ...newMobileMoney,
                      phoneNumber: e.target.value,
                    })
                  }
                />
                <button
                  type="button"
                  className={modalAddLinkClass}
                  onClick={handleAddMobileMoney}
                >
                  + Save mobile money account
                </button>
                {paymentMethods.mobileMoney.length > 0 && (
                  <button
                    type="button"
                    className={modalAddLinkClass}
                    onClick={() => setShowAddMobileMoneyForm(false)}
                  >
                    Use a saved account instead
                  </button>
                )}
              </>
            ) : (
              <>
                <Label className={formLabelClass}>Mpesa account</Label>
                <div className="flex flex-wrap gap-2 -mt-[0.6rem]">
                  {paymentMethods.mobileMoney.map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      className={favouriteChipClass(
                        selectedMobileMoneyId === m.id,
                      )}
                      onClick={() => setSelectedMobileMoneyId(m.id)}
                    >
                      {m.provider} •••• {String(m.phoneNumber).slice(-4)}
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  className={modalAddLinkClass}
                  onClick={() => setShowAddMobileMoneyForm(true)}
                >
                  + Add another mobile money account
                </button>
              </>
            ))}

          {destination === "bank" && (
            <BankPicker
              banks={paymentMethods.banks}
              partnerBanks={region.partnerBanks}
              selectedId={selectedBankId}
              onSelect={setSelectedBankId}
              setPaymentMethods={setPaymentMethods}
              showNotification={showNotification}
            />
          )}

          {destination === "agent" && (
            <>
              <Label className={formLabelClass}>Agent number</Label>
              <Input
                className={formInputClass}
                placeholder="e.g. AG-10293"
                value={agentNumber}
                onChange={(e) => setAgentNumber(e.target.value)}
              />
            </>
          )}

          <Button
            className={primaryBtnClass}
            onClick={() => {
              setShowPopup(false);
              handleWithdraw();
            }}
          >
            Continue
          </Button>
        </DialogContent>
      </Dialog>

      {/* Withdrawal receipt — field names are guessed with fallbacks
          (camelCase/snake_case) since the exact response shape wasn't
          available; adjust the accessors below if your API differs. */}
      <Dialog
        open={!!receipt}
        onOpenChange={(isOpen) => !isOpen && closeReceipt()}
      >
        <DialogContent
          className={cn(
            "w-[min(420px,100%)] max-w-[420px] rounded-2xl p-7 flex flex-col gap-1",
            modal3dClass,
          )}
        >
          <DialogTitle className="text-center text-[1.1rem] font-bold text-foreground m-0 mb-2">
            Withdrawal Successful
          </DialogTitle>
          <div className="flex flex-col">
            <div className={receiptRowClass}>
              <span className={receiptLabelClass}>Merchant Code</span>
              <span className={receiptValueClass}>
                {receipt?.merchantCode ?? receipt?.merchant_code ?? "N/A"}
              </span>
            </div>
            <div className={receiptRowClass}>
              <span className={receiptLabelClass}>Customer Phone</span>
              <span className={receiptValueClass}>
                {receipt?.customerPhone ?? receipt?.customer_phone ?? "N/A"}
              </span>
            </div>
            <div className={receiptRowClass}>
              <span className={receiptLabelClass}>Amount</span>
              <span className={cn(receiptValueClass, "text-gold font-bold")}>
                {displayCurrency}
                {receipt?.amount ?? "N/A"}
              </span>
            </div>
            <div className={receiptRowClass}>
              <span className={receiptLabelClass}>Transaction Code</span>
              <span className={receiptValueClass}>
                {receipt?.transactionCode ??
                  receipt?.transaction_code ??
                  receipt?.reference ??
                  "N/A"}
              </span>
            </div>
            <div className={receiptRowClass}>
              <span className={receiptLabelClass}>New Balance</span>
              <span className={receiptValueClass}>
                {receipt?.newBalance ??
                  receipt?.new_balance ??
                  receipt?.balance ??
                  "N/A"}
              </span>
            </div>
            <div className={receiptRowClass}>
              <span className={receiptLabelClass}>Status</span>
              <span className="inline-block px-3.5 py-1 rounded-full text-xs font-bold capitalize bg-success/15 text-success border border-success/30">
                {receipt?.status ?? "Completed"}
              </span>
            </div>
          </div>
          <Button
            className={cn(primaryBtnClass, "mt-4")}
            onClick={closeReceipt}
          >
            Done
          </Button>
        </DialogContent>
      </Dialog>
    </>
  );
}
