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
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  phoneBezelColorClass,
  phoneNotchBaseClass,
  phoneModalShadowClass,
  phoneShellClass,
  phoneScreenClass,
} from "../PhoneMockup";
import { useLayoutSpring } from "./layoutSpring";

const ACTION_TILES = [
  { key: "add-money", label: "Deposit", icon: CirclePlus },
  { key: "withdraw", label: "Withdraw", icon: CircleArrowDown },
  { key: "send", label: "Send", icon: Send },
  { key: "groups", label: "Groups", icon: UsersRound },
];
const BALANCE_CARD_ACTIONS = ["send", "withdraw"].map((key) =>
  ACTION_TILES.find((t) => t.key === key),
);
const ICON_ROW_ACTIONS = ACTION_TILES.filter(
  (t) => t.key === "add-money" || t.key === "groups",
);

const balanceCardClass =
  "max-[768px]:rounded-none max-[768px]:bg-transparent max-[768px]:shadow-none flex-1 min-h-0 flex flex-col";
const phoneBezelClass =
  "relative flex flex-col w-[clamp(300px,calc((100vh-150px)*9/19.5),360px)] aspect-[9/19.5] mx-auto lg:ml-0 max-[768px]:scroll-mt-[calc(var(--topbar-h)+8px)] origin-top transition-transform duration-300 ease-in-out max-[768px]:w-full max-[768px]:aspect-auto max-[768px]:h-[calc(100cqh+1rem)] max-[768px]:-mt-2 max-[768px]:-mb-6 max-[768px]:rounded-none max-[768px]:border-none max-[768px]:bg-transparent max-[768px]:p-0 max-[768px]:shadow-none";
const phoneNotchClass =
  "top-0 w-[40%] h-[22px] rounded-b-[14px] max-[768px]:hidden";
// A hairline that stays near-invisible until the pointer is over the screen;
// overflow-y-auto already leaves it out when nothing overflows.
const phoneScrollAreaClass =
  "supports-[-moz-appearance:none]:[scrollbar-width:thin] supports-[-moz-appearance:none]:[scrollbar-color:rgba(255,255,255,0.06)_transparent] supports-[-moz-appearance:none]:hover:[scrollbar-color:rgba(255,255,255,0.18)_transparent] [&::-webkit-scrollbar]:w-[2px] [&::-webkit-scrollbar]:h-0 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-white/[0.06] hover:[&::-webkit-scrollbar-thumb]:bg-white/[0.18]";

const chipBtnClass =
  "lift flex-1 min-w-0 max-w-[140px] h-11 inline-flex items-center justify-center gap-2 rounded-md whitespace-nowrap text-[0.85rem] font-semibold cursor-pointer border-[0.5px]";
// Header actions sit raised off the screen (drop shadow + lit top edge) and
// press flat into it, greyed, while another flow is open. Timing lives in
// .lift (Global.css). Both shadows keep the same two layers, drop then
// inset, so the browser can interpolate between them instead of jumping.
const pillRaisedClass =
  "shadow-[0_10px_24px_-8px_rgba(0,0,0,0.6),inset_0_1px_0_rgba(255,255,255,0.08)] [@media(hover:hover)_and_(pointer:fine)]:hover:-translate-y-0.5 [@media(hover:hover)_and_(pointer:fine)]:hover:shadow-[0_16px_30px_-10px_rgba(0,0,0,0.65),inset_0_1px_0_rgba(255,255,255,0.1)] active:scale-[0.96]";
// Every header action looks the same; only its placement differs.
const actionRestClass =
  "bg-secondary border-input hover:border-gold/30 text-foreground";
const actionActiveClass =
  "bg-gradient-to-b from-gold to-gold-dark border-transparent text-black";
// Lowered keeps the buttons' own slate blue, just a darker shade of it.
const loweredClass =
  "translate-y-0 scale-[0.97] shadow-[0_0_0_0_rgba(0,0,0,0),inset_0_1px_3px_rgba(0,0,0,0.45)] bg-secondary border-white/[0.06] brightness-[0.8] text-[var(--soft)] hover:brightness-95 hover:text-foreground";

