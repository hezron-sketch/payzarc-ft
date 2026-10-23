import React, { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { transactionsApi } from "../../utility/axiosInstance";
import { isSafeText } from "../../utility/validators";
import {
  formLabelClass,
  formInputClass,
  modalAddLinkClass,
  favouriteChipClass,
} from "./shared";

const EMPTY_BANK = { bankName: "", accountNumber: "", accountName: "" };

function BankPicker({
  banks,
  partnerBanks,
  selectedId,
  onSelect,
  setPaymentMethods,
}) {
  const [showForm, setShowForm] = useState(banks.length === 0);
  const [newBank, setNewBank] = useState(EMPTY_BANK);
  const [error, setError] = useState("");

  const handleAddBank = async () => {
    setError("");
    if (!newBank.bankName || !newBank.accountNumber || !newBank.accountName) {
      setError("Fill in bank, account number, and account name",
      );
      return;
    }
    if (!/^\d{6,20}$/.test(newBank.accountNumber.trim())) {
      setError("Enter a valid account number");
      return;
    }
    if (!isSafeText(newBank.accountName)) {
      setError("Account name can't contain < or > characters");
      return;
    }
    try {
      const res = await transactionsApi.post(
        "/api/payment-methods/banks/",
        newBank,
      );
      const saved = res.data || [];
      setPaymentMethods((pm) => ({ ...pm, banks: saved }));
      onSelect(saved[saved.length - 1]?.id ?? null);
      setShowForm(false);
      setNewBank(EMPTY_BANK);
    } catch (error) {
      setError("Failed to save bank account");
    }
  };

  if (!showForm) {
    return (
      <>
        <Label className={formLabelClass}>Bank account</Label>
        <div className="flex flex-wrap gap-2 -mt-[0.6rem]">
          {banks.map((b) => (
            <button
              key={b.id}
              type="button"
              aria-pressed={selectedId === b.id}
              className={favouriteChipClass(selectedId === b.id)}
              onClick={() => onSelect(b.id)}
            >
              {b.bankName} •••• {String(b.accountNumber).slice(-4)}
            </button>
          ))}
        </div>
        <button
          type="button"
          className={modalAddLinkClass}
          onClick={() => setShowForm(true)}
        >
          + Add another bank
        </button>
      </>
    );
  }

  return (
    <>
      <Label htmlFor="bank-name" className={formLabelClass}>
        Bank
      </Label>
      <select
        id="bank-name"
        className={formInputClass}
        value={newBank.bankName}
        onChange={(e) => setNewBank({ ...newBank, bankName: e.target.value })}
      >
        <option value="">Select a bank</option>
        {partnerBanks.map((b) => (
          <option key={b} value={b}>
            {b}
          </option>
        ))}
      </select>
      <Label htmlFor="bank-account-number" className={formLabelClass}>
        Account number
      </Label>
      <Input
        id="bank-account-number"
        inputMode="numeric"
        className={formInputClass}
        value={newBank.accountNumber}
        onChange={(e) =>
          setNewBank({ ...newBank, accountNumber: e.target.value })
        }
      />
      <Label htmlFor="bank-account-name" className={formLabelClass}>
        Account name
      </Label>
      <Input
        id="bank-account-name"
        className={formInputClass}
        value={newBank.accountName}
        onChange={(e) =>
          setNewBank({ ...newBank, accountName: e.target.value })
        }
      />
{error && (
      <p
        id="bank-form-error"
        role="alert"
        className="-mt-1 text-[0.85rem] text-destructive m-0"
      >
        {error}
      </p>
      )}
      <button
        type="button"
        className={modalAddLinkClass}
        onClick={handleAddBank}
      >
        + Save bank account
      </button>
      {banks.length > 0 && (
        <button
          type="button"
          className={modalAddLinkClass}
          onClick={() => setShowForm(false)}
        >
          Use a saved bank instead
        </button>
      )}
    </>
  );
}

export default BankPicker;
