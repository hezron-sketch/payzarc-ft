import React, { useState } from "react";
import { Download } from "lucide-react";
import { countries } from "../../utility/countries";
import { isoToFlagEmoji } from "../../utility/isoToFlagEmoji";
import { generateReceiptPDF } from "../../utility/generateReceipt";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";

const statusStyles = {
  Paid: "bg-success/15 text-success",
  Sent: "bg-success/15 text-success",
  Completed: "bg-success/15 text-success",
  Received: "bg-info/15 text-info",
  Pending: "bg-[rgba(251,146,60,0.15)] text-[#fb923c]",
};

const rowClass = "flex items-center justify-between gap-4 ml-4 pr-4 py-3 min-h-11";
const rowLabelClass = "text-[15px] text-muted-foreground shrink-0";
const rowValueClass =
  "text-[15px] text-foreground text-right break-all min-w-0 tabular-nums";

function TransactionDetails({ transaction, closeDetailsPopup }) {
  const [isDownloading, setIsDownloading] = useState(false);

  const getFlagEmoji = (countryName) => {
    const country = countries.find(
      (c) => c.name?.toLowerCase() === countryName?.toLowerCase(),
    );
    return country ? isoToFlagEmoji(country.flag) : "🏳️";
  };

  const refNo =
    transaction.refNo || transaction.transaction_code || transaction.reference;

  const name =
    transaction.name ||
    transaction.recipient_name ||
    transaction.sender_name ||
    "N/A";

  const isCredit =
    transaction.transaction_type === "CREDIT" ||
    transaction.status === "Received";

  const currency = transaction.currency || "KES";
  const money = (v) => {
    const n = Number(String(v ?? "").trim().replace(/^[+-]/, ""));
    if (v == null || v === "" || Number.isNaN(n)) return "N/A";
    return `${currency} ${n.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  const amount = money(transaction.amount);
  const fee = money(transaction.fee ?? transaction.transaction_fee);

  const rawDate =
    transaction.date || transaction.created_at || transaction.timestamp;
  const date = rawDate
    ? new Date(rawDate).toLocaleString(undefined, {
        dateStyle: "medium",
        timeStyle: "short",
      })
    : "N/A";

  const recipient =
    transaction.recipient ||
    transaction.recipient_name ||
    transaction.recipient_number ||
    "N/A";

  const status = transaction.status || (isCredit ? "Received" : "Paid");

  const country =
    transaction.country || transaction.recipient_country || transaction.flag;

  const flagEmoji = getFlagEmoji(country);

  const handleDownloadReceipt = async () => {
    try {
      setIsDownloading(true);
      await generateReceiptPDF(transaction);
    } catch (error) {
      console.error("Failed to generate receipt:", error);
      alert("Failed to download receipt. Please try again.");
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <Dialog
      open
      onOpenChange={(isOpen) => {
        if (!isOpen) closeDetailsPopup();
      }}
    >
      <DialogContent className="max-h-[85%] overflow-y-auto overflow-x-hidden bg-card p-0 gap-0">
        <div className="sticky top-0 z-[1] flex h-16 items-center justify-center bg-card/75 backdrop-blur-xl">
          <DialogTitle className="text-[15px] font-semibold text-foreground m-0">
            Transaction Details
          </DialogTitle>
        </div>

        <div className="flex flex-col items-center px-6 pt-2 pb-7 text-center">
          <img
            src={transaction.image || "/images/default-user.png"}
            alt=""
            className="w-16 h-16 rounded-full object-cover ring-1 ring-white/10"
            onError={(e) => {
              e.target.src = "/images/default-user.png";
            }}
            loading="lazy"
          />
          <p className="mt-3 text-[17px] font-semibold text-foreground break-words max-w-full">
            {name}
          </p>
          <p
            className={cn(
              "mt-2 text-[34px] font-semibold leading-none tracking-[-0.02em] tabular-nums",
              isCredit ? "text-success" : "text-foreground",
            )}
          >
            {amount !== "N/A" && (isCredit ? "+" : "−")}
            {amount}
          </p>
          <span
            className={cn(
              "mt-4 inline-block px-3 py-1 rounded-full text-[13px] font-semibold capitalize",
              statusStyles[status] || "bg-white/10 text-muted-foreground",
            )}
          >
            {status}
          </span>
        </div>

        <div className="mx-4 rounded-2xl bg-white/[0.04] divide-y divide-white/[0.06]">
          <div className={rowClass}>
            <span className={rowLabelClass}>Recipient</span>
            <span className={rowValueClass}>{recipient}</span>
          </div>
          <div className={rowClass}>
            <span className={rowLabelClass}>Date</span>
            <span className={rowValueClass}>{date}</span>
          </div>
          <div className={rowClass}>
            <span className={rowLabelClass}>Fee</span>
            <span className={rowValueClass}>{fee}</span>
          </div>
          <div className={rowClass}>
            <span className={rowLabelClass}>Country</span>
            <span className={cn(rowValueClass, "flex items-center gap-1.5")}>
              <span className="leading-none">{flagEmoji}</span>
              {country || "N/A"}
            </span>
          </div>
          <div className={rowClass}>
            <span className={rowLabelClass}>Reference</span>
            <span className={cn(rowValueClass, "font-mono text-[13px]")}>
              {refNo || "N/A"}
            </span>
          </div>
        </div>

        <div className="px-4 pt-5 pb-6">
          <Button
            className="w-full h-12 rounded-full text-[15px] font-semibold active:scale-[0.97] transition-transform duration-100"
            onClick={handleDownloadReceipt}
            disabled={isDownloading}
          >
            <Download size={18} />
            {isDownloading ? "Generating…" : "Download Receipt"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default TransactionDetails;
