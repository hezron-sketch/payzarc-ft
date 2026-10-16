import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  CirclePlus,
  CircleArrowDown,
  Send,
  UsersRound,
  Eye,
  EyeOff,
  X,
  ReceiptText,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  phoneBezelColorClass,
  phoneNotchBaseClass,
  phoneModalShadowClass,
} from "../PhoneMockup";

// The balance-card action buttons — one config-driven list instead of
// near-identical JSX blocks. Send/Withdraw render as floating pills beside
// the phone (the brand's two money-out actions); Deposit (money in, styled
// as the primary row action) and Transactions render as a row just below
// the balance. Groups is reached from the nav and the group-funds chip;
// its tile stays here only so the open panel's heading has a label. Same switchSection/activeSection wiring
// either way — only where each button is drawn differs.
const ACTION_TILES = [
  { key: "add-money", label: "Deposit", icon: CirclePlus },
  { key: "withdraw", label: "Withdraw", icon: CircleArrowDown },
  { key: "send", label: "Send", icon: Send },
  { key: "groups", label: "Groups", icon: UsersRound },
  { key: "reports", label: "Transactions", icon: ReceiptText },
];
const BALANCE_CARD_ACTIONS = ["send", "withdraw"].map((key) =>
  ACTION_TILES.find((t) => t.key === key),
);
const ICON_ROW_ACTIONS = ACTION_TILES.filter(
  (t) => t.key === "add-money" || t.key === "reports",
);

// The balance card's screen — flat bg-card block, no gradient/shadow.
// Radius = bezel's own --r (44px) minus its p-[8px] padding, so the
// inner screen's corners trace concentrically with the outer bezel's
// instead of leaving an uneven-looking bezel width around the curve.
// Fills the bezel's fixed phone shape so the screen reads like a real
// device instead of stretching per flow — content that doesn't fit scrolls inside it (overflow-y-auto)
// rather than growing the card. Inset shadows ring every edge from the
// inside (glow fading in from each border, brightest along the top like
// glass catching light) so the light stays inside the display instead of
// leaking onto the bezel.
// Below 768px, Dashboard.js's own app shell already frames the whole page
// as a full-screen "phone" — this card drops its fixed height there (so it
// flows instead of internally scrolling) but keeps its own rounded corners,
// still reading as a distinct card instead of a flat edge-to-edge block.
const balanceCardClass =
  "relative bg-card rounded-[calc(var(--r)-8px)] max-[768px]:rounded-[29px] flex-1 min-h-0 max-[768px]:flex-none max-[768px]:h-auto flex flex-col shadow-[inset_0_1px_0_rgba(255,255,255,0.1),inset_0_0_0_1px_rgba(255,255,255,0.04),inset_0_28px_46px_-30px_rgba(255,255,255,0.08),inset_0_-20px_40px_-30px_rgba(var(--gold-rgb),0.18),inset_20px_0_36px_-32px_rgba(255,255,255,0.06),inset_-20px_0_36px_-32px_rgba(255,255,255,0.06)]";
// Phone bezel wrapping the balance card — same bezel as the mobile shell's
// phone modal (44px radius, 8px bezel, hairline gold border, lifted shadow)
// so the phone looks identical at every width.
// Sized like the other phone frames: aspect-[9/19.5] with the width
// derived from the viewport height (minus topbar + page padding), capped at
// 360px, so it's a real phone shape that fits the screen instead of the old
// squat 400×620 box. The screen inside fills it (flex-1) and scrolls. origin-top + the scale transition here is the "phone zooms in"
// cue — a flow's fields replace Quick Send in place and this scales up a
// touch at the same time, reversing automatically when activeSection goes
// back to "dashboard" since it's just a conditional class.
const phoneBezelClass =
  "relative flex flex-col w-[clamp(300px,calc((100vh-150px)*9/19.5),360px)] aspect-[9/19.5] mx-auto origin-top transition-transform duration-300 ease-in-out [--r:44px] rounded-[var(--r)] border-[0.5px] border-[rgba(var(--gold-rgb),0.16)] p-[8px] max-[768px]:w-full max-[768px]:aspect-auto max-[768px]:rounded-none max-[768px]:border-none max-[768px]:bg-transparent max-[768px]:p-0 max-[768px]:shadow-none";
// Hangs from the screen's top edge (inside balanceCardClass); hidden below
// 768px where the bezel itself goes away.
const phoneNotchClass =
  "top-0 w-[40%] h-[22px] rounded-b-[14px] max-[768px]:hidden";