const EDGE_OVERHANG = 48; // px of each 140px pill outside the screen
const PILL_H = 44;
function usePhoneEdgePills(sendRowRef, withdrawRowRef, sendRef, withdrawRef) {
  const [bezel, setBezel] = useState(null);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 768px)");
    const update = () =>
      setBezel(
        (mq.matches && sendRowRef.current?.closest("[data-phone-bezel]")) || null,
      );
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, [sendRowRef]);

  useEffect(() => {
    if (!bezel) return;
    const scroller = sendRowRef.current.closest("main");
    // The screen scrolls behind the frosted header and tab bar, so the
    // visible band the pills live in is between those bars, not main's box.
    const header = scroller.parentElement.querySelector(":scope > header");
    const tabBar = scroller.parentElement.querySelector("[data-bottom-nav]");
    let raf;
    const tick = () => {
      const b = bezel.getBoundingClientRect();
      const box = scroller.getBoundingClientRect();
      const m = {
        top: header ? header.getBoundingClientRect().bottom : box.top,
        bottom: tabBar ? tabBar.getBoundingClientRect().top : box.bottom,
      };
      // Never hang past the browser window on a narrow real phone.
      const out = Math.max(0, Math.min(EDGE_OVERHANG, b.left - 4));
      const sendRow = sendRowRef.current.getBoundingClientRect();
      const withdrawRow = withdrawRowRef.current.getBoundingClientRect();
      const place = (el, { top }, side, nudge = 0) => {
        if (!el) return;
        const t = top - b.top;
        el.style.top = `${t}px`;
        el.style.left = side === "left" ? `${8 - out + nudge}px` : "auto";
        el.style.right = side === "right" ? `${8 - out}px` : "auto";
        const clipTop = Math.max(0, m.top - top);
        const clipBottom = Math.max(0, top + PILL_H - m.bottom);
        el.style.clipPath = `inset(${clipTop}px -40px ${clipBottom}px -40px round 6px)`;
        el.style.visibility = clipTop + clipBottom >= PILL_H ? "hidden" : "";
      };
      // Withdraw's row never moves sideways, so the gap is Send's arc.
      place(sendRef.current, sendRow, "left", sendRow.left - withdrawRow.left);
      place(withdrawRef.current, withdrawRow, "right");
      raf = requestAnimationFrame(tick);
    };
    tick();
    return () => cancelAnimationFrame(raf);
  }, [bezel, sendRowRef, withdrawRowRef, sendRef, withdrawRef]);

  return bezel;
}

// Keeps the real figure in the layout, invisible, with stars laid over it,
// so hiding a value never changes its width (stars are narrower than digits).
function Masked({ hidden, label, children }) {
  return (
    <span className="relative inline-block">
      <span className={cn(hidden && "invisible")} aria-hidden={hidden || undefined}>
        {children}
      </span>
      {hidden && (
        <>
          <span className="sr-only">{label}</span>
          <span
            aria-hidden="true"
            className="absolute inset-0 flex items-center justify-center overflow-hidden tracking-[0.1em] animate-reveal-in"
          >
            ******
          </span>
        </>
      )}
    </span>
  );
}

