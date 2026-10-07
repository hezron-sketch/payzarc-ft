import React, { useEffect, useMemo, useState } from "react";
import { Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { transactionsApi } from "../../utility/axiosInstance";
import TransactionDetails from "./TransactionDetails";
import {
  formLabelClass,
  formInputClass,
  primaryBtnClass,
  flowPanelClass,
} from "./shared";

const PAGE_SIZE = 25;

// The reports API and the older history API name the same fields
// differently — take the first one that's actually filled in.
const first = (...values) =>
  values.find((v) => v !== undefined && v !== null && String(v).trim() !== "");
const num = (...values) => Number(first(...values, 0)) || 0;

const txType = (tx) =>
  String(first(tx.transaction_type, tx.type, "TRANSACTION")).toUpperCase();
const txDate = (tx) => first(tx.created_at, tx.date, tx.timestamp);
const txCode = (tx) => first(tx.transaction_code, tx.code, "N/A");
const txReference = (tx) =>
  first(tx.reference, tx.transaction_reference, tx.merchant_receipt, "");
const txCurrency = (tx) => first(tx.currency, tx.currency_code, "");
const txAmount = (tx) => num(tx.amount);
const txFee = (tx) => num(tx.fee, tx.transaction_fee, tx.charges);
const txNet = (tx) => num(tx.net_amount);
const txConverted = (tx) => num(tx.converted_amount);
const txConvertedCurrency = (tx) => first(tx.converted_currency, "");
const txBalanceAfter = (tx) => num(tx.balance_after, tx.remaining_balance);
const txStatus = (tx) =>
  String(first(tx.status, tx.transaction_status, "SUCCESS"));
const txDescription = (tx) => first(tx.description, tx.narration, "");
const txSender = (tx) => first(tx.sender_name, tx.sender, tx.from_account, "");
const txRecipient = (tx) =>
  first(tx.recipient_name, tx.recipient, tx.receiver_name, tx.to_account, "");
const txCounterparty = (tx) =>
  first(
    tx.counterparty_name,
    tx.name,
    tx.recipient_name,
    tx.sender_name,
    tx.merchant_name,
    tx.agent_name,
    "",
  );
const txContact = (tx) =>
  first(
    tx.counterparty_phone,
    tx.recipient_phone,
    tx.sender_phone,
    tx.phone,
    "",
  );
const txEmail = (tx) =>
  first(
    tx.counterparty_email,
    tx.recipient_email,
    tx.sender_email,
    tx.email,
    "",
  );

const isCredit = (tx) =>
  /DEPOSIT|CREDIT|RECEIVE/.test(txType(tx)) ||
  /RECEIVED/i.test(txDescription(tx));

const statusTone = (status) => {
  const s = status.toLowerCase();
  if (/fail|declin|reject|cancel/.test(s)) return "failed";
  if (/pend|process/.test(s)) return "pending";
  return "completed";
};

const statusPillClass = (status) => {
  const tone = statusTone(status);
  return cn(
    "text-[0.7rem] font-semibold rounded-full px-2 py-0.5 whitespace-nowrap",
    tone === "completed" && "bg-gold text-black",
    tone === "pending" && "bg-white/20 text-foreground",
    tone === "failed" && "bg-destructive text-white",
  );
};

const money = (value) =>
  Number(value || 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

// CSV-escape one cell: quote it if it has a comma, quote or newline.
const csvCell = (v) => {
  const str = v === undefined || v === null ? "" : String(v);
  return /[",\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
};

const downloadBlob = (blob, filename) => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

const CSV_COLUMNS = [
  ["ID", (tx) => tx.id],
  ["Transaction Code", txCode],
  ["Reference", txReference],
  ["Date & Time", (tx) => txDate(tx)],
  ["Transaction Type", txType],
  ["Sender", txSender],
  ["Recipient", txRecipient],
  ["Counterparty", txCounterparty],
  ["Contact", txContact],
  ["Email", txEmail],
  ["Amount", (tx) => txAmount(tx).toFixed(2)],
  ["Currency", txCurrency],
  [
    "Converted Amount",
    (tx) => (txConverted(tx) ? txConverted(tx).toFixed(2) : ""),
  ],
  ["Converted Currency", txConvertedCurrency],
  ["Fee", (tx) => txFee(tx).toFixed(2)],
  ["Net Amount", (tx) => txNet(tx).toFixed(2)],
  ["Balance After", (tx) => txBalanceAfter(tx).toFixed(2)],
  ["Status", txStatus],
  ["Description", txDescription],
];

const selectClass =
  "h-11 min-w-0 flex-1 rounded-xl border border-white/[0.06] bg-white/[0.03] text-foreground text-[0.85rem] px-3 focus-visible:outline-none focus-visible:border-gold/30";
const statTileClass =
  "rounded-xl border border-white/[0.06] bg-white/[0.03] px-3 py-2.5 min-w-0";
const pageBtnClass =
  "h-auto rounded-sm px-4 py-1.5 text-[0.85rem] font-semibold bg-white/[0.06] border border-border text-foreground hover:bg-white/[0.12]";

function StatTile({ label, value, sub, className }) {
  return (
    <div className={statTileClass}>
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground m-0">
        {label}
      </p>
      <p className={cn("text-base font-bold m-0 truncate", className)}>
        {value}
      </p>
      {sub && (
        <p className="text-[0.7rem] text-muted-foreground m-0 truncate">
          {sub}
        </p>
      )}
    </div>
  );
}

// Transaction report for a date range, from Django's /api/reports/
// endpoints: summary totals, search/type/status filters, a paged list
// (tap a row for details), full-column CSV, and server PDF/email statements.
function Reports({ showNotification }) {
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [transactions, setTransactions] = useState([]);
  const [account, setAccount] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [statementBusy, setStatementBusy] = useState(""); // "" | "pdf" | "email"

  const rangeLabel = `${startDate || "all"}_to_${endDate || "all"}`;
  // Django's /api/reports/* endpoints take start/end (not date_from/date_to).
  const rangeParams = useMemo(
    () => ({
      ...(startDate && { start: startDate }),
      ...(endDate && { end: endDate }),
    }),
    [startDate, endDate],
  );

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");
    transactionsApi
      .get("/api/reports/transactions/", { params: rangeParams })
      .then(({ data }) => {
        if (cancelled) return;
        const list = Array.isArray(data)
          ? data
          : data?.transactions || data?.results || data?.data || [];
        setTransactions(Array.isArray(list) ? list : []);
        setAccount(
          Array.isArray(data)
            ? null
            : {
                role: data?.role,
                user: data?.user || {},
                profile: data?.profile || {},
              },
        );
        setPage(1);
      })
      .catch((err) => {
        if (cancelled) return;
        setTransactions([]);
        setError(
          err.response?.data?.message ||
            err.response?.data?.detail ||
            "Failed to load transaction report.",
        );
      })
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [rangeParams]);

  // Options come from the data itself — the backend has no fixed enum.
  const typeOptions = useMemo(
    () => [...new Set(transactions.map(txType))].sort(),
    [transactions],
  );
  const statusOptions = useMemo(
    () => [...new Set(transactions.map(txStatus))].sort(),
    [transactions],
  );

  // Date range is re-applied client-side too, in case the backend (or the
  // local mock server) ignores start/end.
  const filtered = useMemo(() => {
    const from = startDate ? new Date(startDate) : null;
    const to = endDate ? new Date(`${endDate}T23:59:59.999`) : null;
    const term = searchTerm.trim().toLowerCase();
    return transactions.filter((tx) => {
      const d = new Date(txDate(tx));
      if (from && d < from) return false;
      if (to && d > to) return false;
      if (typeFilter && txType(tx) !== typeFilter) return false;
      if (statusFilter && txStatus(tx) !== statusFilter) return false;
      if (!term) return true;
      return [
        tx.id,
        txCode(tx),
        txReference(tx),
        txType(tx),
        txSender(tx),
        txRecipient(tx),
        txCounterparty(tx),
        txContact(tx),
        txEmail(tx),
        txDescription(tx),
        txStatus(tx),
      ]
        .join(" ")
        .toLowerCase()
        .includes(term);
    });
  }, [transactions, startDate, endDate, searchTerm, typeFilter, statusFilter]);

  const summary = useMemo(() => {
    const s = {
      completed: 0,
      pending: 0,
      failed: 0,
      credits: 0,
      debits: 0,
      fees: 0,
    };
    for (const tx of filtered) {
      s[statusTone(txStatus(tx))]++;
      s[isCredit(tx) ? "credits" : "debits"] += txAmount(tx);
      s.fees += txFee(tx);
    }
    return s;
  }, [filtered]);
  // Single-currency summary label; mixed-currency reports show no symbol.
  const currencies = new Set(filtered.map(txCurrency).filter(Boolean));
  const summaryCurrency = currencies.size === 1 ? [...currencies][0] : "";

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paged = filtered.slice(
    (safePage - 1) * PAGE_SIZE,
    safePage * PAGE_SIZE,
  );

  const handleExportCSV = () => {
    if (filtered.length === 0) {
      showNotification(
        "error",
        "No transactions found for the selected filters.",
      );
      return;
    }
    const csv = [
      CSV_COLUMNS.map(([header]) => header).join(","),
      ...filtered.map((tx) =>
        CSV_COLUMNS.map(([, get]) => csvCell(get(tx))).join(","),
      ),
    ].join("\n");
    downloadBlob(
      new Blob([csv], { type: "text/csv;charset=utf-8;" }),
      `transaction_report_${rangeLabel}.csv`,
    );
    showNotification("success", "Transaction report downloaded successfully!");
  };

  // Server-rendered PDF statement for the selected range.
  const handleDownloadPDF = async () => {
    setStatementBusy("pdf");
    try {
      const res = await transactionsApi.get("/api/reports/statement/pdf/", {
        params: rangeParams,
        responseType: "blob",
      });
      if (!(res.headers?.["content-type"] || "").includes("application/pdf")) {
        throw new Error(
          (await res.data.text?.()) || "The server did not return a PDF.",
        );
      }
      downloadBlob(res.data, `statement_${rangeLabel}.pdf`);
      showNotification("success", "Statement downloaded.");
    } catch (err) {
      showNotification("error", err.message || "Failed to download statement.");
    } finally {
      setStatementBusy("");
    }
  };

  // Server emails a password-protected PDF; the password goes out in a
  // separate email and is never shown here, even if the response has it.
  const handleEmailStatement = async () => {
    setStatementBusy("email");
    try {
      await transactionsApi.post("/api/reports/statement/email/", null, {
        params: rangeParams,
      });
      showNotification(
        "success",
        "Statement emailed. The PDF password was sent in a separate email.",
      );
    } catch (err) {
      showNotification(
        "error",
        err.response?.data?.message ||
          err.response?.data?.error ||
          err.response?.data?.detail ||
          "Unable to email the statement.",
      );
    } finally {
      setStatementBusy("");
    }
  };

  const accountName = account?.user?.name || account?.user?.username;

  return (
    <div className={flowPanelClass}>
      {accountName && (
        <div className="flex items-center justify-between gap-3 text-[0.8rem]">
          <span className="font-semibold truncate">{accountName}</span>
          <span className="text-muted-foreground truncate">
            {[account.role, account.profile?.country, account.profile?.currency]
              .filter(Boolean)
              .join(" · ")}
          </span>
        </div>
      )}

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

      <div className="grid grid-cols-2 gap-2">
        <StatTile
          label="Transactions"
          value={filtered.length.toLocaleString()}
          sub={`${summary.pending} pending`}
        />
        <StatTile
          label="Successful / Failed"
          value={`${summary.completed} / ${summary.failed}`}
          sub={`Fees ${summaryCurrency} ${money(summary.fees)}`}
        />
        <StatTile
          label="Money in"
          value={`${summaryCurrency} ${money(summary.credits)}`}
          className="text-success"
        />
        <StatTile
          label="Money out"
          value={`${summaryCurrency} ${money(summary.debits)}`}
          className="text-destructive"
        />
      </div>

      <div className="relative">
        <Search
          size={16}
          className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
        />
        <Input
          className={cn(formInputClass, "pl-10")}
          placeholder="Search code, reference, name..."
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            setPage(1);
          }}
        />
      </div>
      <div className="flex gap-2 -mt-1">
        <select
          aria-label="Transaction type"
          className={selectClass}
          value={typeFilter}
          onChange={(e) => {
            setTypeFilter(e.target.value);
            setPage(1);
          }}
        >
          <option value="">All types</option>
          {typeOptions.map((t) => (
            <option key={t} value={t}>
              {t.replaceAll("_", " ")}
            </option>
          ))}
        </select>
        <select
          aria-label="Status"
          className={selectClass}
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setPage(1);
          }}
        >
          <option value="">All statuses</option>
          {statusOptions.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>

      <Button
        className={primaryBtnClass}
        disabled={loading || filtered.length === 0}
        onClick={handleExportCSV}
      >
        Download CSV Report
      </Button>
      <div className="grid grid-cols-2 gap-3 -mt-1">
        <Button
          variant="outline"
          className="h-auto rounded-xl py-3"
          disabled={!!statementBusy}
          onClick={handleDownloadPDF}
        >
          {statementBusy === "pdf" ? "Preparing..." : "PDF Statement"}
        </Button>
        <Button
          variant="outline"
          className="h-auto rounded-xl py-3"
          disabled={!!statementBusy}
          onClick={handleEmailStatement}
        >
          {statementBusy === "email" ? "Sending..." : "Email Statement"}
        </Button>
      </div>

      <div className="pt-4 border-t border-white/[0.06] flex flex-col gap-1">
        {loading && (
          <p className="text-muted-foreground text-sm text-center py-6">
            Loading report...
          </p>
        )}
        {!loading && error && (
          <p className="text-destructive bg-destructive/10 border border-destructive/25 rounded-xl text-sm text-center px-4 py-3">
            {error}
          </p>
        )}
        {!loading && !error && filtered.length === 0 && (
          <p className="text-muted-foreground text-sm text-center py-6">
            No transactions found.
          </p>
        )}
        {!loading &&
          paged.map((tx, idx) => {
            const credit = isCredit(tx);
            return (
              <button
                key={tx.id ?? `${txCode(tx)}-${idx}`}
                type="button"
                onClick={() => setSelectedTransaction(tx)}
                className="flex items-center gap-3 w-full text-left rounded-xl px-2.5 py-2.5 hover:bg-white/[0.04] transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate m-0">
                    {txCounterparty(tx) || txType(tx).replaceAll("_", " ")}
                  </p>
                  <p className="text-[0.72rem] text-muted-foreground truncate m-0">
                    {new Date(txDate(tx)).toLocaleDateString()} · {txCode(tx)}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-1 shrink-0">
                  <span
                    className={cn(
                      "text-sm font-bold whitespace-nowrap",
                      credit ? "text-success" : "text-destructive",
                    )}
                  >
                    {credit ? "+" : "-"}
                    {txCurrency(tx)} {money(txAmount(tx))}
                  </span>
                  <span className={statusPillClass(txStatus(tx))}>
                    {txStatus(tx)}
                  </span>
                </div>
              </button>
            );
          })}
      </div>

      {filtered.length > PAGE_SIZE && (
        <div className="flex items-center justify-center gap-4">
          <Button
            variant="ghost"
            className={pageBtnClass}
            onClick={() => setPage(Math.max(1, safePage - 1))}
            disabled={safePage === 1}
          >
            Prev
          </Button>
          <span className="text-[0.85rem] text-muted-foreground">
            Page {safePage} of {totalPages}
          </span>
          <Button
            variant="ghost"
            className={pageBtnClass}
            onClick={() => setPage(Math.min(totalPages, safePage + 1))}
            disabled={safePage === totalPages}
          >
            Next
          </Button>
        </div>
      )}

      {selectedTransaction && (
        <TransactionDetails
          transaction={selectedTransaction}
          closeDetailsPopup={() => setSelectedTransaction(null)}
        />
      )}
    </div>
  );
}

export default Reports;
