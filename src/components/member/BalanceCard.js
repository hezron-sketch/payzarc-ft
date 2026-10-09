import React, { useState } from "react";
import {
  PlusCircle,
  ArrowDownCircle,
  Send,
  UsersRound,
  Eye,
  EyeOff,
  X,
  FileText,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { phoneBezelColorClass, phoneNotchBaseClass } from "../PhoneMockup";

// The balance-card action buttons — one config-driven list instead of
// near-identical JSX blocks. Send/Withdraw render as floating pills beside
// the phone (the two most common wallet actions); the rest render as a pill
// row just below the balance. Same switchSection/activeSection wiring
// either way — only where each button is drawn differs.
const ACTION_TILES = [
  { key: "add-money", label: "Deposit", icon: PlusCircle },
  { key: "withdraw", label: "Withdraw", icon: ArrowDownCircle },
  { key: "send", label: "Send", icon: Send },
  { key: "groups", label: "Groups", icon: UsersRound },
  { key: "reports", label: "Transactions", icon: FileText },
];
const BALANCE_CARD_ACTIONS = ["send", "withdraw"].map((key) =>
  ACTION_TILES.find((t) => t.key === key),
);
const ICON_ROW_ACTIONS = ACTION_TILES.filter(
  (t) => t.key === "add-money" || t.key === "groups" || t.key === "reports",
);

// The balance card's screen — flat bg-card block, no gradient/shadow.
// Radius = bezel's own rounded-[34px] minus its p-[5px] padding, so the
// inner screen's corners trace concentrically with the outer bezel's
// instead of leaving an uneven-looking bezel width around the curve.
// Fixed height so the screen reads like a real device instead of stretching
// per flow — content that doesn't fit scrolls inside it (overflow-y-auto)
// rather than growing the card. Inset shadows ring every edge from the
// inside (glow fading in from each border, brightest along the top like
// glass catching light) so the light stays inside the display instead of
// leaking onto the bezel.
// Below 768px, Dashboard.js's own app shell already frames the whole page
// as a full-screen "phone" — this card drops its fixed height there (so it
// flows instead of internally scrolling) but keeps its own rounded corners,
// still reading as a distinct card instead of a flat edge-to-edge block.
const balanceCardClass =
  "relative bg-card rounded-[29px] h-[620px] max-[768px]:h-auto max-[640px]:h-auto flex flex-col shadow-[inset_0_1px_0_rgba(255,255,255,0.1),inset_0_0_0_1px_rgba(255,255,255,0.04),inset_0_28px_46px_-30px_rgba(255,255,255,0.08),inset_0_-20px_40px_-30px_rgba(var(--gold-rgb),0.18),inset_20px_0_36px_-32px_rgba(255,255,255,0.06),inset_-20px_0_36px_-32px_rgba(255,255,255,0.06)]";
// Phone bezel wrapping the balance card — flat trim, no elevation shadow.
// Capped width (thinner, more phone-shaped) instead of filling the whole
// column. origin-top + the scale transition here is the "phone zooms in"
// cue — a flow's fields replace Quick Send in place and this scales up a
// touch at the same time, reversing automatically when activeSection goes
// back to "dashboard" since it's just a conditional class.
const phoneBezelClass =
  "relative w-full max-w-[400px] mx-auto origin-top transition-transform duration-300 ease-in-out rounded-[34px] border border-[rgba(var(--gold-rgb),0.18)] p-[5px] max-[768px]:max-w-none max-[768px]:rounded-none max-[768px]:border-none max-[768px]:bg-transparent max-[768px]:p-0";
// Hangs from the screen's top edge (inside balanceCardClass); hidden below
// 768px where the bezel itself goes away.
const phoneNotchClass =
  "top-0 w-[34%] h-[22px] rounded-b-[14px] max-[768px]:hidden";
// Thin gold-on-transparent scrollbar for the screen's scrollable content
// area — matches the bezel's gold accent instead of the browser default.
// WebKit via the pseudo-element variants. Firefox via scrollbar-width/-color,
// scoped to Firefox only: Chrome 121+ ignores ::-webkit-scrollbar entirely
// once scrollbar-width/-color is set, falling back to its fat "thin" bar.
const phoneScrollAreaClass =
  "supports-[-moz-appearance:none]:[scrollbar-width:thin] supports-[-moz-appearance:none]:[scrollbar-color:rgba(var(--gold-rgb),0.35)_transparent] [&::-webkit-scrollbar]:w-[3px] [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-[rgba(var(--gold-rgb),0.35)] [&::-webkit-scrollbar-thumb:hover]:bg-[rgba(var(--gold-rgb),0.55)]";

// Fixed w-[140px] h-12 — shared with the floating Send/Withdraw pills so
// every action button on the card is the same size, not just the same
// padding. Flat gold pill when active, flat translucent pill otherwise.
const goldPillBtnClass =
  "flex items-center justify-center gap-2 w-[140px] h-10 rounded-md text-[0.85rem] font-semibold cursor-pointer text-black bg-gradient-to-b from-gold to-gold-dark transition-colors duration-200 hover:brightness-110";
const flatPillBtnClass =
  "flex items-center justify-center gap-2 w-[140px] h-10 rounded-md text-[0.85rem] font-semibold cursor-pointer text-foreground bg-white/[0.06] border border-white/[0.1] transition-colors duration-200 hover:bg-white/[0.1]";

// Balance section, phone-bezeled — the dashboard's main component: live
// balance, group funds, the action buttons, and a fixed-height screen whose
// content (`children`: Quick Send at rest, the active flow otherwise) swaps
// in place and scrolls internally.
function BalanceCard({
  balanceCardRef,
  scrollRef,
  activeSection,
  contentKey,
  switchSection,
  goToDashboard,
  onPageChange,
  displayCurrency,
  formattedBalance,
  loadingBalance,
  balanceError,
  groupFundsTotal,
  children,
}) {
  const [showBalance, setShowBalance] = useState(false);
  // True for any flow — the phone bezel scales up slightly as a "phone
  // zooms in" cue.
  const phoneZoomActive = activeSection !== "dashboard";

  return (
    <div className="relative w-full max-w-[400px] mx-auto">
      <div
        ref={balanceCardRef}
        className={cn(
          phoneBezelClass,
          phoneBezelColorClass,
          phoneZoomActive && "scale-[1.02]",
        )}
      >
        <div className={balanceCardClass}>
          <div className={cn(phoneNotchBaseClass, phoneNotchClass)} />
          <div className="w-full h-full min-h-0 flex flex-col items-center px-8 pt-9 pb-8 max-[640px]:px-6">
            <div className="w-full flex flex-col items-center mb-16">
              <div className="flex flex-col items-center">
                <div className="flex items-center gap-2.5 mb-2">
                  <span className="text-muted-foreground text-[1rem] font-extrabold tracking-wide uppercase">
                    Total Balance
                  </span>
                  <button
                    className="bg-transparent border-none text-[var(--muted)] flex items-center transition-colors duration-200 hover:text-foreground"
                    onClick={() => setShowBalance(!showBalance)}
                  >
                    {showBalance ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                <h1 className="text-[1.1rem] font-black text-gold tracking-[-1px] m-0 flex items-baseline gap-2">
                  <span className="opacity-75">{displayCurrency}</span>
                  <span
                    className={cn(
                      "relative overflow-hidden rounded-2xl before:content-[''] before:absolute before:inset-0 before:[backdrop-filter:blur(2rem)] before:rounded-[inherit] before:pointer-events-none before:opacity-0 before:transition-opacity before:duration-[250ms]",
                      !showBalance && "select-none before:opacity-100",
                    )}
                  >
                    {loadingBalance ? "..." : formattedBalance}
                  </span>
                </h1>
                {balanceError && (
                  <p className="mt-2 mb-0 text-[0.75rem] text-destructive">
                    {balanceError}
                  </p>
                )}
                {/* Group funds are their own pool, separate from the wallet
                  balance — the Groups page is the source of truth. */}
                {groupFundsTotal > 0 && (
                  <button
                    type="button"
                    onClick={() => onPageChange("groups")}
                    className="mt-2 inline-flex items-center gap-1.5 bg-white/[0.04] border border-white/[0.08] rounded-md px-3 py-0.5 text-[0.75rem] font-semibold text-muted-foreground cursor-pointer transition-colors hover:bg-white/[0.07] hover:border-gold/20 hover:text-foreground"
                  >
                    <UsersRound size={12} className="text-gold" />
                    <span
                      className={cn(
                        "relative overflow-hidden rounded-md before:content-[''] before:absolute before:inset-0 before:[backdrop-filter:blur(0.6rem)] before:rounded-[inherit] before:pointer-events-none before:opacity-0 before:transition-opacity before:duration-[250ms]",
                        !showBalance && "select-none before:opacity-100",
                      )}
                    >
                      {displayCurrency} {groupFundsTotal.toLocaleString()}
                    </span>{" "}
                    in Group Funds
                  </button>
                )}
              </div>
            </div>

            {/* Add Money/Groups/Reports, same row at every width — Send/
              Withdraw live only in the floating pills above, so they're
              never duplicated in here. Three pills don't fit at the shared
              fixed 140px width, so they share the row instead. */}
            <div className="relative w-full flex items-center justify-center gap-2 mb-2">
              {/* Floating Send/Withdraw pills — same FloatCard shape as the
                landing hero's. Rendered inside the Add Money row (positioned off
                it) and straddle the phone's edges, which is why the screen has no
                overflow-hidden. */}
              {BALANCE_CARD_ACTIONS.map(({ key, label, icon: Icon }) => {
                const active = activeSection === key;
                const isSend = key === "send";
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => switchSection(key)}
                    aria-label={label}
                    className={cn(
                      "flex absolute z-10 items-center justify-center gap-2 w-[140px] h-10 rounded-md whitespace-nowrap cursor-pointer text-[0.85rem] font-semibold transition-all duration-200 hover:-translate-y-0.5",
                      // Anchored to this row, mirrored: Send sits 29px above it,
                      // Withdraw 29px below — so the balance block growing (error
                      // line, Group Funds chip) moves both with the row instead of
                      // Send landing on it. Horizontal offsets put each pill 20px
                      // past the bezel's edge: row inset = bezel border+padding (6px,
                      // gone below 768px) + the screen's px-8/px-6.
                      isSend
                        ? "bottom-[calc(100%+29px)] -left-[58px] max-[768px]:-left-[52px] max-[640px]:-left-[44px]"
                        : "top-[calc(100%+29px)] -right-[58px] max-[768px]:-right-[52px] max-[640px]:-right-[44px]",
                      active
                        ? "bg-gradient-to-b from-gold to-gold-dark border-[0.5px] border-transparent text-black"
                        : "bg-secondary border-[0.5px] border-input hover:border-gold/30 text-foreground",
                    )}
                  >
                    <Icon
                      size={16}
                      className={cn(
                        "shrink-0",
                        active
                          ? "text-black"
                          : isSend
                            ? "text-gold"
                            : "text-[#60a5fa]",
                      )}
                    />
                    <span className="truncate">{label}</span>
                  </button>
                );
              })}
              {ICON_ROW_ACTIONS.map(({ key, label, icon: Icon }) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => switchSection(key)}
                  className={cn(
                    activeSection === key ? goldPillBtnClass : flatPillBtnClass,
                    "w-auto flex-1 min-w-0 px-2 gap-1.5",
                  )}
                >
                  <Icon size={16} className="shrink-0" />
                  <span className="truncate">{label}</span>
                </button>
              ))}
            </div>

            {/* Whichever content is active swaps in place here instead of
              opening as a popup. The screen is a fixed height, so this area
              scrolls (flex-1 + overflow-y-auto) if a flow runs taller. */}
            <div
              ref={scrollRef}
              className={cn(
                "w-full mt-8 pt-6 border-t border-white/[0.06] flex-1 min-h-0 overflow-y-auto",
                phoneScrollAreaClass,
              )}
            >
              <div
                key={contentKey}
                className="w-full flex flex-col gap-5 animate-flow-fade-in"
              >
                {phoneZoomActive && (
                  <div className="flex items-center justify-between">
                    <h2 className="text-base font-bold m-0">
                      {ACTION_TILES.find((t) => t.key === activeSection)
                        ?.label ||
                        (activeSection === "send-many" ? "Send to Many" : "")}
                    </h2>
                    <button
                      type="button"
                      className="bg-transparent border-none text-[var(--muted)] hover:text-foreground flex items-center transition-colors duration-200"
                      onClick={goToDashboard}
                      aria-label="Close"
                    >
                      <X size={16} />
                    </button>
                  </div>
                )}
                {children}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default BalanceCard;
