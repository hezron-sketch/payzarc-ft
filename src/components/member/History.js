import React, { useState, useEffect } from "react";
import { Search, Download } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import TransactionDetails from "./TransactionDetails";
import { transactionsApi } from "../../utility/axiosInstance";
import { generateStatementPDF } from "../../utility/generateStatement";

const PAGE_SIZE = 25;

const TYPE_OPTIONS = [
  { value: "", label: "All types" },
  { value: "DEBIT", label: "Sent" },
  { value: "CREDIT", label: "Received" },
];

const cellClass = (compact) =>
  cn(
    "text-left align-middle text-foreground break-words",
    compact ? "px-2.5 py-2.5 text-xs" : "px-4 py-3.5 text-sm",
  );
const hideOnSmallClass = "hidden md:table-cell";
// Status pill color by keyword match on the status string (no fixed enum
// from the API) — completed reads as the default since it's the
// overwhelmingly common status (also covers the "Received"/"Paid" fallback
// used when the API doesn't send a status at all).
const statusPillClass = (status, compact) => {
  const s = (status || "").toLowerCase();
  const tone =
    s.includes("fail") || s.includes("declin")
      ? "failed"
      : s.includes("pend")
        ? "pending"
        : "completed";
  return cn(
    "font-semibold rounded-full whitespace-nowrap transition-colors",
    compact ? "text-[0.7rem] px-2 py-1" : "text-xs px-3 py-[5px]",
    tone === "completed" &&
      "bg-gold border border-gold text-black hover:bg-gold-dark",
    tone === "pending" &&
      "bg-white/20 border border-white/20 text-foreground hover:bg-white/30",
    tone === "failed" &&
      "bg-destructive border border-destructive text-white hover:bg-destructive/80",
  );
};
const pageBtnClass =
  "h-auto rounded-sm px-4 py-1.5 text-[0.85rem] font-semibold bg-white/[0.06] border border-border text-foreground hover:bg-white/[0.12]";