// Thin gold-on-transparent scrollbar for the screen's scrollable content
// area — matches the bezel's gold accent instead of the browser default.
// Vertical only: the area is overflow-x-hidden (header controls use
// negative margins for bigger tap targets), and h-0 keeps a horizontal
// bar from ever drawing at the browser's default height.
// WebKit via the pseudo-element variants. Firefox via scrollbar-width/-color,
// scoped to Firefox only: Chrome 121+ ignores ::-webkit-scrollbar entirely
// once scrollbar-width/-color is set, falling back to its fat "thin" bar.
const phoneScrollAreaClass =
  "supports-[-moz-appearance:none]:[scrollbar-width:thin] supports-[-moz-appearance:none]:[scrollbar-color:rgba(var(--gold-rgb),0.35)_transparent] [&::-webkit-scrollbar]:w-[3px] [&::-webkit-scrollbar]:h-0 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-[rgba(var(--gold-rgb),0.35)] [&::-webkit-scrollbar-thumb:hover]:bg-[rgba(var(--gold-rgb),0.55)]";

// Fixed w-[140px] h-12 — shared with the floating Send/Withdraw pills so
// every action button on the card is the same size, not just the same
// padding. Flat gold pill when active, flat translucent pill otherwise.
const goldPillBtnClass =
  "flex items-center justify-center gap-2 w-[140px] h-11 rounded-md text-[0.85rem] font-semibold cursor-pointer text-black bg-gradient-to-b from-gold to-gold-dark transition-colors duration-200 hover:brightness-110";
const flatPillBtnClass =
  "flex items-center justify-center gap-2 w-[140px] h-11 rounded-md text-[0.85rem] font-semibold cursor-pointer text-foreground bg-white/[0.06] border border-white/[0.1] transition-colors duration-200 hover:bg-white/[0.1]";

// Inside Dashboard's framed mobile shell the screen is a scroll area that
// clips everything past its edges, so absolutely-positioned pills could
// never hang out of the phone. There, the pills are portaled straight into
// the phone bezel (absolute against it), so no scroller or transformed
// ancestor (the card's zoom-in scale, page fade-ins) sits between them and
// the bezel to clip or re-anchor them — and this loop pins them to the action
// row every frame: straddling the screen edge (EDGE_OVERHANG px outside),
// following the content as it scrolls, and clipped top/bottom to the
// scroll area so they never float over the topbar or tab bar.
// ponytail: per-frame rAF while framed (4 rect reads) — swap for CSS anchor
// positioning once Firefox ships it.
const EDGE_OVERHANG = 48; // px of each 140px pill outside the screen
const PILL_GAP = 29; // px between the row and each pill (matches desktop)
const PILL_H = 44;
function usePhoneEdgePills(rowRef, sendRef, withdrawRef) {
  const [bezel, setBezel] = useState(null);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 768px)");
    const update = () =>
      setBezel(
        (mq.matches && rowRef.current?.closest("[data-phone-bezel]")) || null,
      );
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, [rowRef]);

  useEffect(() => {
    if (!bezel) return;
    const row = rowRef.current;
    const scroller = row.closest("main");
    let raf;
    const tick = () => {
      const b = bezel.getBoundingClientRect();
      const r = row.getBoundingClientRect();
      const m = scroller.getBoundingClientRect();
      // Never hang past the browser window on a narrow real phone.
      const out = Math.max(0, Math.min(EDGE_OVERHANG, b.left - 4));
      const place = (el, top, side) => {
        if (!el) return;
        const t = top - b.top;
        el.style.top = `${t}px`;
        el.style.left = side === "left" ? `${8 - out}px` : "auto";
        el.style.right = side === "right" ? `${8 - out}px` : "auto";
        // Clip to the scroll area vertically only; generous negative
        // insets leave the shadow and the overhang untouched sideways.
        const clipTop = Math.max(0, m.top - top);
        const clipBottom = Math.max(0, top + PILL_H - m.bottom);
        el.style.clipPath = `inset(${clipTop}px -40px ${clipBottom}px -40px round 6px)`;
        el.style.visibility = clipTop + clipBottom >= PILL_H ? "hidden" : "";
      };
      place(sendRef.current, r.top - PILL_GAP - PILL_H, "left");
      place(withdrawRef.current, r.bottom + PILL_GAP, "right");
      raf = requestAnimationFrame(tick);
    };
    tick();
    return () => cancelAnimationFrame(raf);
  }, [bezel, rowRef, sendRef, withdrawRef]);

  return bezel;
}

