import { cn } from "@/lib/utils";
import { EXCHANGE_RATES } from "../../utility/exchangeRates";

export const formLabelClass =
  "flex items-center justify-between text-[0.8rem] font-medium text-muted-foreground -mb-[0.4rem]";
export const formInputClass =
  "w-full h-auto bg-white/[0.03] border-white/[0.06] rounded-xl px-4 py-3.5 text-foreground text-base md:text-base placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-gold/40 focus-visible:border-gold/60 focus-visible:bg-white/[0.07] shadow-none transition-colors duration-200";
export const primaryBtnClass =
  "w-full h-auto rounded-full px-5 py-2.5 text-base font-bold text-black transition-[background-color,transform] duration-200 hover:bg-primary active:scale-[0.97] disabled:opacity-60 disabled:active:scale-100 mt-1";
export const modal3dClass =
  "material-thick border border-white/[0.08] animate-popup-in";
// Wrapper every flow panel renders inside the phone screen.
export const flowPanelClass =
  "flex flex-col gap-3 w-full max-w-[420px] mx-auto max-[640px]:max-w-full";
// Labelled field in one box: a short prefix (To, KES) replaces the label row
// above it, which is what lets each flow fit the phone screen unscrolled.
export const fieldClass =
  "flex items-center gap-3 h-12 shrink-0 rounded-xl px-4 bg-white/[0.03] border border-white/[0.06] transition-[background-color,border-color,box-shadow] duration-200 ease-out focus-within:bg-white/[0.06] focus-within:border-gold/45 focus-within:shadow-[0_0_0_3px_rgba(var(--gold-rgb),0.12)]";
export const fieldAffixClass =
  "shrink-0 text-[0.8rem] font-semibold text-[var(--soft)] tabular-nums";
// The box shows focus for the whole field; the input's own outline (from the
// global :focus-visible rule) would draw a second, square box inside it.
export const fieldInputClass =
  "flex-1 min-w-0 h-full bg-transparent border-0 outline-none focus-visible:outline-none text-base text-foreground placeholder:text-muted-foreground caret-gold";
// The amount is the point of every flow, so it gets the big type.
export const amountFieldClass = cn(fieldClass, "h-14");
export const amountInputClass = cn(
  fieldInputClass,
  "text-[1.5rem] font-semibold tabular-nums tracking-[-0.02em]",
);
// The app's one list style (taken from Transactions): borderless rows split
// by hairlines, a 36px leading tile, title/meta left, value/status right.
export const listClass = "flex flex-col divide-y divide-white/[0.06]";
export const listRowClass =
  "w-full flex items-center gap-3 px-2.5 py-3 text-left transition-colors duration-200 hover:bg-white/[0.04]";
export const listTileClass =
  "w-9 h-9 rounded-xl flex items-center justify-center shrink-0";
export const listAvatarClass =
  "w-9 h-9 rounded-full bg-gradient-to-br from-gold/35 to-gold/15 text-gold font-bold flex items-center justify-center border border-[rgba(var(--gold-rgb),0.3)] text-xs shrink-0";
export const listTitleClass = "text-sm font-semibold text-foreground truncate m-0";
export const listMetaClass = "text-[0.72rem] text-muted-foreground truncate m-0";

export const pickerDialogClass = cn(
  "w-[min(400px,100%)] max-w-[400px] rounded-[22px] p-7 flex flex-col gap-4 max-h-[90dvh] overflow-y-auto",
  "max-[640px]:left-0 max-[640px]:right-0 max-[640px]:top-auto max-[640px]:bottom-0 max-[640px]:translate-x-0 max-[640px]:translate-y-0 max-[640px]:w-full max-[640px]:max-w-full max-[640px]:rounded-b-none max-[640px]:px-6 max-[640px]:pb-[calc(1.75rem+env(safe-area-inset-bottom))] max-[640px]:data-[state=open]:slide-in-from-bottom-8",
  modal3dClass,
);
export const modalAddLinkClass =
  "self-start inline-flex items-center gap-1 bg-white/[0.04] border border-white/[0.08] rounded-full px-3.5 py-1.5 text-gold text-[0.78rem] font-semibold cursor-pointer transition-colors hover:bg-white/[0.07] hover:border-gold/30";
export const methodBtnClass = (active) =>
  cn(
    "flex-1 bg-white/[0.02] border border-white/[0.05] text-muted-foreground px-2 py-2 rounded-sm text-[0.8rem] font-semibold transition-ui duration-200 hover:bg-white/[0.05] hover:border-gold/20 hover:text-foreground",
    active &&
      "bg-gold/10 border-gold/30 text-gold hover:border-gold/40 hover:bg-gold/10 hover:text-gold",
  );
export const favouriteChipClass = (active) =>
  cn(
    "bg-white/[0.03] border border-white/[0.08] text-foreground px-3.5 py-2 rounded-full text-[0.85rem] font-medium transition-colors hover:border-gold/40 hover:text-gold",
    active && "bg-gold/10 border-gold/40 text-gold",
  );

export const getRate = (liveRates, from, to) =>
  to === from ? 1 : (liveRates?.[to] ?? EXCHANGE_RATES[from]?.[to] ?? null);

export const assertDelivered = (data, fallback) => {
  const status = (data?.status || "").toLowerCase();
  if (status === "failed" || status === "declined" || data?.success === false) {
    const error = new Error(data?.reason || data?.message || fallback);
    // The server answered and said no: the money definitely didn't move.
    error.declined = true;
    throw error;
  }
  if (PENDING_STATUSES.includes(status)) {
    const error = new Error(data?.message || "Still processing.");
    error.pending = true;
    // What TransferStatus polls history for until it settles.
    error.reference = data?.transaction_code ?? data?.reference ?? data?.id;
    throw error;
  }
  return data;
};
const PENDING_STATUSES = ["pending", "processing", "queued"];

export const failureKind = (error) =>
  error?.pending
    ? "pending"
    : error?.declined ||
        (error?.response?.status >= 400 && error?.response?.status < 500)
      ? "declined"
      : "unconfirmed";

export const newIdempotencyKey = () =>
  window.crypto?.randomUUID?.() ??
  `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;

export const toDecimalInput = (value) => {
  const [whole, ...rest] = value.replace(/[^\d.]/g, "").split(".");
  return rest.length ? `${whole}.${rest.join("").slice(0, 2)}` : whole;
};
