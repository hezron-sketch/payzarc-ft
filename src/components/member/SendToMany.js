import React, { useState } from "react";
import { ChevronLeft, X, UsersRound } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { isValidPhone } from "../../utility/validators";
import { useFaceAuth } from "./Face";
import {
  formLabelClass,
  formInputClass,
  primaryBtnClass,
  flowPanelClass,
  favouriteChipClass,
  getRate,
  failureKind,
  newIdempotencyKey,
  toDecimalInput,
} from "./shared";
import TransferStatus from "./TransferStatus";
import {
  postTransfer,
  authorize,
  calcTransferFee,
  addFavouriteBtnClass,
  isoToFlagEmoji,
  recipientLabel,
  detectRecipientCountry,
  lookupRecipientName,
  lookupErrorMessage,
  FeeSummary,
  InsufficientBalance,
} from "./transferCore";

const FREE_SEND_MANY_LIMIT = 5;

const avatarClass =
  "rounded-full bg-gradient-to-br from-gold/35 to-gold/15 text-gold font-bold flex items-center justify-center border border-[rgba(var(--gold-rgb),0.3)] text-sm";

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
  const [sending, setSending] = useState(false);
  const [batch, setBatch] = useState(null);
  const [requestFace, faceModal] = useFaceAuth(user?.email);

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
      insufficientBalance
    ) {
      showNotification("error", "Enter an amount for every recipient");
      return;
    }

    // Verify every recipient up front so a wrong number can't slip in.
    let names;
    setSending(true);
    try {
      names = await Promise.all(
        recipients.map((r) =>
          lookupRecipientName(r.value || r.phone || r.phone_number),
        ),
      );
    } catch (error) {
      showNotification("error", lookupErrorMessage(error));
      return;
    } finally {
      setSending(false);
    }
    openConfirmationDialog({
      title: `Review transfer to ${recipients.length} people`,
      recipients: recipients.map((r, i) => ({
        key: keyOf(r),
        name: names[i],
        amount: `${senderCurrency} ${amountOf(r).toFixed(2)}`,
      })),
      rows: [
        { label: "You send", value: `${senderCurrency} ${amountTotal.toFixed(2)}` },
        { label: "Fees", value: `${senderCurrency} ${feeTotal.toFixed(2)}` },
        { label: "Total", value: `${senderCurrency} ${total.toFixed(2)}`, strong: true },
      ],
      auth: true,
      onConfirm: async (pin) => {
        const auth = await authorize(pin, requestFace);
        if (!auth) return;
        const batchKey = newIdempotencyKey();
        runBatch(
          auth,
          recipients.map((r, i) => ({
            key: keyOf(r),
            // One idempotency key per recipient, stable across retries.
            idemKey: `${batchKey}-${i}`,
            name: names[i],
            value: r.value || r.phone || r.phone_number,
            amountNum: amountOf(r),
            amount: `${senderCurrency} ${amountOf(r).toFixed(2)}`,
            state: "pending",
          })),
        );
      },
    });
  };

  const runBatch = async (auth, startItems) => {
    let items = startItems.map((it) =>
      it.state === "done" ? it : { ...it, state: "pending" },
    );
    let kind = "declined";
    const show = (phase, error) =>
      setBatch({
        phase,
        kind,
        error,
        auth,
        items,
        summary: `${senderCurrency} ${items
          .reduce((sum, it) => sum + it.amountNum, 0)
          .toFixed(2)} to ${items.length} people`,
      });
    show("sending");
    for (const target of items.filter((it) => it.state !== "done")) {
      items = items.map((it) =>
        it.key === target.key ? { ...it, state: "sending" } : it,
      );
      show("sending");
      let state = "done";
      try {
        await postTransfer(
          "/api/send-money/",
          {
            recipient_number: target.value,
            amount: target.amountNum,
            fee: calcTransferFee(target.amountNum),
          },
          auth,
          target.idemKey,
        );
      } catch (error) {
        state = "failed";
        if (failureKind(error) !== "declined") kind = "unconfirmed";
      }
      items = items.map((it) =>
        it.key === target.key ? { ...it, state } : it,
      );
    }
    refreshWallet();
    const failed = items.filter((it) => it.state === "failed").length;
    show(
      failed ? "failed" : "done",
      failed === items.length
        ? "None of these payments went through. Your balance is unchanged."
        : `${failed} couldn't be paid (marked below). The rest were delivered.`,
    );
  };

  const anyDelivered = batch?.items.some((it) => it.state === "done");

  return (
    <div className={flowPanelClass}>
      {step === "pick" && (
      <button
        type="button"
        onClick={() => openSection("send")}
        className="self-start -ml-2 inline-flex items-center gap-1 h-9 pl-1 pr-3 rounded-full text-[0.85rem] font-medium text-gold hover:bg-white/[0.05] transition-colors"
      >
        <ChevronLeft className="w-4 h-4" aria-hidden="true" />
        Send to one person
      </button>
      )}

      {step === "pick" && (
        <>
          <Label htmlFor="many-recipient" className={formLabelClass}>
            Recipient
          </Label>
          <Input
            id="many-recipient"
            type="tel"
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
                    aria-label={`Remove ${recipientLabel(r)}`}
                    className="absolute -top-1.5 -right-1.5 w-6 h-6 rounded-full bg-white/85 text-black flex items-center justify-center z-10 after:absolute after:-inset-2 after:content-['']"
                  >
                    <X className="w-3.5 h-3.5" aria-hidden="true" />
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
                aria-pressed={recipients.some((r) => keyOf(r) === keyOf(fav))}
                className={favouriteChipClass(recipients.some((r) => keyOf(r) === keyOf(fav)))}
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
          <button
            type="button"
            onClick={() => setStep("pick")}
            className="self-start -ml-2 -mt-2 h-9 px-2 rounded-full text-[0.85rem] font-medium text-[var(--soft)] hover:text-foreground hover:bg-white/[0.05] transition-colors"
          >
            Edit recipients ({recipients.length})
          </button>
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

          <Label htmlFor="many-same-amount" className={formLabelClass}>
            Same amount for everyone
          </Label>
          <Input
            id="many-same-amount"
            inputMode="decimal"
            autoComplete="off"
            className={formInputClass}
            placeholder="0.00"
            value={sameAmount}
            onChange={(e) => applySameAmount(toDecimalInput(e.target.value))}
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
                      inputMode="decimal"
                      autoComplete="off"
                      className={cn(
                        formInputClass,
                        "w-24 px-3 py-2 text-right tabular-nums",
                      )}
                      aria-label={`Amount for ${r.name || r.full_name || r.value}`}
                      value={amounts[keyOf(r)] ?? ""}
                      onChange={(e) =>
                        setAmounts((prev) => ({
                          ...prev,
                          [keyOf(r)]: toDecimalInput(e.target.value),
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
              {sending ? "Checking recipients…" : "Review"}
            </Button>
          )}
        </>
      )}
      <TransferStatus
        status={batch}
        verb="Sending"
        doneTitle={`All ${batch?.items.length ?? 0} delivered`}
        doneStep={{ label: "Delivered", sub: "Confirmed by Payzarc" }}
        onDone={goToDashboard}
        onEdit={() => (anyDelivered ? goToDashboard() : setBatch(null))}
        onRetry={() => runBatch(batch.auth, batch.items)}
        onViewTransactions={() => openSection("reports")}
      />
      {faceModal}
    </div>
  );
}
