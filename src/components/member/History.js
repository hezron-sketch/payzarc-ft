import React, { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import TransactionDetails from "./TransactionDetails";
import { transactionsApi } from "../../utility/axiosInstance";

const PAGE_SIZE = 25;

const cellClass = "px-4 py-3.5 text-left align-middle text-sm text-foreground break-words";
const hideOnSmallClass = "hidden md:table-cell";
const pageBtnClass =
  "h-auto rounded-md px-4 py-2 text-[0.85rem] font-semibold bg-white/[0.06] border border-border text-foreground hover:bg-white/[0.12]";

function History({ selectedTransaction, openDetailsPopup, closeDetailsPopup }) {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);

  const [searchTerm, setSearchTerm] = useState("");

  const fetchTransactions = async () => {
    setLoading(true);
    setError(null);

    try {
      const params = {};
      if (searchTerm.trim()) params.search = searchTerm.trim();

      const response = await transactionsApi.get(
        "/api/transactions/history/",
        { params },
      );

      const data = response.data;
      const txArray = Array.isArray(data)
        ? data
        : data.results || data.transactions || [];
      setTransactions(txArray);
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

  const totalPages = Math.max(1, Math.ceil(transactions.length / PAGE_SIZE));
  const pagedTransactions = transactions.slice(
    (page - 1) * PAGE_SIZE,
    page * PAGE_SIZE,
  );

  return (
    <div className="w-full max-w-[1200px] mx-auto p-8 flex flex-col gap-6 bg-card border border-border rounded-lg box-border max-[640px]:p-5">
      {/* Filter Section */}
      <div className="flex flex-wrap gap-3 w-full items-stretch max-[640px]:flex-col">
        <div className="flex flex-col flex-1 text-foreground">
          <Input
            type="text"
            placeholder="Search transactions..."
            className="w-full h-11 rounded-xl border-input bg-secondary text-foreground text-[0.95rem] focus-visible:ring-0 focus-visible:border-gold focus-visible:bg-card"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <Button
          className="h-11 rounded-xl px-7 text-[0.9rem] font-bold max-[640px]:w-full"
          onClick={handleSearch}
          disabled={loading}
        >
          {loading ? "..." : "Search"}
        </Button>
      </div>

      {/* Table Section */}
      <div className="overflow-x-auto rounded-lg border border-border">
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
          <table className="w-full max-w-full border-collapse bg-secondary">
            <thead>
              <tr>
                <th className={cn(cellClass, "border-b border-border text-muted-foreground font-bold text-xs uppercase tracking-[0.04em]")}>
                  Date
                </th>
                <th className={cn(cellClass, hideOnSmallClass, "border-b border-border text-muted-foreground font-bold text-xs uppercase tracking-[0.04em]")}>
                  Recipient
                </th>
                <th className={cn(cellClass, hideOnSmallClass, "border-b border-border text-muted-foreground font-bold text-xs uppercase tracking-[0.04em]")}>
                  Currency
                </th>
                <th className={cn(cellClass, "border-b border-border text-muted-foreground font-bold text-xs uppercase tracking-[0.04em]")}>
                  Amount
                </th>
                <th className={cn(cellClass, "border-b border-border text-muted-foreground font-bold text-xs uppercase tracking-[0.04em]")}>
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
                    <td className={cellClass}>
                      {new Date(
                        tx.created_at || tx.date || tx.timestamp,
                      ).toLocaleDateString()}
                    </td>
                    <td className={cn(cellClass, hideOnSmallClass)}>{recipient}</td>
                    <td className={cn(cellClass, hideOnSmallClass)}>
                      {tx.currency || "USD"}
                    </td>
                    <td
                      className={cn(
                        cellClass,
                        "font-bold",
                        tx.transaction_type === "CREDIT"
                          ? "text-success"
                          : "text-destructive",
                      )}
                    >
                      {formatAmount(tx)}
                    </td>
                    <td className={cellClass}>
                      <button
                        className="bg-gold/10 border border-gold/25 text-gold text-xs font-semibold rounded-full px-3 py-[5px] whitespace-nowrap transition-colors hover:bg-gold hover:text-black"
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
