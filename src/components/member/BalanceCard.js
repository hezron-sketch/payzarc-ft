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

const balanceCardClass =
  "relative bg-card rounded-[calc(var(--r)-8px)] max-[768px]:rounded-[29px] flex-1 min-h-0 max-[768px]:flex-none max-[768px]:h-auto flex flex-col shadow-[inset_0_1px_0_rgba(255,255,255,0.1),inset_0_0_0_1px_rgba(255,255,255,0.04),inset_0_28px_46px_-30px_rgba(255,255,255,0.08),inset_20px_0_36px_-32px_rgba(255,255,255,0.06),inset_-20px_0_36px_-32px_rgba(255,255,255,0.06)]";
const phoneBezelClass =
  "relative flex flex-col w-[clamp(300px,calc((100vh-150px)*9/19.5),360px)] aspect-[9/19.5] mx-auto lg:ml-0 max-[768px]:scroll-mt-[calc(var(--topbar-h)+8px)] origin-top transition-transform duration-300 ease-in-out [--r:44px] rounded-[var(--r)] border-[0.5px] border-[rgba(var(--gold-rgb),0.16)] p-[8px] max-[768px]:w-full max-[768px]:aspect-auto max-[768px]:rounded-none max-[768px]:border-none max-[768px]:bg-transparent max-[768px]:p-0 max-[768px]:shadow-none";
const phoneNotchClass =
  "top-0 w-[40%] h-[22px] rounded-b-[14px] max-[768px]:hidden";
const phoneScrollAreaClass =
  "supports-[-moz-appearance:none]:[scrollbar-width:thin] supports-[-moz-appearance:none]:[scrollbar-color:rgba(var(--gold-rgb),0.35)_transparent] [&::-webkit-scrollbar]:w-[3px] [&::-webkit-scrollbar]:h-0 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-[rgba(var(--gold-rgb),0.35)] [&::-webkit-scrollbar-thumb:hover]:bg-[rgba(var(--gold-rgb),0.55)]";

const goldPillBtnClass =
  "flex items-center justify-center gap-2 w-[140px] h-11 rounded-md text-[0.85rem] font-semibold cursor-pointer text-black bg-gradient-to-b from-gold to-gold-dark transition-colors duration-200 hover:brightness-110";
const flatPillBtnClass =
  "flex items-center justify-center gap-2 w-[140px] h-11 rounded-md text-[0.85rem] font-semibold cursor-pointer text-foreground bg-white/[0.06] border border-white/[0.1] transition-colors duration-200 hover:bg-white/[0.1]";

const EDGE_OVERHANG = 48; // px of each 140px pill outside the screen
const PILL_GAP = 29;
const PILL_H = 44;
const TUCK_ZONE = 72;
const TUCK_INSET = 12;
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
    // The screen scrolls behind the frosted header and tab bar, so the
    // visible band the pills live in is between those bars, not main's box.
    const header = scroller.parentElement.querySelector(":scope > header");
    const tabBar = scroller.parentElement.querySelector("[data-bottom-nav]");
    let raf;
    const tick = () => {
      const b = bezel.getBoundingClientRect();
      const r = row.getBoundingClientRect();
      const box = scroller.getBoundingClientRect();
      const m = {
        top: header ? header.getBoundingClientRect().bottom : box.top,
        bottom: tabBar ? tabBar.getBoundingClientRect().top : box.bottom,
      };
      // Never hang past the browser window on a narrow real phone.
      const out = Math.max(0, Math.min(EDGE_OVERHANG, b.left - 4));
      const place = (el, top, side) => {
        if (!el) return;
        const t = top - b.top;
        const edgeDist = Math.min(top - m.top, m.bottom - (top + PILL_H));
        const p = Math.min(1, Math.max(0, edgeDist / TUCK_ZONE));
        const ease = p * p * (3 - 2 * p); // smoothstep: no kink at either end
        const hang = -TUCK_INSET + (out + TUCK_INSET) * ease;
        el.style.top = `${t}px`;
        el.style.left = side === "left" ? `${8 - hang}px` : "auto";
        el.style.right = side === "right" ? `${8 - hang}px` : "auto";
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

            <div
              ref={rowRef}
              className="relative w-full flex items-center justify-center gap-2 mb-2"
            >
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
                      "flex z-10 items-center justify-center gap-2 w-[140px] h-11 rounded-md whitespace-nowrap cursor-pointer text-[0.85rem] font-semibold transition-ui duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] shadow-[0_10px_24px_-8px_rgba(0,0,0,0.6)] [@media(hover:hover)_and_(pointer:fine)]:hover:-translate-y-0.5 [@media(hover:hover)_and_(pointer:fine)]:hover:shadow-[0_16px_30px_-10px_rgba(0,0,0,0.65)] active:scale-[0.96] active:duration-100",
                      "absolute",
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
