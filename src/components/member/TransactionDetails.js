import React, { useState, useRef } from "react";
import { Download } from "lucide-react";
import { countries } from "../../utility/countries";
import { generateReceiptPDF } from "../../utility/generateReceipt";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";

// Exact-match status labels get a colored pill; anything else (e.g. an
// unrecognized backend status string) renders as a plain pill, same as the
// original CSS-module lookup silently no-op'ing on an unknown key.
const statusStyles = {
  Paid: "bg-success/15 text-success border border-success/30",
  Sent: "bg-success/15 text-success border border-success/30",
  Completed: "bg-success/15 text-success border border-success/30",
  Received: "bg-info/15 text-info border border-info/30",
  Pending:
    "bg-[rgba(251,146,60,0.15)] text-[#fb923c] border border-[rgba(251,146,60,0.3)]",
};

const rowClass =
  "flex justify-between items-center gap-3 py-[0.85rem] px-2 -mx-2 border-b border-border last:border-b-0 rounded-md transition-colors hover:bg-[var(--gold-pale)] max-[640px]:flex-col max-[640px]:items-start max-[640px]:gap-1";
const rowLabelClass =
  "text-xs font-semibold text-[var(--soft)] uppercase tracking-[0.5px] shrink-0";
const rowValueClass =
  "text-sm font-medium text-foreground text-right break-words min-w-0 max-[640px]:text-left";

function TransactionDetails({ transaction, closeDetailsPopup }) {
  const [isDownloading, setIsDownloading] = useState(false);
  // Same hide-on-scroll-down/show-on-scroll-up pattern as Dashboard.js's
  // topbar, but tracked against this dialog's own internal scroll (the
  // dialog scrolls itself via overflow-y-auto, not the window).
  const [hideHeader, setHideHeader] = useState(false);
  const lastScrollTop = useRef(0);

  const handleContentScroll = (e) => {
    const scrollTop = e.currentTarget.scrollTop;
    const scrolledPastHeader = scrollTop > 56;
    const scrollingDown = scrollTop > lastScrollTop.current;
    setHideHeader(scrolledPastHeader && scrollingDown);
    lastScrollTop.current = scrollTop;
  };

  const getFlagEmoji = (countryName) => {
    const country = countries.find(
      (c) => c.name?.toLowerCase() === countryName?.toLowerCase(),
    );
    return country ? country.flag : "🏳️";
  };

  // `transaction` here is the raw tx object History.js fetched from the API
  // (see History.js's own field fallbacks) — not a pre-shaped "details"
  // object. Read the same fallback chains here so nothing renders blank.
  const refNo =
    transaction.refNo || transaction.transaction_code || transaction.reference;

  const name =
    transaction.name ||
    transaction.recipient_name ||
    transaction.sender_name ||
    "N/A";

  const amount = transaction.amount ?? "N/A";

  const fee = transaction.fee ?? transaction.transaction_fee ?? "N/A";

  const rawDate =
    transaction.date || transaction.created_at || transaction.timestamp;
  const date = rawDate ? new Date(rawDate).toLocaleString() : "N/A";

  const recipient =
    transaction.recipient ||
    transaction.recipient_name ||
    transaction.recipient_number ||
    "N/A";

  const status =
    transaction.status ||
    (transaction.transaction_type === "CREDIT" ? "Received" : "Paid");

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
      <DialogContent
        onScroll={handleContentScroll}
        className="w-[calc(100vw-2rem)] max-w-[520px] max-h-[85vh] overflow-y-auto overflow-x-hidden bg-card rounded-lg p-0 gap-0"
      >
        <div
          className={cn(
            "sticky top-0 z-[1] px-7 py-6 max-[480px]:px-5 bg-card border-b border-border transition-transform duration-300 ease-in-out",
            hideHeader && "-translate-y-full",
          )}
        >
          <DialogTitle className="text-lg font-bold text-foreground m-0 tracking-[-0.3px]">
            Transaction Details
          </DialogTitle>
        </div>

        <div className="px-7 pt-6 pb-4 text-center bg-white/[0.02] border-b border-border">
          <img
            src={transaction.image || "/images/default-user.png"}
            alt="BeneficiaryImg"
            className="w-20 h-20 rounded-full object-cover border-2 border-[var(--gold-border)] mx-auto"
            onError={(e) => {
              e.target.src = "/images/default-user.png";
            }}
            loading="lazy"
          />
        </div>

        <div className="flex flex-col px-7 py-6">
          <div className={rowClass}>
            <span className={rowLabelClass}>Ref. ID</span>
            <span className={rowValueClass}>{refNo}</span>
          </div>
          <div className={rowClass}>
            <span className={rowLabelClass}>Name</span>
            <span className={rowValueClass}>{name}</span>
          </div>
          <div className={rowClass}>
            <span className={rowLabelClass}>Amount</span>
            <span className={cn(rowValueClass, "text-gold font-bold text-[15px]")}>
              {amount}
            </span>
          </div>
          <div className={rowClass}>
            <span className={rowLabelClass}>Fee</span>
            <span className={rowValueClass}>{fee}</span>
          </div>
          <div className={rowClass}>
            <span className={rowLabelClass}>Date</span>
            <span className={rowValueClass}>{date}</span>
          </div>
          <div className={rowClass}>
            <span className={rowLabelClass}>Recipient</span>
            <span className={rowValueClass}>{recipient}</span>
          </div>
          <div className={rowClass}>
            <span className={rowLabelClass}>Status</span>
            <span className={rowValueClass}>
              <span
                className={cn(
                  "inline-block px-3.5 py-1.5 rounded-full text-xs font-bold capitalize whitespace-nowrap transition-transform hover:scale-105",
                  statusStyles[status],
                )}
              >
                {status}
              </span>
            </span>
          </div>
          <div className={rowClass}>
            <span className={rowLabelClass}>Country</span>
            <span className={cn(rowValueClass, "flex items-center gap-2 justify-end max-[640px]:justify-start")}>
              <span className="text-lg leading-none">{flagEmoji}</span>
              <span className="text-[13px] font-semibold text-foreground">
                {country}
              </span>
            </span>
          </div>
        </div>

        <div className="flex gap-3 px-7 py-6 border-t border-border bg-white/[0.02] max-[640px]:flex-col">
          <Button
            className="flex-1 h-auto rounded-md px-5 py-[0.85rem] text-[13px] font-semibold shadow-[0_4px_12px_rgba(var(--gold-rgb),0.25)] hover:-translate-y-0.5"
            onClick={handleDownloadReceipt}
            disabled={isDownloading}
            title="Download transaction receipt as PDF"
          >
            <Download size={16} />
            {isDownloading ? "Generating..." : "Download Receipt"}
          </Button>
          <Button
            variant="secondary"
            className="flex-1 h-auto rounded-md px-5 py-[0.85rem] text-[13px] font-semibold border border-input"
            onClick={closeDetailsPopup}
          >
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default TransactionDetails;