// `compact` is for callers that only have a narrow column to work with
// (Home.js's "View all" toggle inside Recent Activity, now a fixed ~420px
// grid column) — Tailwind's `md:` breakpoint reacts to the *viewport*, not
// this component's own width, so hideOnSmallClass alone doesn't help there:
// the browser window is plenty wide, just this column isn't. compact drops
// Recipient/Currency unconditionally instead and tightens spacing, rather
// than fighting the table for space at every width. Dashboard.js's own
// full-page History tab (1200px+ available) keeps the normal table as-is.
function History({
  selectedTransaction,
  openDetailsPopup,
  closeDetailsPopup,
  compact = false,
}) {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);

  const [searchTerm, setSearchTerm] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [transactionType, setTransactionType] = useState("");
  const [wallet, setWallet] = useState(null);

  useEffect(() => {
    transactionsApi
      .get("/api/balance/")
      .then((res) => setWallet(res.data))
      .catch(() => setWallet(null));
  }, []);

  // Applied client-side on top of whatever the API returns — the real
  // backend is asked to filter server-side (params below), but the local
  // mock server (server.js) ignores query params entirely and always
  // returns every transaction, so this is what actually makes date/type
  // filtering (and therefore the statement export) work when testing
  // against it.
  const applyFilters = (list) => {
    const from = dateFrom ? new Date(dateFrom) : null;
    const to = dateTo ? new Date(`${dateTo}T23:59:59.999`) : null;
    return list.filter((tx) => {
      if (transactionType && tx.transaction_type !== transactionType) {
        return false;
      }
      if (from || to) {
        const txDate = new Date(tx.created_at || tx.date || tx.timestamp);
        if (from && txDate < from) return false;
        if (to && txDate > to) return false;
      }
      return true;
    });
  };

  const fetchTransactions = async () => {
    setLoading(true);
    setError(null);

    try {
      const params = {};
      if (searchTerm.trim()) params.search = searchTerm.trim();
      if (dateFrom) params.date_from = dateFrom;
      if (dateTo) params.date_to = dateTo;
      if (transactionType) params.type = transactionType;

      const response = await transactionsApi.get("/api/transactions/history/", {
        params,
      });

      const data = response.data;
      const txArray = Array.isArray(data)
        ? data
        : data.results || data.transactions || [];
      setTransactions(applyFilters(txArray));
      setPage(1);
      setError(null);
    } catch (err) {
      console.error("❌ History Fetch Error:", err.response?.data || err);
      setError(
        err.response?.data?.detail ||
          err.message ||
          "Failed to load transactions",
      );
      setTransactions([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
    // Load once on mount only — searches/date-filter changes trigger a
    // fetch via handleSearch instead, not on every keystroke.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    fetchTransactions();
  };

  const formatAmount = (tx) => {
    const amount = Number(tx.amount || 0);
    const prefix = tx.transaction_type === "CREDIT" ? "+" : "-";
    return `${prefix}${amount.toFixed(2)}`;
  };

  // Statement export — branded PDF of whatever's currently loaded (respects
  // the active search/date/type filters), matching the receipt's Payzarc
  // palette. Passes the raw transactions through so the PDF can total up
  // its own summary (sent/received per currency) instead of working off
  // pre-formatted display strings.
  const exportStatement = () => {
    // Closing balance is the wallet's current balance (no historical ledger
    // to look up an exact past-dated balance from). Opening balance is
    // worked backwards from it using only same-currency transactions in the
    // filtered set — a cross-currency transaction (e.g. a GHS receipt into
    // a KES wallet) doesn't move the wallet's own balance by its face
    // value, and there's no exchange rate here to convert it correctly.
    let balanceSummary = null;
    if (wallet?.currency) {
      const netOwnCurrency = transactions
        .filter((tx) => (tx.currency || "USD") === wallet.currency)
        .reduce(
          (sum, tx) =>
            sum +
            (tx.transaction_type === "CREDIT" ? 1 : -1) * Number(tx.amount || 0),
          0,
        );
      balanceSummary = {
        currency: wallet.currency,
        closing: Number(wallet.balance || 0),
        opening: Number(wallet.balance || 0) - netOwnCurrency,
      };
    }

    generateStatementPDF(transactions, {
      periodFrom: dateFrom,
      periodTo: dateTo,
      typeLabel: TYPE_OPTIONS.find((t) => t.value === transactionType)?.label,
      balanceSummary,
    });
  };

  const totalPages = Math.max(1, Math.ceil(transactions.length / PAGE_SIZE));
  const pagedTransactions = transactions.slice(
    (page - 1) * PAGE_SIZE,
    page * PAGE_SIZE,
  );

  return (
    <div
      className={cn(
        "w-full mx-auto flex flex-col gap-6 bg-card border border-border rounded-lg box-border",
        compact ? "p-2.5 gap-3" : "max-w-[1200px] p-8 max-[640px]:p-5",
      )}
    >
      {/* Filter Section */}
      <div
        className={cn(
          "flex gap-3 w-full items-stretch",
          !compact && "flex-wrap max-[640px]:flex-col",
        )}
      >
        <div className="flex flex-col flex-1 text-foreground">
          <Input
            type="text"
            placeholder="Search transactions..."
            className="w-full h-11 rounded-xl border-input bg-secondary text-foreground text-[0.95rem] focus-visible:ring-0 focus-visible:border-gold focus-visible:bg-card"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        {!compact && (
          <>
            <div className="flex flex-col max-[640px]:flex-1">
              <Input
                type="date"
                aria-label="From date"
                className="w-full h-11 rounded-xl border-input bg-secondary text-foreground text-[0.85rem] focus-visible:ring-0 focus-visible:border-gold focus-visible:bg-card"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
              />
            </div>
            <div className="flex flex-col max-[640px]:flex-1">
              <Input
                type="date"
                aria-label="To date"
                className="w-full h-11 rounded-xl border-input bg-secondary text-foreground text-[0.85rem] focus-visible:ring-0 focus-visible:border-gold focus-visible:bg-card"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
              />
            </div>
            <div className="flex flex-col max-[640px]:flex-1">
              <select
                aria-label="Transaction type"
                className="w-full h-11 rounded-xl border border-input bg-secondary text-foreground text-[0.85rem] px-3 focus-visible:outline-none focus-visible:border-gold"
                value={transactionType}
                onChange={(e) => setTransactionType(e.target.value)}
              >
                {TYPE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </>
        )}
        <Button
          className={cn(
            "h-9 rounded-sm font-bold shrink-0",
            compact
              ? "w-11 px-0 text-base"
              : "px-7 text-[0.9rem] max-[640px]:w-full",
          )}
          onClick={handleSearch}
          disabled={loading}
          aria-label="Search"
        >
          {loading ? "..." : compact ? <Search size={16} /> : "Search"}
        </Button>
        {transactions.length > 0 && (
          <Button
            variant="ghost"
            className={cn(
              pageBtnClass,
              compact && "h-9 w-11 shrink-0 px-0",
            )}
            onClick={exportStatement}
            title="Download PDF statement"
          >
            <Download size={16} className={compact ? "" : "mr-1.5"} />
            {!compact && "Export"}
          </Button>
        )}
      </div>

      {/* Table Section — no border/rounding of its own in compact mode,
      since the card wrapper above already frames it; adding a second border
      just nested a smaller "bezel" inside the first one. */}
      <div
        className={cn(
          "overflow-x-auto",
          !compact && "rounded-lg border border-border",
        )}
      >
        {loading && (
          <p className="text-muted-foreground text-[0.95rem] text-center py-8">
            Loading transactions...
          </p>
        )}

        {error && (
          <p className="text-destructive bg-destructive/10 border border-destructive/25 rounded-xl text-[0.9rem] text-center px-4 py-3">
            {error}
          </p>
        )}

        {!loading && !error && transactions.length === 0 && (
          <p className="text-muted-foreground text-[0.95rem] text-center py-8">
            No transactions found.
          </p>
        )}

        {transactions.length > 0 && (
          /* border-separate + spacing-0 (not border-collapse) — a
          collapsed table's cell backgrounds don't reliably respect the
          wrapper's rounded-lg clip in every browser, which is what made
          the bottom corners here look uneven/cut off next to the phone's
          own bezel fix. */
          <table className="w-full max-w-full border-separate border-spacing-0 rounded-sm bg-secondary">
            <thead>
              <tr>
                <th
                  className={cn(
                    cellClass(compact),
                    "border-b border-border text-muted-foreground font-bold text-xs uppercase tracking-[0.04em]",
                  )}
                >
                  Date
                </th>
                <th
                  className={cn(
                    cellClass(compact),
                    !compact && hideOnSmallClass,
                    "border-b border-border text-muted-foreground font-bold text-xs uppercase tracking-[0.04em]",
                  )}
                >
                  Recipient
                </th>
                <th
                  className={cn(
                    cellClass(compact),
                    compact ? "hidden" : hideOnSmallClass,
                    "border-b border-border text-muted-foreground font-bold text-xs uppercase tracking-[0.04em]",
                  )}
                >
                  Currency
                </th>
                <th
                  className={cn(
                    cellClass(compact),
                    "border-b border-border text-muted-foreground font-bold text-xs uppercase tracking-[0.04em]",
                  )}
                >
                  Amount
                </th>
                <th
                  className={cn(
                    cellClass(compact),
                    "border-b border-border text-muted-foreground font-bold text-xs uppercase tracking-[0.04em]",
                  )}
                >
                  Status
                </th>
              </tr>
            </thead>
            <tbody>
              {pagedTransactions.map((tx, index) => {
                const status =
                  tx.status ||
                  (tx.transaction_type === "CREDIT" ? "Received" : "Paid");
                const recipient =
                  tx.name || tx.recipient_name || tx.sender_name || "N/A";

                return (
                  <tr
                    key={tx.id || tx.transaction_code || index}
                    className="border-b border-border last:border-b-0 hover:bg-white/[0.03]"
                  >
                    <td className={cn(cellClass(compact), "whitespace-nowrap")}>
                      {new Date(
                        tx.created_at || tx.date || tx.timestamp,
                      ).toLocaleDateString()}
                    </td>
                    <td
                      className={cn(
                        cellClass(compact),
                        !compact && hideOnSmallClass,
                      )}
                    >
                      {recipient}
                    </td>
                    <td
                      className={cn(
                        cellClass(compact),
                        compact ? "hidden" : hideOnSmallClass,
                      )}
                    >
                      {tx.currency || "USD"}
                    </td>
                    <td
                      className={cn(
                        cellClass(compact),
                        "font-bold whitespace-nowrap",
                        tx.transaction_type === "CREDIT"
                          ? "text-success"
                          : "text-destructive",
                      )}
                    >
                      {formatAmount(tx)}
                    </td>
                    <td className={cellClass(compact)}>
                      <button
                        className={statusPillClass(status, compact)}
                        onClick={() => openDetailsPopup(tx)}
                      >
                        {status}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {transactions.length > PAGE_SIZE && (
        <div className="flex items-center justify-center gap-4">
          <Button
            variant="ghost"
            className={pageBtnClass}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
          >
            Prev
          </Button>
          <span className="text-[0.85rem] text-muted-foreground">
            Page {page} of {totalPages}
          </span>
          <Button
            variant="ghost"
            className={pageBtnClass}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
          >
            Next
          </Button>
        </div>
      )}

      {/* Popup */}
      {selectedTransaction && (
        <TransactionDetails
          transaction={selectedTransaction}
          closeDetailsPopup={closeDetailsPopup}
        />
      )}
    </div>
  );
}

export default History;