// Balance section, phone-bezeled — the dashboard's main component: live
// balance, group funds, the action buttons, and a fixed-height screen whose
// content (`children`: Quick Send at rest, the active flow otherwise) swaps
// in place and scrolls internally.
function BalanceCard({
  balanceCardRef,
  scrollRef,
  activeSection,
  contentKey,
  contentAnimation = "animate-flow-fade-in",
  switchSection,
  goToDashboard,
  displayCurrency,
  formattedBalance,
  loadingBalance,
  balanceError,
  groupFundsTotal,
  onOpenGroupFunds,
  children,
}) {
  // Remembered per device: hiding the balance is a privacy choice the user
  // makes once, not a blur they have to clear on every visit.
  const [showBalance, setShowBalance] = useState(() => {
    try {
      return localStorage.getItem("payzarc.showBalance") !== "false";
    } catch {
      return true;
    }
  });
  const toggleBalance = () => {
    const next = !showBalance;
    setShowBalance(next);
    try {
      localStorage.setItem("payzarc.showBalance", String(next));
    } catch {}
  };
  // True for any flow — the phone bezel scales up slightly as a "phone
  // zooms in" cue.
  const phoneZoomActive = activeSection !== "dashboard";
  const rowRef = useRef(null);
  const sendRef = useRef(null);
  const withdrawRef = useRef(null);
  const bezel = usePhoneEdgePills(rowRef, sendRef, withdrawRef);
  const framed = !!bezel;

  return (
    <div className="relative w-full max-w-[400px] mx-auto">
      <div
        ref={balanceCardRef}
        className={cn(
          phoneBezelClass,
          phoneBezelColorClass,
          phoneModalShadowClass,
          phoneZoomActive && "scale-[1.02]",
        )}
      >
        <div className={balanceCardClass}>
          <div className={cn(phoneNotchBaseClass, phoneNotchClass)} />
          <div className="w-full h-full min-h-0 flex flex-col items-center px-8 pt-9 pb-8 max-[640px]:px-6">
            {/* mb/mt clearances around the action row = the floating pills' reach
              (29px offset + 44px pill = 73px), so neither pill ever sits on
              the balance block or the content header's controls. */}
            <div className="w-full flex flex-col items-center mb-[76px]">
              <div className="flex flex-col items-center">
                <div className="flex items-center gap-1 mb-1">
                  <span
                    id="balance-label"
                    className="text-[var(--soft)] text-[0.9rem] font-medium"
                  >
                    Total balance
                  </span>
                  <button
                    type="button"
                    className="w-9 h-9 rounded-full text-[var(--soft)] flex items-center justify-center transition-colors duration-200 hover:text-foreground hover:bg-white/[0.05]"
                    onClick={toggleBalance}
                    aria-label={showBalance ? "Hide balance" : "Show balance"}
                    aria-pressed={!showBalance}
                  >
                    {showBalance ? (
                      <EyeOff key="off" size={16} aria-hidden="true" className="animate-in fade-in zoom-in-75 duration-200 ease-out" />
                    ) : (
                      <Eye key="on" size={16} aria-hidden="true" className="animate-in fade-in zoom-in-75 duration-200 ease-out" />
                    )}
                  </button>
                </div>
                <h1
                  aria-labelledby="balance-label"
                  className="text-[clamp(2.25rem,9vw,2.75rem)] leading-none font-semibold text-gold tracking-[-0.03em] tabular-nums m-0 flex items-baseline gap-2"
                >
                  <span className="text-[0.5em] font-medium opacity-75 tracking-normal">
                    {displayCurrency}
                  </span>
                  {/* Hidden = the digits aren't rendered at all (a blur over
                      them fails wherever backdrop-filter is unsupported). */}
                  {/* key on each state so revealing/hiding (and the balance
                      arriving after load) settles in with a short blur
                      instead of the digits snapping. */}
                  {showBalance ? (
                    <span
                      key={loadingBalance ? "loading" : "shown"}
                      className="animate-reveal-in"
                    >
                      {loadingBalance ? "…" : formattedBalance}
                    </span>
                  ) : (
                    <>
                      <span className="sr-only">Balance hidden</span>
                      <span aria-hidden="true" className="tracking-[0.08em] animate-reveal-in">
                        ••••••
                      </span>
                    </>
                  )}
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
                    onClick={onOpenGroupFunds}
                    className="mt-3 inline-flex items-center gap-1.5 bg-white/[0.04] border border-white/[0.08] rounded-full px-3 py-1.5 text-[0.8rem] font-semibold text-muted-foreground cursor-pointer transition-colors hover:bg-white/[0.07] hover:border-gold/20 hover:text-foreground"
                  >
                    <UsersRound size={12} className="text-gold" aria-hidden="true" />
                    <span className="tabular-nums">
                      {displayCurrency}{" "}
                      {showBalance ? groupFundsTotal.toLocaleString() : "••••"}
                    </span>{" "}
                    in group funds
                  </button>
                )}
              </div>
            </div>

            {/* Add Money/Groups/Reports, same row at every width — Send/
              Withdraw live only in the floating pills above, so they're
              never duplicated in here. Three pills don't fit at the shared
              fixed 140px width, so they share the row instead. */}
            <div
              ref={rowRef}
              className="relative w-full flex items-center justify-center gap-2 mb-2"
            >
              {/* Floating Send/Withdraw pills — same FloatCard shape as the
                landing hero's. Rendered inside the Add Money row (positioned off
                it) and straddle the phone's edges, which is why the screen has no
                overflow-hidden. */}
              {BALANCE_CARD_ACTIONS.map(({ key, label, icon: Icon }) => {
                const active = activeSection === key;
                const isSend = key === "send";
                const pill = (
                  <button
                    key={key}
                    ref={isSend ? sendRef : withdrawRef}
                    data-edge-pill=""
                    type="button"
                    onClick={() => switchSection(key)}
                    aria-pressed={active}
                    className={cn(
                      // Lift on hover / sink on press with a slight spring
                      // overshoot, and a drop shadow so the pill reads as
                      // floating above both the screen and the bezel it hangs
                      // over. Hover motion is gated to real pointers so a tap
                      // on touch doesn't leave it stuck lifted.
                      "flex z-10 items-center justify-center gap-2 w-[140px] h-11 rounded-md whitespace-nowrap cursor-pointer text-[0.85rem] font-semibold transition-ui duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] shadow-[0_10px_24px_-8px_rgba(0,0,0,0.6)] [@media(hover:hover)_and_(pointer:fine)]:hover:-translate-y-0.5 [@media(hover:hover)_and_(pointer:fine)]:hover:shadow-[0_16px_30px_-10px_rgba(0,0,0,0.65)] active:scale-[0.96] active:duration-100",
                      // Framed mobile shell: portaled into the bezel and placed
                      // by usePhoneEdgePills (z-10 clears the screen and notch).
                      "absolute",
                      // Anchored to this row, mirrored: Send sits 29px above it,
                      // Withdraw 29px below — so the balance block growing (error
                      // line, Group Funds chip) moves both with the row instead of
                      // Send landing on it. Horizontal offsets put each pill 20px
                      // past the bezel's edge: row inset = bezel border+padding (8.5px,
                      // gone below 768px) + the screen's px-8/px-6.
                      !framed &&
                        (isSend
                          ? "bottom-[calc(100%+29px)] -left-[61px] max-[768px]:-left-[52px] max-[640px]:-left-[28px]"
                          : "top-[calc(100%+29px)] -right-[61px] max-[768px]:-right-[52px] max-[640px]:-right-[28px]"),
                      active
                        ? "bg-gradient-to-b from-gold to-gold-dark border-[0.5px] border-transparent text-black"
                        : "bg-secondary border-[0.5px] border-input hover:border-gold/30 text-foreground",
                    )}
                  >
                    <Icon
                      size={16}
                      aria-hidden="true"
                      className={cn(
                        "shrink-0",
                        active
                          ? "text-black"
                          : isSend
                            ? "text-gold"
                            : "text-info",
                      )}
                    />
                    <span className="truncate">{label}</span>
                  </button>
                );
                return bezel ? createPortal(pill, bezel, key) : pill;
              })}
              {ICON_ROW_ACTIONS.map(({ key, label, icon: Icon }) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => switchSection(key)}
                  aria-pressed={activeSection === key}
                  className={cn(
                    activeSection === key ? goldPillBtnClass : flatPillBtnClass,
                    "w-auto flex-1 min-w-0 px-2 gap-1.5",
                    key === "add-money" &&
                      activeSection !== key &&
                      "text-gold border-gold/35 hover:border-gold/55",
                  )}
                >
                  <Icon size={16} className="shrink-0" aria-hidden="true" />
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
                "w-full mt-[60px] pt-6 border-t border-white/[0.06] flex-1 min-h-0 overflow-y-auto overflow-x-hidden",
                phoneScrollAreaClass,
              )}
            >
              <div
                key={contentKey}
                className={cn("w-full flex flex-col gap-5", contentAnimation)}
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
                      className="-m-2 w-10 h-10 rounded-full text-[var(--soft)] hover:text-foreground hover:bg-white/[0.05] flex items-center justify-center transition-colors duration-200"
                      onClick={goToDashboard}
                      aria-label="Close"
                    >
                      <X size={16} aria-hidden="true" />
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
