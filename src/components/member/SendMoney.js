import React, { useEffect, useState } from "react";
import { contactsApi } from "../../utility/axiosInstance";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { EXCHANGE_RATES } from "../../utility/exchangeRates";
import { isValidEmail, isValidPhone } from "../../utility/validators";
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
  findCountryByName,
  detectCountryFromPhone,
  errorMessage,
  lookupRecipientName,
  lookupErrorMessage,
  FeeSummary,
  InsufficientBalance,
} from "./transferCore";

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
  user,
}) {
  const [requestFace, faceModal] = useFaceAuth(user?.email);
  const [sendAmount, setSendAmount] = useState("");
  const [transfer, setTransfer] = useState(null);
  const [lookingUp, setLookingUp] = useState(false);
  const [selectedRecipient, setSelectedRecipient] = useState(initialRecipient);
  const [recipientSearchTerm, setRecipientSearchTerm] = useState(
    initialRecipient
      ? initialRecipient.display_name || recipientLabel(initialRecipient) || ""
      : "",
  );
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
      await contactsApi.post("/api/check/", { type: favouriteType, value });
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
    const recipientValue =
      (selectedRecipient &&
        (selectedRecipient.value ||
          selectedRecipient.phone ||
          selectedRecipient.phone_number)) ||
      withSenderCountryCode(recipientSearchTerm);
    if (!recipientValue || !sendAmount || Number(sendAmount) <= 0) {
      showNotification("error", "Please fill in recipient and a valid amount");
      return;
    }
    if (
      !selectedRecipient &&
      !isValidPhone(recipientValue) &&
      !isValidEmail(recipientValue)
    ) {
      showNotification("error", "Enter a valid phone number or email");
      return;
    }

    let recipientDisplayName;
    setLookingUp(true);
    try {
      recipientDisplayName = await lookupRecipientName(recipientValue);
    } catch (error) {
      showNotification("error", lookupErrorMessage(error));
      return;
    } finally {
      setLookingUp(false);
    }

    const summary = `${senderCurrency} ${sendAmountNum.toFixed(2)} to ${recipientDisplayName}`;
    const receiveRow =
      convertedSendAmount && recipientCurrency && recipientCurrency !== senderCurrency
        ? [
            {
              label: "They receive",
              value: `≈ ${recipientCurrency} ${Number(convertedSendAmount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
            },
            {
              label: liveRates ? "Live rate" : "Indicative rate",
              value: `1 ${senderCurrency} = ${conversionRate} ${recipientCurrency}`,
            },
          ]
        : [];
    openConfirmationDialog({
      title: "Review transfer",
      recipient: {
        name: recipientDisplayName,
        detail: [
          recipientValue,
          recipientCountry &&
            `${isoToFlagEmoji(recipientCountry.flag)} ${recipientCountry.name}`,
        ]
          .filter(Boolean)
          .join(" · "),
      },
      rows: [
        { label: "You send", value: `${senderCurrency} ${sendAmountNum.toFixed(2)}` },
        ...receiveRow,
        { label: "Fee", value: `${senderCurrency} ${sendFee.toFixed(2)}` },
        { label: "Total", value: `${senderCurrency} ${sendTotal.toFixed(2)}`, strong: true },
      ],
      auth: true,
      onConfirm: async (pin) => {
        const auth = await authorize(pin, requestFace);
        if (auth)
          runTransfer(auth, recipientValue, summary, newIdempotencyKey());
      },
    });
  };

  const runTransfer = async (auth, recipientValue, summary, key) => {
    const base = { auth, recipientValue, summary, key };
    setTransfer({ ...base, phase: "sending" });
    try {
      await postTransfer(
        "/api/send-money/",
        {
          recipient_number: recipientValue,
          amount: sendAmountNum,
          fee: sendFee,
        },
        auth,
        key,
      );
      setTransfer({ ...base, phase: "done" });
      refreshWallet();
    } catch (error) {
      setTransfer({
        ...base,
        phase: "failed",
        kind: failureKind(error),
        error: errorMessage(error, "Transfer failed"),
        reference: error.reference,
      });
    }
  };

  return (
    <>
      <div className={flowPanelClass}>
        <div className="flex items-center justify-between">
          {myCountry && (
            <span className="flex items-center gap-1.5 text-[0.85rem] font-semibold text-[var(--soft)]">
              Sending from {isoToFlagEmoji(myCountry.flag)}
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
        <Label htmlFor="send-recipient" className={formLabelClass}>
          Recipient
          {recipientCountry && (
            <span className="font-medium text-muted-foreground">
              {isoToFlagEmoji(recipientCountry.flag)} {recipientCountry.name}
            </span>
          )}
        </Label>
        <Input
          id="send-recipient"
          className={formInputClass}
          placeholder={
            myCountry
              ? "Name, or local number e.g. 707069007"
              : "Name or phone number"
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

        <Label htmlFor="send-amount" className={formLabelClass}>
          Amount ({senderCurrency})
        </Label>
        <Input
          id="send-amount"
          inputMode="decimal"
          autoComplete="off"
          className={formInputClass}
          placeholder="0.00"
          value={sendAmount}
          onChange={(e) => setSendAmount(toDecimalInput(e.target.value))}
        />
        <div
          aria-live="polite"
          className="bg-[var(--gold-pale)] border border-dashed border-[var(--gold-border)] rounded-xl px-4 py-[0.85rem] text-center -mt-[0.6rem]">
          {availableCurrencies.length > 0 ? (
            <>
              <div className="flex items-center justify-center gap-2">
                <span className="text-[1.2rem] font-bold text-gold tracking-[-0.3px]">
                  ≈ {Number(convertedSendAmount || 0).toLocaleString()}
                </span>
                <select
                  className="bg-white/[0.06] text-gold border border-[var(--gold-border)] rounded-sm px-2 py-1 text-[0.95rem] font-bold cursor-pointer outline-none disabled:opacity-85 disabled:cursor-default"
                  aria-label="Recipient currency"
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
              <span className="block text-xs text-gold/85 mt-1 tabular-nums">
                1 {senderCurrency} = {conversionRate} {recipientCurrency} ·{" "}
                {liveRates ? "live rate" : "indicative rate"}
              </span>
            </>
          ) : (
            <span className="block text-xs text-gold/85 mt-1">
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
          <Button
            className={primaryBtnClass}
            disabled={lookingUp}
            onClick={handleSendMoney}
          >
            {lookingUp ? "Checking recipient…" : "Review"}
          </Button>
        )}
      </div>

      <TransferStatus
        status={transfer}
        verb="Sending"
        doneTitle="Money delivered"
        doneStep={{
          label: "Delivered",
          sub: "Confirmed by Payzarc",
        }}
        onDone={goToDashboard}
        onEdit={() => setTransfer(null)}
        onReviewAgain={() => {
          setTransfer(null);
          handleSendMoney();
        }}
        onRetry={() =>
          runTransfer(
            transfer.auth,
            transfer.recipientValue,
            transfer.summary,
            transfer.key,
          )
        }
        onViewTransactions={() => openSection("reports")}
        onSettled={refreshWallet}
      />
      {faceModal}
    </>
  );
}
