import React, { useState } from "react";
import TransactionDetails from "./TransactionDetails";
import { ArrowDownLeft, ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  phoneBezelColorClass,
  phoneModalShadowClass,
  phoneShellClass,
  phoneScreenClass,
} from "../PhoneMockup";
import { listClass, listRowClass, listTileClass, listTitleClass } from "./shared";

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

const getFormattedAmount = (amt, isCredit, currency) => {
  const value = Number(String(amt ?? 0).trim().replace(/^[+-]/, "")) || 0;
  return `${isCredit ? "+" : "−"}${currency} ${value.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

function RecentActivity({ transactions, currency, onViewAll }) {
  const [selected, setSelected] = useState(null);
  return (
    <div className={cn(phoneShellClass, phoneBezelColorClass, phoneModalShadowClass)}>
      <div className={cn(phoneScreenClass, "px-6 pt-8 pb-6")}>
        <div className="flex items-center justify-between h-6 mb-2">
          <h2 className="text-[0.95rem] font-bold text-foreground m-0">
            Recent Activity
          </h2>
          <button
            type="button"
            className="-mr-2 h-8 px-2 rounded-full text-gold font-medium text-[0.8rem] transition-colors hover:bg-white/[0.05]"
            onClick={onViewAll}
          >
            View all
          </button>
        </div>

        <div className={cn("overflow-hidden stagger", listClass)}>
          {transactions.length === 0 ? (
            <p className="text-center text-[0.9rem] text-muted-foreground py-8">
              Your first transfer will show up here, tracked from sent to
              delivered.
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
                  className={listRowClass}
                >
                  <div
                    className={cn(
                      listTileClass,
                      credit
                        ? "bg-success/[0.08] text-success"
                        : "bg-white/[0.05] text-[var(--soft)]",
                    )}
                  >
                    {credit ? (
                      <ArrowDownLeft size={16} aria-hidden="true" />
                    ) : (
                      <ArrowUpRight size={16} aria-hidden="true" />
                    )}
                  </div>
                  {/* Two rows, two edges: who + how much on top, when + state
                      below — amounts and statuses each line up in one column. */}
                  <div className="flex-1 min-w-0 flex flex-col gap-1">
                    <div className="flex items-baseline justify-between gap-3">
                      <p className={cn(listTitleClass, "min-w-0")}>
                        {tx.name || tx.description || tx.transaction_type}
                      </p>
                      <p
                        className={cn(
                          "text-sm font-bold tabular-nums whitespace-nowrap shrink-0 m-0",
                          credit ? "text-success" : "text-foreground",
                        )}
                      >
                        {getFormattedAmount(tx.amount, credit, tx.currency || currency)}
                      </p>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-[0.72rem] text-muted-foreground tabular-nums whitespace-nowrap">
                        {tx.date || new Date(tx.created_at).toLocaleDateString()}
                      </span>
                      {tx.status && (
                        <span className={txStatusBadgeClass(tx.status)}>
                          <span className={txStatusDotClass(tx.status)} />
                          {tx.status}
                        </span>
                      )}
                    </div>
                  </div>
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
