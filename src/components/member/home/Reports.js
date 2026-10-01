import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { transactionsApi } from "../../../utility/axiosInstance";
import History from "../History";
import {
  formLabelClass,
  formInputClass,
  primaryBtnClass,
  flowPanelClass,
} from "./shared";

// CSV-escape one cell: quote it if it has a comma, quote or newline.
const csvCell = (v) => {
  const str = v === undefined || v === null ? "" : String(v);
  return /[",\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
};

// Date-range CSV export plus the compact History list (which has its own
// search/PDF statement export).
function Reports({ showNotification }) {
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [isExporting, setIsExporting] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState(null);

  // Downloads the transaction history for the chosen date range as CSV.
  // Sends the range to the API (same date_from/date_to params History.js
  // uses) and re-filters client-side in case the backend ignores them.
  // ponytail: single request — if /history/ paginates, only the first page
  // is exported; follow `next` links here if that becomes a problem.
  const handleExportCSV = async () => {
    try {
      setIsExporting(true);
      const params = {};
      if (startDate) params.date_from = startDate;
      if (endDate) params.date_to = endDate;
      const res = await transactionsApi.get("/api/transactions/history/", {
        params,
      });
      const data = res.data;
      let txs = Array.isArray(data)
        ? data
        : data.results || data.transactions || [];

      const txDate = (tx) => new Date(tx.date || tx.created_at);
      if (startDate) {
        const from = new Date(startDate);
        txs = txs.filter((tx) => txDate(tx) >= from);
      }
      if (endDate) {
        const to = new Date(endDate);
        to.setHours(23, 59, 59, 999);
        txs = txs.filter((tx) => txDate(tx) <= to);
      }

      if (txs.length === 0) {
        showNotification(
          "error",
          "No transactions found for the selected date range.",
        );
        return;
      }

      const headers = [
        "ID",
        "Type",
        "Name/Description",
        "Amount",
        "Date",
        "Fee",
        "Currency",
        "Status",
      ];
      const rows = txs.map((tx) =>
        [
          tx.id,
          tx.transaction_type || tx.type,
          tx.name || tx.description,
          tx.amount,
          tx.date || tx.created_at,
          tx.fee,
          tx.currency,
          tx.status,
        ]
          .map(csvCell)
          .join(","),
      );
      const csv = [headers.join(","), ...rows].join("\n");

      const url = URL.createObjectURL(
        new Blob([csv], { type: "text/csv;charset=utf-8;" }),
      );
      const link = document.createElement("a");
      link.href = url;
      link.download = `transaction_report_${startDate || "all"}_to_${endDate || "all"}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      showNotification(
        "success",
        "Transaction report downloaded successfully!",
      );
    } catch (err) {
      console.error("Export failed", err);
      showNotification("error", "Failed to export transaction report.");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className={flowPanelClass}>
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-2.5 min-w-0">
          <Label className={formLabelClass}>From</Label>
          <Input
            type="date"
            className={formInputClass}
            value={startDate}
            max={endDate || undefined}
            onChange={(e) => setStartDate(e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-2.5 min-w-0">
          <Label className={formLabelClass}>To</Label>
          <Input
            type="date"
            className={formInputClass}
            value={endDate}
            min={startDate || undefined}
            onChange={(e) => setEndDate(e.target.value)}
          />
        </div>
      </div>

      <Button
        className={primaryBtnClass}
        disabled={isExporting}
        onClick={handleExportCSV}
      >
        {isExporting ? "Exporting..." : "Download CSV Report"}
      </Button>

      <div className="pt-4 border-t border-white/[0.06]">
        <History
          selectedTransaction={selectedTransaction}
          openDetailsPopup={setSelectedTransaction}
          closeDetailsPopup={() => setSelectedTransaction(null)}
          compact
        />
      </div>
    </div>
  );
}

export default Reports;
