import { cn } from "@/lib/utils";
import { EXCHANGE_RATES } from "../../utility/exchangeRates";

// Shared class strings for the repeated form pieces across Add Money /
// Withdraw / Send / the service-picker dialogs — kept as plain Tailwind
// strings (not new components) since they're just markup, not behavior.
// Restyled to match the sketch's surface language used everywhere else on
// the dashboard now (translucent white/[0.0X] surfaces, rounded-xl/2xl,
// gold-500-style CTAs with active:scale feedback) instead of the older
// bg-secondary/rounded-md look these predate.
export const formLabelClass =
  "flex items-center justify-between text-[0.8rem] font-medium text-muted-foreground -mb-[0.4rem]";
export const formInputClass =
  "w-full h-auto bg-white/[0.03] border-white/[0.06] rounded-xl px-4 py-3.5 text-foreground text-base md:text-base placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-gold/40 focus-visible:border-gold/60 focus-visible:bg-white/[0.07] shadow-none transition-colors duration-200";
export const primaryBtnClass =
  "w-full h-auto rounded-full px-5 py-2.5 text-base font-bold text-black transition-[background-color,transform] duration-200 hover:bg-primary active:scale-[0.97] disabled:opacity-60 disabled:active:scale-100 mt-1";
// Modal surface — the translucent material-thick sheet (Global.css) the
// Dialog primitive already uses, with the shared popup-in materialize.
export const modal3dClass =
  "material-thick border border-white/[0.08] animate-popup-in";
// Wrapper every flow panel renders inside the phone screen.
export const flowPanelClass =
  "flex flex-col gap-[1.1rem] w-full max-w-[420px] mx-auto max-[640px]:max-w-full";
// Picker / review / result dialog shell. On phones it docks to the bottom
// as a sheet within thumb reach (safe-area aware); wider screens get the
// centered card.
export const pickerDialogClass = cn(
  "w-[min(400px,100%)] max-w-[400px] rounded-[22px] p-7 flex flex-col gap-4 max-h-[90dvh] overflow-y-auto",
  "max-[640px]:left-0 max-[640px]:right-0 max-[640px]:top-auto max-[640px]:bottom-0 max-[640px]:translate-x-0 max-[640px]:translate-y-0 max-[640px]:w-full max-[640px]:max-w-full max-[640px]:rounded-b-none max-[640px]:px-6 max-[640px]:pb-[calc(1.75rem+env(safe-area-inset-bottom))] max-[640px]:data-[state=open]:slide-in-from-bottom-8",
  modal3dClass,
);
// Add Money modal's own "+ Save/Add/Use a saved..." links — a real
// pill-shaped button with proper padding instead of a bare, zero-padding
// text link (which reads as squished right under the field above it).
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

// FX rate from -> to. Live rates (covering every currency the API tracks)
// take priority over the small mocked table, which only kicks in if the
// live fetch failed.
export const getRate = (liveRates, from, to) =>
  to === from ? 1 : (liveRates?.[to] ?? EXCHANGE_RATES[from]?.[to] ?? null);

// Money endpoints can answer 200 yet report the transfer failed in the body
// (status "failed"/"declined" or success:false). Throw so callers' catch
// blocks treat it like any other failure.
export const assertDelivered = (data, fallback) => {
  const status = (data?.status || "").toLowerCase();
  if (status === "failed" || status === "declined" || data?.success === false) {
    const error = new Error(data?.reason || data?.message || fallback);
    // The server answered and said no: the money definitely didn't move.
    error.declined = true;
    throw error;
  }
  // Accepted but not settled yet (e.g. awaiting an M-Pesa callback): not a
  // failure, but not "delivered" either. Callers' catch blocks route it to
  // TransferStatus's pending state via failureKind.
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

// Did this money request definitely fail ("declined"), or might it have gone
// through before the connection dropped ("unconfirmed")? Only a 4xx or an
// explicit failed/declined body proves nothing moved; a timeout, network
// error or 5xx may have reached the ledger first.
// "pending" means the server accepted it and is still settling.
export const failureKind = (error) =>
  error?.pending
    ? "pending"
    : error?.declined ||
        (error?.response?.status >= 400 && error?.response?.status < 500)
      ? "declined"
      : "unconfirmed";

// One key per reviewed transfer, sent with every attempt so a retry after a
// timeout can't charge twice (the backend dedupes on the Idempotency-Key
// header). crypto.randomUUID needs a secure context; the fallback covers
// plain-http dev hosts.
export const newIdempotencyKey = () =>
  window.crypto?.randomUUID?.() ??
  `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;

// Money inputs as text, not type="number": no "e", no scroll-wheel nudges.
// Keeps digits and one decimal point, two decimals at most.
export const toDecimalInput = (value) => {
  const [whole, ...rest] = value.replace(/[^\d.]/g, "").split(".");
  return rest.length ? `${whole}.${rest.join("").slice(0, 2)}` : whole;
};
