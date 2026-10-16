import React, { useState } from "react";
import TransactionDetails from "./TransactionDetails";
import { ArrowDownLeft, ArrowUpRight, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

// Per-row status chip — colored by keyword match on the real tx.status
// string (no fixed enum from the API), default reads as "completed" since
// that's the overwhelmingly common status. Split into a pill class + dot
// class so the call site can render dot + label like the sketch's chips.
const txStatusTone = (status) => {
  const s = (status || "").toLowerCase();
  if (s.includes("fail") || s.includes("declin")) return "destructive";
  if (s.includes("pend")) return "pending";
  return "success";
};
const txStatusBadgeClass = (status) => {
  const tone = txStatusTone(status);
  return cn(
    "inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium capitalize shrink-0",
    tone === "destructive" && "bg-destructive/15 text-destructive",
    tone === "pending" && "bg-white/10 text-muted-foreground",
    tone === "success" && "bg-success/15 text-success",
  );
};
const txStatusDotClass = (status) => {
  const tone = txStatusTone(status);
  return cn(
    "w-1 h-1 rounded-full mr-1.5",
    tone === "destructive" && "bg-destructive",
    tone === "pending" && "bg-muted-foreground",
    tone === "success" && "bg-success",
  );
};

// Amount with an explicit +/- (credit/debit) and the currency — the API's
// tx.amount may or may not already carry a sign, so strip it first.
const getFormattedAmount = (amt, isCredit, currency) => {
  const value = Number(String(amt ?? 0).trim().replace(/^[+-]/, "")) || 0;
  return `${isCredit ? "+" : "−"}${currency} ${value.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

// Beside the phone on wider screens; inside the phone's screen (below
// Quick Send) on small ones, where `embedded` drops its own card surface so
// it sits on the phone's like Quick Send does. "View all" opens the combined
// Transactions screen (Reports.js) inside the phone; a row opens that
// transaction's own details (the same dialog Reports uses).
function RecentActivity({ transactions, currency, onViewAll, embedded = false }) {
  const [selected, setSelected] = useState(null);
  return (
    <div className="flex flex-col items-center">
      <div className="w-full">
        <div
          className={cn(
            "flex items-center justify-between",
            embedded ? "mb-3" : "mb-4",
          )}
        >
          <h2
            className={cn(
              "font-bold text-foreground m-0",
              embedded ? "text-base" : "text-[1.05rem] tracking-tight",
            )}
          >
            Recent Activity
          </h2>
          <button
            type="button"
            className="-mr-2 h-9 px-2 rounded-full text-gold text-[0.8rem] font-medium flex items-center gap-1 transition-colors hover:bg-white/[0.05]"
            onClick={onViewAll}
          >
            View all <ChevronRight size={14} aria-hidden="true" />
          </button>
        </div>

        <div
          className={cn(
            "overflow-hidden stagger",
            embedded
              ? "rounded-[14px] bg-white/[0.03] border border-white/[0.06]"
              : "bg-card rounded-2xl",
          )}
        >
          {transactions.length === 0 ? (
            <p className="text-center text-[0.9rem] text-muted-foreground py-8">
              No recent activity yet.
            </p>
          ) : (
            transactions.map((tx, idx) => {
              const credit =
                tx.transaction_type === "CREDIT" || tx.type === "receive";
              return (
                <button
                  type="button"
                  key={tx.id || idx}
                  onClick={() => setSelected(tx)}
                  className="w-full text-left flex items-center gap-4 p-4 md:p-5 max-[768px]:p-3.5 max-[768px]:gap-3 border-b border-white/[0.03] last:border-b-0 transition-colors duration-200 hover:bg-white/[0.04]"
                >
                  <div
                    className={cn(
                      "w-11 h-11 rounded-xl flex items-center justify-center shrink-0",
                      credit
                        ? "bg-success/[0.08] text-success"
                        : "bg-white/[0.05] text-[var(--soft)]",
                    )}
                  >
                    {credit ? (
                      <ArrowDownLeft size={18} aria-hidden="true" />
                    ) : (
                      <ArrowUpRight size={18} aria-hidden="true" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="min-w-0 flex-1 text-[0.9rem] font-semibold text-foreground truncate m-0">
                        {tx.name || tx.description || tx.transaction_type}
                      </p>
                      {tx.status && (
                        <span className={txStatusBadgeClass(tx.status)}>
                          <span className={txStatusDotClass(tx.status)} />
                          {tx.status}
                        </span>
                      )}
                    </div>
                    <p className="text-[0.8rem] text-muted-foreground mt-0.5 m-0">
                      {tx.date || new Date(tx.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <p
                    className={cn(
                      "text-[0.9rem] font-semibold tabular-nums shrink-0 m-0",
                      credit ? "text-success" : "text-foreground",
                    )}
                  >
                    {getFormattedAmount(tx.amount, credit, tx.currency || currency)}
                  </p>
                </button>
              );
            })
          )}
        </div>
      </div>
      {selected && (
        <TransactionDetails
          transaction={selected}
          closeDetailsPopup={() => setSelected(null)}
        />
      )}
    </div>
  );
}

export default RecentActivity;
