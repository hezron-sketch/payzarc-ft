import React, { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { transactionsApi } from "../../../utility/axiosInstance";
import { isSafeText } from "../../../utility/validators";
import {
  formLabelClass,
  formInputClass,
  modalAddLinkClass,
  favouriteChipClass,
} from "./shared";

const EMPTY_BANK = { bankName: "", accountNumber: "", accountName: "" };

// Linked-bank chooser shared by the Add Money and Withdraw dialogs: pick a
// saved bank, or add one (which then gets selected). Opens straight on the
// add form when nothing is linked yet.
function BankPicker({
  banks,
  partnerBanks,
  selectedId,
  onSelect,
  setPaymentMethods,
  showNotification,
}) {
  const [showForm, setShowForm] = useState(banks.length === 0);
  const [newBank, setNewBank] = useState(EMPTY_BANK);

  const handleAddBank = async () => {
    if (!newBank.bankName || !newBank.accountNumber || !newBank.accountName) {
      showNotification(
        "error",
        "Fill in bank, account number, and account name",
      );
      return;
    }
    if (!/^\d{6,20}$/.test(newBank.accountNumber.trim())) {
      showNotification("error", "Enter a valid account number");
      return;
    }
    if (!isSafeText(newBank.accountName)) {
      showNotification("error", "Account name can't contain < or > characters");
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
      showNotification("error", "Failed to save bank account");
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
      <Label className={formLabelClass}>Bank</Label>
      <select
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
      <Label className={formLabelClass}>Account number</Label>
      <Input
        className={formInputClass}
        value={newBank.accountNumber}
        onChange={(e) =>
          setNewBank({ ...newBank, accountNumber: e.target.value })
        }
      />
      <Label className={formLabelClass}>Account name</Label>
      <Input
        className={formInputClass}
        value={newBank.accountName}
        onChange={(e) =>
          setNewBank({ ...newBank, accountName: e.target.value })
        }
      />
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
