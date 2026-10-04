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
} from "./shared";

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

  // Region-specific mobile money providers + partner banks for the sender's
  // detected country (Kenya/EU/US get their own set, everything else falls
  // back to generic bank transfer).
  const region = getRegionProviders(myCountry);

  const handleAddMoneyClick = () => {
    if (!addAmount || Number(addAmount) <= 0) {
      showNotification("error", "Enter a valid amount");
      return;
    }
    setCategory(region.mobileMoney.length > 0 ? "mobile" : "bank");
    setMobileProvider(region.mobileMoney[0] || "");
    setShowAddCardForm(paymentMethods.cards.length === 0);
    setShowPopup(true);
  };

  const handleAddCard = async () => {
    if (!newCard.cardholderName || !newCard.cardNumber || !newCard.expiry) {
      showNotification(
        "error",
        "Fill in cardholder name, card number, and expiry",
      );
      return;
    }
    if (!isSafeText(newCard.cardholderName)) {
      showNotification(
        "error",
        "Cardholder name can't contain < or > characters",
      );
      return;
    }
    if (!isValidCardNumber(newCard.cardNumber)) {
      showNotification("error", "Enter a valid card number");
      return;
    }
    if (!isValidExpiry(newCard.expiry)) {
      showNotification("error", "Enter a valid, unexpired expiry date (MM/YY)");
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
      showNotification("error", "Failed to save card");
    }
  };

  const handleAddMoney = async () => {
    if (!addAmount || Number(addAmount) <= 0) {
      showNotification("error", "Enter a valid amount");
      return;
    }
    if (category === "mobile" && !isValidPhone(mpesaNumber)) {
      showNotification(
        "error",
        `Enter a valid ${mobileProvider} number to add from`,
      );
      return;
    }
    if (category === "bank" && !selectedBankId) {
      showNotification("error", "Select or add a bank account");
      return;
    }
    if (category === "card" && !selectedCardId) {
      showNotification("error", "Select or add a card");
      return;
    }

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
          : `Visa •••• ${selectedCard?.last4}`;

    openConfirmationDialog(
      "Confirm Deposit",
      `Deposit ${displayCurrency}${addAmount} from ${sourceLabel}?\n\nType 1 and click Yes to confirm.`,
      async (typedValue, buttonChoice) => {
        if (typedValue !== "1" || buttonChoice !== "yes") {
          showNotification("error", "Transaction cancelled");
          return;
        }
        try {
          // NOTE: guessed endpoint, following the /api/send-money/ pattern —
          // point this at your real deposit/top-up endpoint if different.
          await transactionsApi.post("/api/add-money/", {
            amount: parseFloat(addAmount),
            source: category,
            ...(category === "mobile" && {
              provider: mobileProvider,
              mobile_number: mpesaNumber,
            }),
            ...(category === "bank" && { bank_id: selectedBankId }),
            ...(category === "card" && { card_id: selectedCardId }),
          });
          showNotification("success", "Money added successfully!");
          refreshWallet();
          goToDashboard();
        } catch (error) {
          const errorMsg =
            error.response?.data?.message ||
            error.response?.data?.error ||
            "Deposit failed";
          showNotification("error", errorMsg);
        }
      },
    );
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
          value={addAmount}
          onChange={(e) => setAddAmount(e.target.value)}
        />

        <Button className={primaryBtnClass} onClick={handleAddMoneyClick}>
          Add {displayCurrency} {addAmount || "0.00"}
        </Button>
      </div>

      {/* Service picker popup, shown once a valid amount is entered */}
      <Dialog open={showPopup} onOpenChange={setShowPopup}>
        <DialogContent className={pickerDialogClass}>
          <DialogTitle className="text-center text-[1.1rem] font-bold text-foreground m-0">
            Deposit from
          </DialogTitle>

          <div className="flex gap-2 -mt-[0.6rem]">
            {region.mobileMoney.length > 0 && (
              <button
                type="button"
                className={methodBtnClass(category === "mobile")}
                onClick={() => setCategory("mobile")}
              >
                Mobile Money
              </button>
            )}
            <button
              type="button"
              className={methodBtnClass(category === "bank")}
              onClick={() => setCategory("bank")}
            >
              Bank Transfer
            </button>
            <button
              type="button"
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
                    className={methodBtnClass(mobileProvider === provider)}
                    onClick={() => setMobileProvider(provider)}
                  >
                    {provider}
                  </button>
                ))}
              </div>
              <Label className={formLabelClass}>{mobileProvider} number</Label>
              <Input
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
              showNotification={showNotification}
            />
          )}

          {category === "card" &&
            (showAddCardForm ? (
              <>
                <Label className={formLabelClass}>Cardholder name</Label>
                <Input
                  className={formInputClass}
                  value={newCard.cardholderName}
                  onChange={(e) =>
                    setNewCard({ ...newCard, cardholderName: e.target.value })
                  }
                />
                <Label className={formLabelClass}>Card number</Label>
                <Input
                  className={formInputClass}
                  maxLength={19}
                  placeholder="4111 1111 1111 1111"
                  value={newCard.cardNumber}
                  onChange={(e) =>
                    setNewCard({ ...newCard, cardNumber: e.target.value })
                  }
                />
                <Label className={formLabelClass}>Expiry (MM/YY)</Label>
                <Input
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

          <Button
            className={primaryBtnClass}
            onClick={() => {
              setShowPopup(false);
              handleAddMoney();
            }}
          >
            Continue
          </Button>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default AddMoney;
