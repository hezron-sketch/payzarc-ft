import React, { useState } from "react";
import { transactionsApi } from "../../utility/axiosInstance";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { getRegionProviders } from "../../utility/regionProviders";
import { isValidPhone } from "../../utility/validators";
import BankPicker from "./BankPicker";
import { useFaceAuth } from "./Face";
import {
  formLabelClass,
  formInputClass,
  primaryBtnClass,
  flowPanelClass,
  pickerDialogClass,
  modalAddLinkClass,
  methodBtnClass,
  favouriteChipClass,
  failureKind,
  newIdempotencyKey,
  toDecimalInput,
} from "./shared";
import TransferStatus from "./TransferStatus";
import {
  postTransfer,
  authorize,
  errorMessage,
  InsufficientBalance,
} from "./transferCore";

// Mpesa/bank withdrawals must land on an account already linked to this
// user (Profile "Payment Methods") — never a number typed in on the spot.
// Agent is the one exception: it's a physical cash-out code, not an
// account, so it stays free text.
export function Withdraw({
  myCountry,
  displayCurrency,
  availableBalance,
  formattedBalance,
  paymentMethods,
  setPaymentMethods,
  showNotification,
  openConfirmationDialog,
  refreshWallet,
  goToDashboard,
  openSection,
  user,
}) {
  const [requestFace, faceModal] = useFaceAuth(user?.email);
  const [withdrawAmount, setWithdrawAmount] = useState("");
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
  // The withdrawal in flight, shown in TransferStatus (null hides it).
  const [result, setResult] = useState(null);
  // Errors raised inside the picker dialog render inline there (a toast
  // would sit outside the modal, unreachable and unannounced).
  const [pickerError, setPickerError] = useState("");
  // The picker opens on the region's default destination once; after that
  // reopening it keeps whatever the user last chose.
  const [destinationChosen, setDestinationChosen] = useState(false);

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

  const withdrawNum = parseFloat(withdrawAmount || 0);
  const overBalance = withdrawNum > availableBalance;

  const handleWithdrawClick = () => {
    if (!(withdrawNum > 0)) {
      showNotification("error", "Enter an amount to withdraw");
      return;
    }
    // Mobile money is only a real withdrawal rail where the region has one —
    // default elsewhere to Bank, also a linked-account destination.
    if (!destinationChosen) {
      setDestination(region.mobileMoney.length > 0 ? "mpesa" : "bank");
      setShowAddMobileMoneyForm(paymentMethods.mobileMoney.length === 0);
      setDestinationChosen(true);
    }
    setShowPopup(true);
  };

  const handleAddMobileMoney = async () => {
    setPickerError("");
    if (!newMobileMoney.provider || !newMobileMoney.phoneNumber) {
      setPickerError("Select a provider and enter a phone number");
      return;
    }
    if (!isValidPhone(newMobileMoney.phoneNumber)) {
      setPickerError("Enter a valid phone number");
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
      setPickerError("Failed to save mobile money account");
    }
  };

  const validDestination =
    destination === "mpesa"
      ? !!selectedMobileMoneyId
      : destination === "bank"
        ? !!selectedBankId
        : /^[A-Za-z0-9-]{3,20}$/.test(agentNumber);
  // Shown under the picker's Continue while it's disabled, so the user knows
  // what's missing instead of tapping into an error.
  const destinationHint =
    destination === "mpesa"
      ? "Choose or add a mobile money account."
      : destination === "bank"
        ? "Choose or add a bank account."
        : "Agent numbers are 3–20 letters, digits or dashes.";
  const amountLabel = `${displayCurrency} ${withdrawNum.toFixed(2)}`;

  const handleWithdraw = () => {
    if (!(withdrawNum > 0) || !validDestination) return;
    setShowPopup(false);
    openConfirmationDialog({
      title: "Review withdrawal",
      rows: [
        { label: "To", value: destinationLabel },
        {
          label: "Balance after",
          value: `${displayCurrency} ${(availableBalance - withdrawNum).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        },
        {
          label: "Amount",
          value: `${displayCurrency} ${withdrawNum.toFixed(2)}`,
          strong: true,
        },
      ],
      auth: true,
      onConfirm: async (pin) => {
        const auth = await authorize(pin, requestFace);
        if (auth) runWithdraw(auth, destinationLabel, newIdempotencyKey());
      },
    });
  };

  // Posts the withdrawal and walks TransferStatus through real phases; retry
  // reuses the credential and idempotency key.
  const runWithdraw = async (auth, toLabel, key) => {
    const base = { auth, toLabel, key, summary: `${amountLabel} to ${toLabel}` };
    setResult({ ...base, phase: "sending" });
        try {
          // Agent path confirmed against MerchantWithdrawalService: it reads
          // `merchant_code`, not `agent_number`. Mpesa/bank paths send the id
          // of the linked account (mirroring Add Money's bank_id/card_id) —
          // ponytail: guessed field names, fix if the backend uses something
          // else once those rails are implemented.
          const data = await postTransfer(
            "/api/withdraw/",
            {
              destination,
              ...(destination === "mpesa"
                ? { mobile_money_id: selectedMobileMoneyId }
                : destination === "bank"
                  ? { bank_id: selectedBankId }
                  : { merchant_code: agentNumber }),
              amount: withdrawNum,
            },
            auth,
            key,
          );
          const reference =
            data?.transactionCode ?? data?.transaction_code ?? data?.reference;
          const newBalance = data?.newBalance ?? data?.new_balance ?? data?.balance;
          setResult({
            ...base,
            phase: "done",
            details: [
              { label: "To", value: toLabel },
              reference && { label: "Reference", value: reference },
              newBalance != null && {
                label: "New balance",
                value: `${displayCurrency} ${newBalance}`,
              },
            ].filter(Boolean),
          });
          refreshWallet();
        } catch (error) {
          setResult({
            ...base,
            phase: "failed",
            kind: failureKind(error),
            error: errorMessage(error, "Withdrawal failed"),
          });
        }
  };

  return (
    <>
      <div className={flowPanelClass}>
        <Label htmlFor="withdraw-amount" className={formLabelClass}>
          Amount ({displayCurrency})
        </Label>
        <Input
          id="withdraw-amount"
          inputMode="decimal"
          autoComplete="off"
          className={formInputClass}
          placeholder="0.00"
          value={withdrawAmount}
          onChange={(e) => setWithdrawAmount(toDecimalInput(e.target.value))}
        />
        <p className="-mt-[0.6rem] text-[0.8rem] text-[var(--soft)] tabular-nums m-0">
          Available: {displayCurrency} {formattedBalance}
        </p>

        {overBalance ? (
          <InsufficientBalance
            currency={displayCurrency}
            total={withdrawNum}
            formattedBalance={formattedBalance}
            onAddMoney={() => openSection("add-money")}
          />
        ) : (
          <Button className={primaryBtnClass} onClick={handleWithdrawClick}>
            Continue
          </Button>
        )}
      </div>

      {/* Destination picker, shown once a valid amount is entered. The PIN
          comes last, in the review sheet, after the destination is chosen. */}
      <Dialog
        open={showPopup}
        onOpenChange={(open) => {
          setShowPopup(open);
          if (!open) setPickerError("");
        }}
      >
        <DialogContent className={pickerDialogClass}>
          <DialogTitle className="text-center text-[1.1rem] font-semibold text-foreground m-0">
            Withdraw {amountLabel} to
          </DialogTitle>
          <div className="flex gap-2 -mt-[0.6rem]">
            {(region.mobileMoney.length > 0
              ? ["mpesa", "bank", "agent"]
              : ["bank", "agent"]
            ).map((dest) => (
              <button
                key={dest}
                type="button"
                aria-pressed={destination === dest}
                className={methodBtnClass(destination === dest)}
                onClick={() => setDestination(dest)}
              >
                {dest === "mpesa"
                  ? "Mobile money"
                  : dest === "bank"
                    ? "Bank"
                    : "Agent"}
              </button>
            ))}
          </div>

          {destination === "mpesa" &&
            (showAddMobileMoneyForm ? (
              <>
                <Label htmlFor="withdraw-provider" className={formLabelClass}>
                  Provider
                </Label>
                <select
                  id="withdraw-provider"
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
                <Label htmlFor="withdraw-phone" className={formLabelClass}>
                  Phone number
                </Label>
                <Input
                  id="withdraw-phone"
                  type="tel"
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
                <Label className={formLabelClass}>Mobile money account</Label>
                <div className="flex flex-wrap gap-2 -mt-[0.6rem]">
                  {paymentMethods.mobileMoney.map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      aria-pressed={selectedMobileMoneyId === m.id}
                      className={favouriteChipClass(selectedMobileMoneyId === m.id)}
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
            />
          )}

          {destination === "agent" && (
            <>
              <Label htmlFor="withdraw-agent" className={formLabelClass}>
                Agent number
              </Label>
              <Input
                id="withdraw-agent"
                aria-describedby="withdraw-hint"
                className={formInputClass}
                placeholder="e.g. AG-10293"
                value={agentNumber}
                onChange={(e) => setAgentNumber(e.target.value)}
              />
            </>
          )}

{pickerError && (
            <p
              id="withdraw-picker-error"
              role="alert"
              className="-mt-1 text-[0.85rem] text-destructive m-0"
            >
              {pickerError}
            </p>
          )}
          <Button
            className={primaryBtnClass}
            disabled={!validDestination}
            onClick={handleWithdraw}
          >
            Continue
          </Button>
          {!validDestination && (
            <p
              id="withdraw-hint"
              className="-mt-2 text-center text-[0.8rem] text-[var(--soft)] m-0"
            >
              {destinationHint}
            </p>
          )}
        </DialogContent>
      </Dialog>

      <TransferStatus
        status={result}
        verb="Withdrawing"
        doneTitle="Withdrawal sent"
        doneStep={{ label: "Sent", sub: "Confirmed by Payzarc" }}
        onDone={goToDashboard}
        onEdit={() => setResult(null)}
        onReviewAgain={() => {
          setResult(null);
          handleWithdraw();
        }}
        onRetry={() => runWithdraw(result.auth, result.toLabel, result.key)}
        onViewTransactions={() => openSection("reports")}
      />
      {faceModal}
    </>
  );
}
