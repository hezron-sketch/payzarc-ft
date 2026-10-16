import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { transactionsApi } from "../../utility/axiosInstance";
import { getRegionProviders } from "../../utility/regionProviders";
import {
  isValidPhone,
  isValidCardNumber,
  isValidExpiry,
  isSafeText,
} from "../../utility/validators";
import BankPicker from "./BankPicker";
import {
  formLabelClass,
  formInputClass,
  primaryBtnClass,
  flowPanelClass,
  pickerDialogClass,
  modalAddLinkClass,
  methodBtnClass,
  favouriteChipClass,
  assertDelivered,
  failureKind,
  newIdempotencyKey,
  toDecimalInput,
} from "./shared";
import { errorMessage } from "./transferCore";
import TransferStatus from "./TransferStatus";

const EMPTY_CARD = { cardholderName: "", cardNumber: "", expiry: "" };

function AddMoney({
  myCountry,
  displayCurrency,
  paymentMethods,
  setPaymentMethods,
  showNotification,
  openConfirmationDialog,
  refreshWallet,
  goToDashboard,
  openSection,
}) {
  const [addAmount, setAddAmount] = useState("");
  const [showPopup, setShowPopup] = useState(false);
  const [category, setCategory] = useState("bank"); // "mobile" | "bank" | "card"
  const [mobileProvider, setMobileProvider] = useState("");
  const [mpesaNumber, setMpesaNumber] = useState("");
  const [selectedBankId, setSelectedBankId] = useState(null);
  const [selectedCardId, setSelectedCardId] = useState(null);
  const [showAddCardForm, setShowAddCardForm] = useState(false);
  const [newCard, setNewCard] = useState(EMPTY_CARD);
  // The deposit in flight, shown in TransferStatus (null hides it).
  const [result, setResult] = useState(null);
  // Errors raised inside the picker dialog render inline there — a toast
  // would sit outside the modal (hidden from screen readers, unclickable,
  // and over the bottom sheet on phones).
  const [pickerError, setPickerError] = useState("");
  // Defaults apply on the picker's first open only; reopening keeps the
  // user's last choice.
  const [pickerInitialized, setPickerInitialized] = useState(false);

  // Region-specific mobile money providers + partner banks for the sender's
  // detected country (Kenya/EU/US get their own set, everything else falls
  // back to generic bank transfer).
  const region = getRegionProviders(myCountry);

  const handleAddMoneyClick = () => {
    if (!addAmount || Number(addAmount) <= 0) {
      showNotification("error", "Enter a valid amount");
      return;
    }
    if (!pickerInitialized) {
      setCategory(region.mobileMoney.length > 0 ? "mobile" : "bank");
      setMobileProvider(region.mobileMoney[0] || "");
      setShowAddCardForm(paymentMethods.cards.length === 0);
      setPickerInitialized(true);
    }
    setShowPopup(true);
  };

  const handleAddCard = async () => {
    setPickerError("");
    if (!newCard.cardholderName || !newCard.cardNumber || !newCard.expiry) {
      setPickerError("Fill in cardholder name, card number, and expiry",
      );
      return;
    }
    if (!isSafeText(newCard.cardholderName)) {
      setPickerError("Cardholder name can't contain < or > characters",
      );
      return;
    }
    if (!isValidCardNumber(newCard.cardNumber)) {
      setPickerError("Enter a valid card number");
      return;
    }
    if (!isValidExpiry(newCard.expiry)) {
      setPickerError("Enter a valid, unexpired expiry date (MM/YY)");
      return;
    }
    try {
      const res = await transactionsApi.post(
        "/api/payment-methods/cards/",
        newCard,
      );
      const cards = res.data || [];
      setPaymentMethods((pm) => ({ ...pm, cards }));
      setSelectedCardId(cards[cards.length - 1]?.id ?? null);
      setShowAddCardForm(false);
      setNewCard(EMPTY_CARD);
    } catch (error) {
      setPickerError("Failed to save card");
    }
  };

  const addNum = parseFloat(addAmount || 0);
  const amountLabel = `${displayCurrency} ${addNum.toFixed(2)}`;
  const sourceReady =
    category === "mobile"
      ? isValidPhone(mpesaNumber)
      : category === "bank"
        ? !!selectedBankId
        : !!selectedCardId;
  const sourceHint =
    category === "mobile"
      ? `Enter the ${mobileProvider || "mobile money"} number to deposit from.`
      : category === "bank"
        ? "Choose or add a bank account."
        : "Choose or save a card.";

  const handleAddMoney = () => {
    if (!(addNum > 0) || !sourceReady) return;
    const selectedBank = paymentMethods.banks.find(
      (b) => b.id === selectedBankId,
    );
    const selectedCard = paymentMethods.cards.find(
      (c) => c.id === selectedCardId,
    );
    const sourceLabel =
      category === "mobile"
        ? mobileProvider
        : category === "bank"
          ? `${selectedBank?.bankName} •••• ${String(selectedBank?.accountNumber).slice(-4)}`
          : `${selectedCard?.brand || "Card"} •••• ${selectedCard?.last4}`;

    setShowPopup(false);
    openConfirmationDialog({
      title: "Review deposit",
      rows: [
        { label: "From", value: sourceLabel },
        { label: "Amount", value: amountLabel, strong: true },
      ],
      confirmLabel: `Deposit ${amountLabel}`,
      onConfirm: () => runDeposit(sourceLabel, newIdempotencyKey()),
    });
  };

  // Posts the deposit and walks TransferStatus through real phases; retry
  // reuses the idempotency key so it can't top up twice.
  // NOTE: guessed endpoint, following the /api/send-money/ pattern — point
  // this at your real deposit/top-up endpoint if different.
  const runDeposit = async (sourceLabel, key) => {
    const base = { sourceLabel, key, summary: `${amountLabel} from ${sourceLabel}` };
    setResult({ ...base, phase: "sending" });
    try {
      const { data } = await transactionsApi.post(
        "/api/add-money/",
        {
          amount: addNum,
          source: category,
          ...(category === "mobile" && {
            provider: mobileProvider,
            mobile_number: mpesaNumber,
          }),
          ...(category === "bank" && { bank_id: selectedBankId }),
          ...(category === "card" && { card_id: selectedCardId }),
        },
        { headers: { "Idempotency-Key": key } },
      );
      assertDelivered(data, "Deposit request failed.");
      setResult({ ...base, phase: "done" });
      refreshWallet();
    } catch (error) {
      setResult({
        ...base,
        phase: "failed",
        kind: failureKind(error),
        error: errorMessage(error, "Deposit failed"),
      });
    }
  };

  return (
    <>
      <div className={flowPanelClass}>
        <Label htmlFor="deposit-amount" className={formLabelClass}>
          Amount ({displayCurrency})
        </Label>
        <Input
          id="deposit-amount"
          inputMode="decimal"
          autoComplete="off"
          className={formInputClass}
          placeholder="0.00"
          value={addAmount}
          onChange={(e) => setAddAmount(toDecimalInput(e.target.value))}
        />

        <Button className={primaryBtnClass} onClick={handleAddMoneyClick}>
          Continue
        </Button>
      </div>

      {/* Service picker popup, shown once a valid amount is entered */}
      <Dialog
        open={showPopup}
        onOpenChange={(open) => {
          setShowPopup(open);
          if (!open) setPickerError("");
        }}
      >
        <DialogContent className={pickerDialogClass}>
          <DialogTitle className="text-center text-[1.1rem] font-semibold text-foreground m-0">
            Deposit {amountLabel} from
          </DialogTitle>

          <div className="flex gap-2 -mt-[0.6rem]">
            {region.mobileMoney.length > 0 && (
              <button
                type="button"
                aria-pressed={category === "mobile"}
                className={methodBtnClass(category === "mobile")}
                onClick={() => setCategory("mobile")}
              >
                Mobile Money
              </button>
            )}
            <button
              type="button"
              aria-pressed={category === "bank"}
              className={methodBtnClass(category === "bank")}
              onClick={() => setCategory("bank")}
            >
              Bank Transfer
            </button>
            <button
              type="button"
              aria-pressed={category === "card"}
              className={methodBtnClass(category === "card")}
              onClick={() => setCategory("card")}
            >
              Card
            </button>
          </div>

          {category === "mobile" && (
            <>
              <div className="flex gap-2 -mt-[0.6rem]">
                {region.mobileMoney.map((provider) => (
                  <button
                    key={provider}
                    type="button"
                    aria-pressed={mobileProvider === provider}
                    className={methodBtnClass(mobileProvider === provider)}
                    onClick={() => setMobileProvider(provider)}
                  >
                    {provider}
                  </button>
                ))}
              </div>
              <Label htmlFor="deposit-mobile" className={formLabelClass}>
                {mobileProvider} number
              </Label>
              <Input
                id="deposit-mobile"
                type="tel"
                className={formInputClass}
                placeholder="e.g. 254712345678"
                value={mpesaNumber}
                onChange={(e) => setMpesaNumber(e.target.value)}
              />
            </>
          )}

          {category === "bank" && (
            <BankPicker
              banks={paymentMethods.banks}
              partnerBanks={region.partnerBanks}
              selectedId={selectedBankId}
              onSelect={setSelectedBankId}
              setPaymentMethods={setPaymentMethods}
            />
          )}

          {category === "card" &&
            (showAddCardForm ? (
              <>
                <Label htmlFor="card-name" className={formLabelClass}>
                  Cardholder name
                </Label>
                <Input
                  id="card-name"
                  autoComplete="cc-name"
                  className={formInputClass}
                  value={newCard.cardholderName}
                  onChange={(e) =>
                    setNewCard({ ...newCard, cardholderName: e.target.value })
                  }
                />
                <Label htmlFor="card-number" className={formLabelClass}>
                  Card number
                </Label>
                <Input
                  id="card-number"
                  inputMode="numeric"
                  autoComplete="cc-number"
                  className={formInputClass}
                  maxLength={19}
                  placeholder="4111 1111 1111 1111"
                  value={newCard.cardNumber}
                  onChange={(e) =>
                    setNewCard({ ...newCard, cardNumber: e.target.value })
                  }
                />
                <Label htmlFor="card-expiry" className={formLabelClass}>
                  Expiry (MM/YY)
                </Label>
                <Input
                  id="card-expiry"
                  autoComplete="cc-exp"
                  className={formInputClass}
                  maxLength={5}
                  placeholder="MM/YY"
                  value={newCard.expiry}
                  onChange={(e) =>
                    setNewCard({ ...newCard, expiry: e.target.value })
                  }
                />
                <button
                  type="button"
                  className={modalAddLinkClass}
                  onClick={handleAddCard}
                >
                  + Save card
                </button>
                {paymentMethods.cards.length > 0 && (
                  <button
                    type="button"
                    className={modalAddLinkClass}
                    onClick={() => setShowAddCardForm(false)}
                  >
                    Use a saved card instead
                  </button>
                )}
              </>
            ) : (
              <>
                <Label className={formLabelClass}>Card</Label>
                <div className="flex flex-wrap gap-2 -mt-[0.6rem]">
                  {paymentMethods.cards.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      aria-pressed={selectedCardId === c.id}
                      className={favouriteChipClass(selectedCardId === c.id)}
                      onClick={() => setSelectedCardId(c.id)}
                    >
                      {c.brand} •••• {c.last4}
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  className={modalAddLinkClass}
                  onClick={() => setShowAddCardForm(true)}
                >
                  + Add another card
                </button>
              </>
            ))}

{pickerError && (
            <p
              id="deposit-picker-error"
              role="alert"
              className="-mt-1 text-[0.85rem] text-destructive m-0"
            >
              {pickerError}
            </p>
          )}
          <Button
            className={primaryBtnClass}
            disabled={!sourceReady}
            onClick={handleAddMoney}
          >
            Continue
          </Button>
          {!sourceReady && (
            <p className="-mt-2 text-center text-[0.8rem] text-[var(--soft)] m-0">
              {sourceHint}
            </p>
          )}
        </DialogContent>
      </Dialog>

      <TransferStatus
        status={result}
        verb="Depositing"
        doneTitle="Deposit received"
        doneStep={{ label: "Added to wallet", sub: "Confirmed by Payzarc" }}
        onDone={goToDashboard}
        onEdit={() => setResult(null)}
        onReviewAgain={() => {
          setResult(null);
          handleAddMoney();
        }}
        onRetry={() => runDeposit(result.sourceLabel, result.key)}
        onViewTransactions={() => openSection("reports")}
      />
    </>
  );
}

export default AddMoney;