function BalanceCard({
  balanceCardRef,
  scrollRef,
  activeSection,
  contentKey,
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
  const phoneZoomActive = activeSection !== "dashboard";
  // Once a flow is open its own button stays bright; the rest recede.
  const dimmed = (key) => phoneZoomActive && activeSection !== key;
  const hasOwnButton = [...BALANCE_CARD_ACTIONS, ...ICON_ROW_ACTIONS].some(
    (t) => t.key === activeSection,
  );
  const sendRowRef = useRef(null);
  const withdrawRowRef = useRef(null);
  const sendRef = useRef(null);
  const withdrawRef = useRef(null);
  const bezel = usePhoneEdgePills(sendRowRef, withdrawRowRef, sendRef, withdrawRef);
  const framed = !!bezel;

  // Opening or closing a flow rearranges the header. Everything glides to its
  // new place on its own spring: the balance leads, the rest follow slightly
  // behind, and any of it can reverse mid-flight. Pills in the phone frame
  // follow their rows, because their placement reads the rows' live position.
  const balanceRowRef = useRef(null);
  const amountRef = useRef(null);
  const groupFundsRef = useRef(null);
  const chipsRef = useRef(null);
  useLayoutSpring(
    [
      { ref: balanceRowRef, response: 0.42 },
      { ref: amountRef, response: 0.42, scale: true },
      { ref: groupFundsRef, response: 0.47 },
      // Send and the balance swap places, so Send swings out around the
      // balance, far enough to clear it at its widest, to keep the figure
      // readable as they pass.
      {
        ref: sendRowRef,
        response: 0.45,
        swingX: (x) => {
          const pill = sendRef.current.getBoundingClientRect();
          const amount = amountRef.current.getBoundingClientRect();
          const widest = Math.max(amount.width, amountRef.current.offsetWidth);
          const left = amount.left + amount.width / 2 - widest / 2;
          // From the pill's resting spot, so reversing mid-swing still clears;
          // with margin, because the arc is past its peak by the time they cross.
          return -1.35 * Math.max(24, pill.right - x + 8 - left);
        },
      },
      { ref: withdrawRowRef, response: 0.5 },
      { ref: chipsRef, response: 0.52 },
      { ref: scrollRef, response: 0.55 },
    ],
    phoneZoomActive,
  );

  // The screen leaving stays mounted, inert, while it fades out over the one
  // arriving, so neither has to cut.
  const [exiting, setExiting] = useState(null);
  const lastContent = useRef({ key: contentKey, node: children });
  if (lastContent.current.key !== contentKey) {
    setExiting(lastContent.current);
    lastContent.current = { key: contentKey, node: children };
  } else {
    lastContent.current.node = children;
  }

  return (
    <div className="relative w-full max-w-[400px] mx-auto">
      <div
        ref={balanceCardRef}
        className={cn(
          phoneShellClass,
          phoneBezelClass,
          phoneBezelColorClass,
          phoneModalShadowClass,
          phoneZoomActive && "scale-[1.02]",
        )}
      >
        <div className={cn(phoneScreenClass, balanceCardClass)}>
          <div className={cn(phoneNotchBaseClass, phoneNotchClass)} />
          {/* Clipped vertically only: pills hang past the sides on large screens,
              and a travelling screen mustn't make the page scrollable. */}
          <div className="w-full h-full min-h-0 flex flex-col items-center [overflow-y:clip] px-6 pt-8 pb-4 max-[768px]:px-4 max-[768px]:pt-2 max-[768px]:pb-2">
            {/* Home: the header takes the free height and the actions ring the
                balance above a docked Quick Send. In a flow it packs into a
                compact block, balance first, so the screen below gets the room.
                `order` rearranges them without remounting, so they can glide. */}
            <div
              className={cn(
                "w-full flex flex-col items-center",
                phoneZoomActive ? "shrink-0" : "flex-[1_0_auto] gap-y-1.5",
              )}
            >
              {/* Balance centred in the middle cell; the close button owns the
                  right cell, so the two can never run into each other. */}
              <div
                className={cn(
                  "w-full flex flex-col items-center",
                  phoneZoomActive ? "order-1" : "order-2",
                )}
              >
              <div
                ref={balanceRowRef}
                className={cn(
                  "relative w-full grid grid-cols-[1fr_auto_1fr] items-center gap-1",
                  phoneZoomActive ? "h-9" : "h-11",
                )}
              >
                {/* A faint pool of gold under the balance while it's the hero. */}
                <span
                  aria-hidden="true"
                  className={cn(
                    "absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[260px] h-[120px] pointer-events-none bg-[radial-gradient(closest-side,rgba(var(--gold-rgb),0.09),transparent)] transition-opacity duration-500 ease-apple",
                    phoneZoomActive && "opacity-0",
                  )}
                />
                <span />
                <div ref={amountRef} className="relative flex items-center gap-2">
                  <h1
                    className={cn(
                      "leading-none font-semibold text-gold tracking-[-0.01em] tabular-nums whitespace-nowrap m-0 flex items-baseline gap-1.5",
                      phoneZoomActive ? "text-[1.4rem]" : "text-[1.75rem]",
                    )}
                  >
                    <span className="sr-only">Balance</span>
                    <span className="font-medium opacity-75">
                      {displayCurrency}
                    </span>
                    <Masked hidden={!showBalance} label="Balance hidden">
                      <span
                        key={`${loadingBalance}-${showBalance}`}
                        className={cn(showBalance && "animate-reveal-in")}
                      >
                        {loadingBalance ? "…" : formattedBalance}
                      </span>
                    </Masked>
                  </h1>
                  <button
                    type="button"
                    className="-ml-1 shrink-0 w-8 h-8 rounded-full text-[var(--soft)] flex items-center justify-center transition-colors duration-200 hover:text-foreground hover:bg-white/[0.05]"
                    onClick={toggleBalance}
                    aria-label={showBalance ? "Hide balance" : "Show balance"}
                    aria-pressed={!showBalance}
                  >
                    {showBalance ? (
                      <EyeOff key="off" size={15} aria-hidden="true" className="animate-in fade-in zoom-in-75 duration-200 ease-out" />
                    ) : (
                      <Eye key="on" size={15} aria-hidden="true" className="animate-in fade-in zoom-in-75 duration-200 ease-out" />
                    )}
                  </button>
                </div>
                <button
                  type="button"
                  onClick={goToDashboard}
                  aria-label="Close"
                  inert={!phoneZoomActive}
                  className={cn(
                    "relative justify-self-end -mr-2 w-8 h-8 rounded-full text-[var(--soft)] hover:text-foreground hover:bg-white/[0.05] flex items-center justify-center transition-ui duration-300",
                    // Arrives once the balance has nearly landed beside it.
                    phoneZoomActive ? "delay-150" : "opacity-0 scale-75",
                  )}
                >
                  <X size={16} aria-hidden="true" />
                </button>
              </div>
              {balanceError && (
                <p className="mt-1.5 mb-0 text-[0.75rem] text-destructive">
                  {balanceError}
                </p>
              )}
              {groupFundsTotal > 0 && (
                <button
                  ref={groupFundsRef}
                  type="button"
                  onClick={onOpenGroupFunds}
                  className="relative mt-1.5 inline-flex items-center gap-1.5 h-7 rounded-full px-3 text-[0.75rem] font-semibold text-muted-foreground bg-white/[0.04] border border-white/[0.08] cursor-pointer transition-colors hover:bg-white/[0.07] hover:border-gold/20 hover:text-foreground"
                >
                  <UsersRound size={12} className="text-gold" aria-hidden="true" />
                  <span className="tabular-nums uppercase">
                    {displayCurrency}{" "}
                    <Masked hidden={!showBalance} label="hidden">
                      {groupFundsTotal.toLocaleString()}
                    </Masked>
                  </span>{" "}
                  in Group Funds
                </button>
              )}
              </div>

              {/* Send and Withdraw each straddle their edge of the phone, and
                  each row only reserves its pill's height. Home puts the balance
                  between them; in a flow Withdraw's row overlaps Send's, so they
                  line up. */}
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
                      data-lowered={dimmed(key) || undefined}
                      className={cn(
                        "lift flex z-10 items-center justify-center gap-2 w-[140px] h-11 rounded-md whitespace-nowrap cursor-pointer text-[0.85rem] font-semibold border-[0.5px]",
                        "absolute",
                        !framed &&
                          (isSend
                            ? "top-0 -left-[53px] max-[768px]:-left-[48px] max-[640px]:-left-[28px]"
                            : "top-0 -right-[53px] max-[768px]:-right-[48px] max-[640px]:-right-[28px]"),
                        active ? actionActiveClass : actionRestClass,
                        dimmed(key) ? loweredClass : pillRaisedClass,
                      )}
                    >
                      <Icon
                        size={16}
                        aria-hidden="true"
                        className={cn(
                          "shrink-0 transition-colors duration-[420ms]",
                          active
                            ? "text-black"
                            : dimmed(key)
                              ? "text-current"
                              : isSend
                              ? "text-gold"
                              : "text-info",
                        )}
                      />
                      <span className="truncate">{label}</span>
                    </button>
                  );
                  return (
                    <div
                      key={key}
                      ref={isSend ? sendRowRef : withdrawRowRef}
                      className={cn(
                        "relative w-full h-11",
                        isSend
                          ? phoneZoomActive
                            ? "order-2 mt-3.5"
                            : "order-1 mt-auto"
                          : phoneZoomActive
                            ? "order-3 -mt-11"
                            : "order-3",
                      )}
                    >
                      {bezel ? createPortal(pill, bezel, key) : pill}
                    </div>
                  );
                })}

              <div
                ref={chipsRef}
                className={cn(
                  "order-4 w-full flex justify-center gap-2",
                  // Quick Send sits a fixed step below the chips.
                  phoneZoomActive ? "mt-4" : "mt-auto mb-4",
                )}
              >
                {ICON_ROW_ACTIONS.map(({ key, label, icon: Icon }) => {
                  const active = activeSection === key;
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => switchSection(key)}
                      aria-pressed={active}
                      data-lowered={dimmed(key) || undefined}
                      className={cn(
                        chipBtnClass,
                        active ? actionActiveClass : actionRestClass,
                        dimmed(key) ? loweredClass : pillRaisedClass,
                      )}
                    >
                      <Icon
                        size={16}
                        aria-hidden="true"
                        className={cn(
                          "shrink-0 transition-colors duration-[420ms]",
                          active
                            ? "text-black"
                            : dimmed(key)
                              ? "text-current"
                              : key === "add-money"
                                ? "text-gold"
                                : "text-info",
                        )}
                      />
                      <span className="truncate">{label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div
              ref={scrollRef}
              className={cn(
                "relative w-full mt-3 pt-3 border-t border-white/[0.06] min-h-0 overflow-y-auto overflow-x-hidden overscroll-contain",
                phoneZoomActive ? "flex-1" : "flex-[0_1_auto]",
                phoneScrollAreaClass,
              )}
            >
              <div
                key={contentKey}
                // h-full so a flow panel can fill the screen exactly.
                className="w-full h-full flex flex-col gap-4 animate-flow-fade-in"
              >
                {/* The retained button already names the flow; title the rest. */}
                {phoneZoomActive && !hasOwnButton && (
                  <h2 className="text-base font-bold m-0">
                    {activeSection === "reports" ? "Transactions" : "Send to Many"}
                  </h2>
                )}
                {children}
              </div>
              {/* Reopened while still fading out: the live copy wins. */}
              {exiting && exiting.key !== contentKey && (
                <div
                  key={exiting.key}
                  inert
                  aria-hidden="true"
                  className="absolute inset-x-0 top-3 flex flex-col gap-4 pointer-events-none animate-flow-fade-out"
                  onAnimationEnd={(e) => {
                    if (e.target === e.currentTarget) setExiting(null);
                  }}
                >
                  {exiting.node}
                </div>
              )}
            </div>
            {/* Home's free height: half below Quick Send, and the header's half
                splits evenly above Send and above the chips. */}
            {!phoneZoomActive && <span aria-hidden="true" className="flex-[1_0_0]" />}
          </div>
        </div>
      </div>
    </div>
  );
}

export default BalanceCard;
