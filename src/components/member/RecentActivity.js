import React from "react";
import { TrendingUp, TrendingDown, ArrowRight } from "lucide-react";
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
    "hidden sm:inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold uppercase tracking-wide shrink-0",
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

// Amount with an explicit +/- (credit/debit) — the API's tx.amount may or
// may not already carry a sign, so strip it first.
const getFormattedAmount = (amt, isCredit) => {
  if (amt === undefined || amt === null) return "0.00";
  return `${isCredit ? "+" : "-"}${String(amt).trim().replace(/^[+-]/, "")}`;
};

// Always visible beside the phone. "View all" opens the combined
// Transactions screen (Reports.js) inside the phone.
function RecentActivity({ transactions, onViewAll }) {
  return (
    <div className="flex flex-col items-center">
      <div className="w-full">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-[1.05rem] font-bold text-foreground tracking-tight m-0">
            Recent Activity
          </h2>
          <button
            className="bg-transparent border-none text-gold text-xs font-medium cursor-pointer flex items-center gap-1 transition-colors hover:text-gold-dark"
            onClick={onViewAll}
          >
            View all <ArrowRight size={14} />
          </button>
        </div>

        <div className="bg-card rounded-2xl overflow-hidden">
          {transactions.length === 0 ? (
            <p className="text-center text-[0.9rem] text-muted-foreground py-8">
              No recent activity yet.
            </p>
          ) : (
            transactions.map((tx, idx) => {
              const credit =
                tx.transaction_type === "CREDIT" || tx.type === "receive";
              return (
                <div
                  key={tx.id || idx}
                  className="flex items-center gap-4 p-4 md:p-5 border-b border-white/[0.03] last:border-b-0 transition-all duration-200 hover:bg-white/[0.025] cursor-default"
                >
                  <div
                    className={cn(
                      "w-11 h-11 rounded-xl flex items-center justify-center shrink-0",
                      credit
                        ? "bg-success/[0.08] text-success"
                        : "bg-destructive/[0.08] text-destructive",
                    )}
                  >
                    {credit ? (
                      <TrendingUp size={18} />
                    ) : (
                      <TrendingDown size={18} />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      {/* Fixed width (not just truncate) so the status
                          badge after it lands in the same column on every
                          row, instead of trailing wherever each name ends. */}
                      <p className="w-[104px] shrink-0 text-[0.85rem] font-semibold text-foreground truncate m-0">
                        {tx.name || tx.description || tx.transaction_type}
                      </p>
                      {tx.status && (
                        <span className={txStatusBadgeClass(tx.status)}>
                          <span className={txStatusDotClass(tx.status)} />
                          {tx.status}
                        </span>
                      )}
                    </div>
                    <p className="text-[0.72rem] text-muted-foreground mt-0.5 m-0">
                      {tx.date || new Date(tx.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <p
                    className={cn(
                      "text-[0.9rem] font-bold font-mono shrink-0 m-0",
                      credit ? "text-success" : "text-destructive",
                    )}
                  >
                    {getFormattedAmount(tx.amount, credit)}
                  </p>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

export default RecentActivity;
