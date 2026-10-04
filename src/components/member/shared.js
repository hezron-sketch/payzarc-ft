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
  "flex items-center justify-between text-[11px] font-medium text-muted-foreground uppercase tracking-wider -mb-[0.4rem]";
export const formInputClass =
  "w-full h-auto bg-white/[0.03] border-white/[0.06] rounded-xl px-4 py-3.5 text-foreground text-base md:text-base placeholder:text-muted-foreground focus-visible:ring-1 focus-visible:ring-gold/[0.08] focus-visible:border-gold/30 focus-visible:bg-white/[0.07] shadow-none transition-colors duration-200";
export const primaryBtnClass =
  "w-full h-auto rounded-sm px-5 py-2.5 text-base font-bold text-black transition-colors duration-200 hover:bg-primary active:scale-[0.97] disabled:opacity-60 disabled:active:scale-100 mt-1";
// Modal surface — flat bg-card + border, no elevation shadow or 3D tilt;
// reuses the same popup-in fade/scale every other popover on the dashboard
// uses instead of its own perspective/rotateX entrance.
export const modal3dClass =
  "bg-card border border-white/[0.06] animate-popup-in";
// Wrapper every flow panel renders inside the phone screen.
export const flowPanelClass =
  "flex flex-col gap-[1.1rem] w-full max-w-[420px] mx-auto max-[640px]:max-w-full";
// Service-picker dialog shell (Add Money / Withdraw / Send progress).
export const pickerDialogClass = cn(
  "w-[min(400px,100%)] max-w-[400px] rounded-2xl p-7 flex flex-col gap-4",
  modal3dClass,
);
// Add Money modal's own "+ Save/Add/Use a saved..." links — a real
// pill-shaped button with proper padding instead of a bare, zero-padding
// text link (which reads as squished right under the field above it).
export const modalAddLinkClass =
  "self-start inline-flex items-center gap-1 bg-white/[0.04] border border-white/[0.08] rounded-full px-3.5 py-1.5 text-gold text-[0.78rem] font-semibold cursor-pointer transition-colors hover:bg-white/[0.07] hover:border-gold/30";
export const methodBtnClass = (active) =>
  cn(
    "flex-1 bg-white/[0.02] border border-white/[0.05] text-muted-foreground px-2 py-2 rounded-sm text-[0.8rem] font-semibold transition-all duration-200 hover:bg-white/[0.05] hover:border-gold/20 hover:text-foreground",
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
