import React, { useState, useRef, useEffect, useLayoutEffect } from "react";
import { createPortal } from "react-dom";
import {
  BrowserRouter,
  Routes,
  Route,
  useNavigate,
  useLocation,
} from "react-router-dom";
import Register from "./components/member/Register";
import Login from "./components/member/Login";
import SetPassword from "./components/member/SetPassword";
import ResetPassword from "./components/member/ResetPassword";
import SetNewPassword from "./components/member/SetNewPassword";
import Dashboard from "./components/member/Dashboard";
import ProtectedRoute from "./components/ProtectedRoute";
import { NotFound, ErrorBoundary } from "./components/StatusPages";
import { cn } from "@/lib/utils";
import {
  ChevronRight,
  Send,
  Globe,
  ShieldCheck,
  UsersRound,
  Zap,
  Percent,
  CircleHelp,
  Mail,
  Phone,
  MapPin,
  CircleCheck,
  ChevronDown,
} from "lucide-react";
import { EXCHANGE_RATES } from "./utility/exchangeRates";
import {
  PRO_PLAN_PRICE,
  GLOBAL_AVG_REMITTANCE_COST,
  GLOBAL_AVG_SOURCE_URL,
} from "./utility/constants";
import { countries } from "./utility/countries";
import { calcTransferFee } from "./components/member/transferCore";
import { isValidEmail, isSafeText } from "./utility/validators";
import {
  PhoneMockup,
  psHeaderClass,
  psLogoClass,
  psDotsClass,
  psDotClass,
  psGreetingClass,
  psNameClass,
  psBalanceCardClass,
  psBalLabelClass,
  psBalAmountClass,
  phoneBezelColorClass,
  phoneNotchBaseClass,
  phoneModalOpenClass,
  phoneModalShadowClass,
} from "./components/PhoneMockup";

const COUNTRIES = {
  "United States": "USD",
  Kenya: "KES",
  India: "INR",
  Nigeria: "NGN",
  Ghana: "GHS",
  Uganda: "UGX",
  "United Kingdom": "GBP",
  Canada: "CAD",
  Australia: "AUD",
  "South Africa": "ZAR",
  Germany: "EUR",
  France: "EUR",
  Japan: "JPY",
  China: "CNY",
  Brazil: "BRL",
};

const QUICK_DESTINATIONS = [
  { flag: "🇰🇪", name: "Kenya", currency: "KES", country: "Kenya", symbol: "KSh " },
  { flag: "🇳🇬", name: "Nigeria", currency: "NGN", country: "Nigeria", symbol: "₦" },
  { flag: "🇮🇳", name: "India", currency: "INR", country: "India", symbol: "₹" },
  { flag: "🇬🇭", name: "Ghana", currency: "GHS", country: "Ghana", symbol: "GH₵" },
];

// Every currency Payzarc can deliver in, straight from the country list —
// the "anywhere" claim on the page is counted, not written by hand.
const SUPPORTED_CURRENCIES = [...new Set(countries.map((c) => c.currency))].sort();
const SUPPORTED_COUNTRY_COUNT = countries.length;
const HIGHLIGHT_CURRENCIES = new Set([
  "USD", "GBP", "EUR",
  ...QUICK_DESTINATIONS.map((d) => d.currency),
]);

const surfaceClass =
  "bg-white/[0.03] backdrop-blur-[8px] border-[0.5px] border-border rounded-[20px]";
const formatUsd = (n) =>
  `$${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const formatPct = (r) => `${+(r * 100).toFixed(2)}%`;

function pickHeroDestination(excludeCurrency) {
  const pool = QUICK_DESTINATIONS.filter((d) => d.currency !== excludeCurrency);
  return pool[Math.floor(Math.random() * pool.length)];
}

const phoneStageBackdropClass =
  "fixed inset-0 z-[1000] flex items-center justify-center px-4 py-8 [perspective:1200px] bg-[rgba(6,8,14,0)] [backdrop-filter:blur(0px)] [-webkit-backdrop-filter:blur(0px)] transition-[background,backdrop-filter] duration-[320ms] ease-[cubic-bezier(0.22,1,0.36,1)]";
const phoneStageBackdropOpenClass =
  "bg-[rgba(6,8,14,0.62)] [backdrop-filter:blur(7px)] [-webkit-backdrop-filter:blur(7px)]";
const phoneStagePanelShadowClosedClass =
  "shadow-[0_1px_2px_rgba(0,0,0,0.35),0_6px_16px_-4px_rgba(0,0,0,0.35),0_20px_40px_-16px_rgba(0,0,0,0.45)]";
const phoneStagePanelClass =
  "fixed flex flex-col p-[8px] border-[1.5px] border-white/10 overflow-hidden rounded-[var(--r)] [mask-image:radial-gradient(white,black)] [-webkit-mask-image:-webkit-radial-gradient(white,black)] z-[1001] [transition:top_0.32s_cubic-bezier(0.16,1,0.3,1),left_0.32s_cubic-bezier(0.16,1,0.3,1),width_0.32s_cubic-bezier(0.16,1,0.3,1),height_0.32s_cubic-bezier(0.16,1,0.3,1),border-radius_0.32s_cubic-bezier(0.16,1,0.3,1),border-width_0.32s_cubic-bezier(0.16,1,0.3,1),transform_0.32s_cubic-bezier(0.16,1,0.3,1),box-shadow_0.32s_ease,background_0.32s_ease,border-color_0.32s_ease]";
const phoneStageNotchClass =
  "top-[8px] w-[40%] h-[22px] rounded-b-[14px]";
// Screen radius = panel radius (--r) − 8px bezel, keeping corners concentric.
const phoneStageScreenClass =
  "relative flex-1 bg-card rounded-[calc(var(--r)-8px)] [transition:border-radius_0.32s_cubic-bezier(0.16,1,0.3,1)] overflow-y-auto overflow-x-hidden [scrollbar-width:thin] [scrollbar-color:rgba(255,255,255,0.12)_transparent] [&::-webkit-scrollbar]:w-[5px] [&::-webkit-scrollbar-thumb]:bg-white/[0.12] [&::-webkit-scrollbar-thumb]:rounded";
const phoneStagePreviewClass =
  "absolute inset-0 pt-[30px] pb-[10px] px-2 flex flex-col gap-[7px] opacity-100 transition-opacity duration-[320ms] ease-in-out pointer-events-none";
const phoneStagePreviewHideClass = "opacity-0";
const phoneStageContentClass =
  "px-[1.35rem] pt-[2.75rem] pb-[1.85rem] opacity-0 translate-y-[10px] transition-[opacity,transform] duration-[220ms] ease-in-out";
const phoneStageContentShowClass = "opacity-100 translate-y-0 delay-100";

const NAV_LINKS = [
  { label: "Home", to: "/" },
  { label: "Features", to: "/features" },
  { label: "Rates", to: "/rates" },
  { label: "Help", to: "/help" },
  { label: "Contact", to: "/contact" },
];

function Navbar() {
  const navigate = useNavigate();
  const { pathname } = useLocation();

  return (
    <nav className="border-b-[0.5px] border-border sticky top-0 bg-[rgba(13,17,23,0.72)] [backdrop-filter:blur(20px)_saturate(1.8)] [-webkit-backdrop-filter:blur(20px)_saturate(1.8)] z-[100]">
      <div className="relative flex items-center justify-between max-w-[1120px] mx-auto px-8 py-4 max-[768px]:px-5">
        <div className="flex items-center gap-9">
          <div className="flex items-center gap-2">
            <div className="w-[60px] h-[30px] rounded-sm flex items-center justify-center flex-shrink-0">
              <img
                src="/images/payzarc.png"
                className="h-8 w-20"
                alt="Payzarc-logo"
              />
            </div>
          </div>
        </div>
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex gap-1 max-[768px]:hidden">
          {NAV_LINKS.map((l) => {
            const active = pathname === l.to;
            return (
              <button
                key={l.label}
                type="button"
                onClick={() => navigate(l.to)}
                className={cn(
                  "bg-transparent border-0 rounded-md px-3.5 py-1 text-[13px] no-underline transition-colors duration-200 cursor-pointer",
                  active
                    ? "text-gold bg-gold/10 font-semibold"
                    : "text-[var(--muted)] hover:text-foreground",
                )}
              >
                {l.label}
              </button>
            );
          })}
        </div>
        <button
          className="group inline-flex items-center gap-1.5 bg-gold text-[#111] border-none rounded-md px-[1.3rem] py-[0.4rem] text-[13px] font-bold cursor-pointer transition-[background,transform] duration-200 hover:bg-gold-dark hover:-translate-y-0.5"
          onClick={() => navigate("/login")}
        >
          Login{" "}
          <ChevronRight
            size={14}
            className="transition-transform duration-200 group-hover:translate-x-0.5"
          />
        </button>
      </div>
    </nav>
  );
}

function PhoneAuthStage({ overlay, onClose, mockupRef }) {
  const anchorRef = useRef(null);
  const closeTimerRef = useRef(null);
  const [rect, setRect] = useState(null);
  // closed -> opening -> open -> closing -> closed
  const [phase, setPhase] = useState("closed");

  useLayoutEffect(() => {
    if (overlay && phase === "closed") {
      const node = anchorRef.current;
      const r = node.getBoundingClientRect();
      // offsetWidth ignores transforms, so this is the mockup's scale().
      const scale = r.width / node.offsetWidth;
      setRect({ top: r.top, left: r.left, width: r.width, height: r.height, scale });
      setPhase("opening");
    }
  }, [overlay, phase]);

  useEffect(() => {
    if (phase !== "opening") return undefined;
    const id = requestAnimationFrame(() =>
      requestAnimationFrame(() => setPhase("open")),
    );
    return () => cancelAnimationFrame(id);
  }, [phase]);

  useEffect(() => {
    if (overlay) return undefined;
    if (phase !== "open" && phase !== "opening") return undefined;
    const node = anchorRef.current;
    const r = node.getBoundingClientRect();
    const scale = r.width / node.offsetWidth;
    setRect({ top: r.top, left: r.left, width: r.width, height: r.height, scale });
    setPhase("closing");
    return undefined;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [overlay]);

  useEffect(() => {
    if (phase !== "closing") return undefined;
    closeTimerRef.current = setTimeout(() => setPhase("closed"), 320);
    return () => clearTimeout(closeTimerRef.current);
  }, [phase]);
  const isActive = phase !== "closed";
  const isExpanded = phase === "open";

  useEffect(() => {
    if (!isActive) return undefined;
    const onKeyDown = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isActive, onClose]);

  useEffect(() => {
    if (!isActive) return undefined;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [isActive]);

  const panelStyle =
    rect && !isExpanded
      ? {
          top: rect.top,
          left: rect.left,
          width: rect.width,
          height: rect.height,
          transform: "none",
          "--r": `${30 * rect.scale}px`,
        }
      : undefined;

  return (
    <>
      <PhoneMockup
        ref={(node) => {
          anchorRef.current = node;
          if (mockupRef) mockupRef.current = node;
        }}
        hidden={isActive}
      />

      {isActive &&
        createPortal(
          <div
            className={cn(
              phoneStageBackdropClass,
              isExpanded && phoneStageBackdropOpenClass,
            )}
            onMouseDown={(e) => {
              if (e.target === e.currentTarget) onClose();
            }}
          >
            <div
              className={cn(
                phoneStagePanelClass,
                phoneBezelColorClass,
                isExpanded
                  ? cn(phoneModalOpenClass, phoneModalShadowClass)
                  : phoneStagePanelShadowClosedClass,
              )}
              style={panelStyle}
            >
              <button
                type="button"
                className={cn(
                  "absolute top-[20px] right-[20px] z-[2] w-[30px] h-[30px] flex items-center justify-center bg-white/[0.06] border-[0.5px] border-white/[0.12] rounded-full text-[#9ca3af] cursor-pointer transition-[opacity,background,color,transform] duration-200 hover:bg-white/[0.12] hover:text-[#f9fafb] hover:rotate-90",
                  isExpanded
                    ? "opacity-100 delay-150"
                    : "opacity-0 pointer-events-none",
                )}
                onClick={onClose}
                aria-label="Close"
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>

              <div className={cn(phoneNotchBaseClass, phoneStageNotchClass)} />

              <div className={phoneStageScreenClass}>
                <div
                  className={cn(
                    phoneStagePreviewClass,
                    isExpanded && phoneStagePreviewHideClass,
                  )}
                >
                  <div className={psHeaderClass}>
                    <div className={psLogoClass} />
                    <div className={psDotsClass}>
                      <div className={psDotClass} />
                      <div className={psDotClass} />
                      <div className={psDotClass} />
                    </div>
                  </div>
                  <div className={psGreetingClass}>Hello,</div>
                  <div className={psNameClass}>Elaine W.</div>
                  <div className={psBalanceCardClass}>
                    <div className={psBalLabelClass}>Wallet balance</div>
                    <div className={psBalAmountClass}>$4,820.00</div>
                  </div>
                </div>

                <div
                  className={cn(
                    phoneStageContentClass,
                    isExpanded && phoneStageContentShowClass,
                  )}
                >
                  <div key={overlay} className="animate-flow-fade-in">
                    {overlay === "login" && (
                      <Login onBack={onClose} embedded compact />
                    )}
                    {overlay === "register" && (
                      <Register onBack={onClose} embedded compact />
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}

function FloatCard({ side, iconBg, icon, label, value, sub }) {
  return (
    <div
      className={cn(
        "absolute bg-secondary border-[0.5px] border-input rounded-2xl py-[10px] px-[14px] flex items-center gap-2.5 z-[3] whitespace-nowrap max-[768px]:px-[10px] max-[768px]:py-2",
        side === "left"
          ? "left-0 top-[55px] max-[768px]:-left-[10px] max-[768px]:top-10"
          : "right-0 top-[95px] max-[768px]:-right-[10px] max-[768px]:top-20",
      )}
    >
      <div
        className="w-[38px] h-[38px] rounded-[10px] flex items-center justify-center flex-shrink-0"
        style={{ background: iconBg }}
      >
        {icon}
      </div>
      <div>
        <div className="text-[10px] text-[var(--muted)]">{label}</div>
        <div className="text-[15px] font-bold text-foreground max-[768px]:text-[13px]">
          {value}
        </div>
        <div className="text-[10px] text-[var(--muted)]">{sub}</div>
      </div>
    </div>
  );
}

const HERO_SEND_AMOUNT = 2000;

function Hero({ overlay, onCloseAuth }) {
  const navigate = useNavigate();
  const mockupNodeRef = useRef(null);
  const heroRef = useRef(null);

  // The hero is exactly one screen tall and pinned (sticky); as the story
  // scrolls up over it, it recedes — shrinks, blurs and fades with scroll
  // progress. Styles are written straight to the node: no re-render per frame.
  useLayoutEffect(() => {
    const hero = heroRef.current;
    const scroller = hero.closest("[data-landing-scroller]");
    if (!scroller) return undefined;
    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    let raf = 0;
    const apply = () => {
      raf = 0;
      const h = scroller.clientHeight;
      hero.style.height = `${h}px`;
      // Shared with Story so it's exactly one screen too.
      scroller.style.setProperty("--screen-h", `${h}px`);
      const p = Math.min(1, Math.max(0, scroller.scrollTop / h));
      hero.style.opacity = p ? String(1 - p * 0.75) : "";
      // Reduced motion keeps the fade (it aids comprehension), drops the rest.
      if (!reduceMotion) {
        hero.style.transform = p ? `scale(${1 - p * 0.12})` : "";
        hero.style.filter = p ? `blur(${(p * 10).toFixed(2)}px)` : "";
      }
    };
    const schedule = () => {
      if (!raf) raf = requestAnimationFrame(apply);
    };
    apply();
    scroller.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    return () => {
      cancelAnimationFrame(raf);
      scroller.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
    };
  }, []);

  const [sendDest, setSendDest] = useState(QUICK_DESTINATIONS[0]);
  const [receiveDest, setReceiveDest] = useState(QUICK_DESTINATIONS[2]);
  const sendDestRef = useRef(sendDest);
  const receiveDestRef = useRef(receiveDest);
  sendDestRef.current = sendDest;
  receiveDestRef.current = receiveDest;

  useEffect(() => {
    let tick = 0;
    const id = setInterval(() => {
      tick += 1;
      if (tick % 2 === 1) {
        setReceiveDest(pickHeroDestination(sendDestRef.current.currency));
      } else {
        setSendDest(pickHeroDestination(receiveDestRef.current.currency));
      }
    }, 5000);
    return () => clearInterval(id);
  }, []);

  const sendRate = EXCHANGE_RATES.USD[sendDest.currency];
  const receiveRate = EXCHANGE_RATES.USD[receiveDest.currency];
  const receiveAmount = Math.round(HERO_SEND_AMOUNT * receiveRate);

  return (
    // Spacing and title size track viewport height so the whole hero fits
    // one screen; the phone fills what's left and is cropped at the bottom.
    <section
      ref={heroRef}
      className="sticky top-0 flex flex-col items-center text-center overflow-hidden px-8 pt-[clamp(1.25rem,6vh,4rem)] origin-[50%_30%] will-change-transform"
    >
      <h1 className="text-[clamp(2.5rem,min(8vw,9vh),5rem)] font-bold tracking-[2px] text-gold text-center leading-[1.05] flex p-0 max-[768px]:text-[34px]">
        PAYZARC
      </h1>

      <h2 className="text-[2rem] font-bold leading-[1.1] tracking-[-1.5px] text-foreground max-w-[520px] mx-12 my-[clamp(1rem,5vh,3rem)] max-[768px]:text-lg max-[768px]:mx-4">
        Send money anywhere
        <br />
        at <span className="text-gold">Lower Rates</span>
      </h2>

      <p className="text-[1.3rem] text-[var(--muted)] max-w-[440px] leading-[1.7] mb-[clamp(1rem,3.5vh,2rem)] max-[768px]:text-sm">
        One flat 1.5% fee, shown before you send — the global average is{" "}
        {formatPct(GLOBAL_AVG_REMITTANCE_COST)}. Live rates in{" "}
        {SUPPORTED_CURRENCIES.length} currencies, so more of every transfer
        arrives.
      </p>

      <div className="flex items-center gap-5 mb-[clamp(1.5rem,6vh,3.5rem)] max-[480px]:flex-col max-[480px]:items-stretch max-[480px]:gap-3">
        <button
          className="inline-flex items-center justify-center gap-2 bg-gold text-[#111] border-none rounded-md py-2 px-7 text-2xl font-semibold cursor-pointer transition-[background,transform] duration-200 hover:bg-gold-dark hover:-translate-y-px max-[768px]:text-lg"
          onClick={() => navigate("/register")}
        >
          Get started <ChevronRight />
        </button>
        {/* Rates before sign-up: the price is the pitch, so it's never gated. */}
        <button
          type="button"
          className="bg-transparent border-0 p-0 text-[15px] font-semibold text-[var(--soft)] underline decoration-white/20 underline-offset-[6px] cursor-pointer transition-colors duration-200 hover:text-gold hover:decoration-gold/50"
          onClick={() => navigate("/rates")}
        >
          Check today's rate
        </button>
      </div>

      <div className="relative w-full max-w-[680px] flex-1 min-h-[160px] flex items-start justify-center [perspective:1400px]">
        <FloatCard
          side="left"
          iconBg="rgba(59,130,246,0.15)"
          icon={
            <svg width="20" height="14" viewBox="0 0 32 22" fill="none">
              <rect width="32" height="22" rx="3" fill="#003087" />
              <circle cx="13" cy="11" r="6" fill="#EB001B" />
              <circle cx="19" cy="11" r="6" fill="#F79E1B" />
              <path d="M16 6.5a6 6 0 010 9 6 6 0 010-9z" fill="#FF5F00" />
            </svg>
          }
          label="You send"
          value={`$${HERO_SEND_AMOUNT.toLocaleString()}`}
          sub={`fee ${formatUsd(calcTransferFee(HERO_SEND_AMOUNT))} · 1 USD = ${sendRate} ${sendDest.currency}`}
        />

        <PhoneAuthStage
          overlay={overlay}
          onClose={onCloseAuth}
          mockupRef={mockupNodeRef}
        />

        <FloatCard
          side="right"
          iconBg="rgba(74,222,128,0.1)"
          icon={<span className="text-lg leading-none">{receiveDest.flag}</span>}
          label="They receive"
          value={`${receiveDest.symbol}${receiveAmount.toLocaleString()}`}
          sub={`${receiveDest.currency} · nothing taken off the rate`}
        />
      </div>
    </section>
  );
}

// The $200 benchmark the World Bank measures every provider against.
const BENCHMARK_AMOUNT = 200;

function FeeComparison() {
  const ours = calcTransferFee(BENCHMARK_AMOUNT);
  const average = BENCHMARK_AMOUNT * GLOBAL_AVG_REMITTANCE_COST;
  const rows = [
    {
      label: "Global average",
      rate: GLOBAL_AVG_REMITTANCE_COST,
      fee: average,
      barClass: "bg-white/[0.14]",
    },
    {
      label: "Payzarc",
      rate: ours / BENCHMARK_AMOUNT,
      fee: ours,
      barClass: "bg-gold",
      highlight: true,
    },
  ];
  return (
    <div className={cn(surfaceClass, "p-6 flex flex-col gap-5")}>
      <div>
        <span className="text-[11px] font-semibold text-[var(--muted)] uppercase tracking-[0.6px]">
          Cost to send {formatUsd(BENCHMARK_AMOUNT)}
        </span>
        <p className="text-[22px] font-bold text-foreground tracking-[-0.5px] mt-1 m-0">
          You keep{" "}
          <span className="text-gold tabular-nums">
            {formatUsd(average - ours)}
          </span>{" "}
          more
        </p>
      </div>
      <dl className="flex flex-col gap-4 m-0">
        {rows.map((r) => (
          <div key={r.label} className="flex flex-col gap-1.5">
            <div className="flex items-baseline justify-between text-[13px]">
              <dt
                className={cn(
                  r.highlight ? "text-foreground font-semibold" : "text-[var(--soft)]",
                )}
              >
                {r.label}
              </dt>
              <dd className="m-0 tabular-nums text-foreground font-semibold">
                {formatUsd(r.fee)}
                <span className="ml-1.5 text-[var(--muted)] font-normal">
                  {formatPct(r.rate)}
                </span>
              </dd>
            </div>
            <div className="h-1.5 rounded-full bg-white/[0.04] overflow-hidden">
              <div
                className={cn("h-full rounded-full", r.barClass)}
                style={{ width: `${(r.fee / average) * 100}%` }}
              />
            </div>
          </div>
        ))}
      </dl>
      <p className="text-[11px] text-[var(--muted)] leading-[1.5] m-0">
        Average total cost of sending {formatUsd(BENCHMARK_AMOUNT)}, per the{" "}
        <a
          href={GLOBAL_AVG_SOURCE_URL}
          target="_blank"
          rel="noreferrer"
          className="text-[var(--soft)] underline decoration-white/20 underline-offset-2 hover:text-gold"
        >
          World Bank, Q1 2025
        </a>
        . Payzarc's fee is 1.5%, $1 minimum, never folded into the rate.
      </p>
    </div>
  );
}

function CurrencyWall() {
  return (
    <div className={cn(surfaceClass, "p-6 flex flex-col gap-4")}>
      <div>
        <span className="text-[11px] font-semibold text-[var(--muted)] uppercase tracking-[0.6px]">
          Where your money can go
        </span>
        <p className="text-[22px] font-bold text-foreground tracking-[-0.5px] mt-1 m-0">
          <span className="text-gold tabular-nums">
            {SUPPORTED_CURRENCIES.length}
          </span>{" "}
          currencies, {SUPPORTED_COUNTRY_COUNT} countries
        </p>
      </div>
      {/* Set as type, not chips: the density itself is the message. */}
      <p
        className="m-0 text-[11px] leading-[2] tracking-[0.12em] tabular-nums text-[var(--muted)] [word-spacing:0.35em]"
        aria-label={`Supported currencies: ${SUPPORTED_CURRENCIES.join(", ")}`}
      >
        {SUPPORTED_CURRENCIES.map((ccy) => (
          <span
            key={ccy}
            aria-hidden="true"
            className={cn(
              "inline-block mr-[0.6em]",
              HIGHLIGHT_CURRENCIES.has(ccy) && "text-gold font-semibold",
            )}
          >
            {ccy}
          </span>
        ))}
      </p>
    </div>
  );
}

// One idea per line: what you keep, then how a transfer goes.
const STORY_STEPS = [
  { title: "See the rate", note: "before you sign up" },
  { title: "Pick anyone", note: `in ${SUPPORTED_CURRENCIES.length} currencies` },
  { title: "See the fee", note: "on its own line" },
  { title: "Watch it land", note: "sent → delivered" },
];

function Story() {
  const navigate = useNavigate();
  const ours = calcTransferFee(BENCHMARK_AMOUNT);
  const average = BENCHMARK_AMOUNT * GLOBAL_AVG_REMITTANCE_COST;
  const bars = [
    { label: "Global average", fee: average, barClass: "bg-white/[0.16]" },
    { label: "Payzarc", fee: ours, barClass: "bg-gold", strong: true },
  ];
  return (
    // Frosted like the footer; z-10 so it slides up over the pinned hero.
    // One screen tall, content centred in it.
    <section className="relative z-10 min-h-[var(--screen-h,100vh)] flex items-center bg-[rgba(13,17,23,0.85)] backdrop-blur-[12px] border-t-[0.5px] border-border px-8 py-16 max-[768px]:px-5 max-[768px]:py-14">
      <div className="w-full max-w-[1120px] mx-auto flex flex-col gap-[clamp(2.5rem,8vh,5rem)]">
        <div className="grid grid-cols-[1.15fr_1fr] gap-20 items-center max-[900px]:grid-cols-1 max-[900px]:gap-12">
          <div>
            <span className="text-[11px] font-bold tracking-[3px] text-gold uppercase">
              Why Payzarc
            </span>
            <h2 className="text-[clamp(2rem,4.5vw,3.25rem)] font-bold tracking-[-1.5px] leading-[1.05] text-foreground mt-3 mb-4">
              Send {formatUsd(BENCHMARK_AMOUNT).replace(".00", "")}.
              <br />
              Keep <span className="text-gold">{formatUsd(average - ours)}</span>{" "}
              more.
            </h2>
            <p className="text-[15px] text-[var(--muted)] m-0 mb-8">
              One flat 1.5% fee. The world average is{" "}
              {formatPct(GLOBAL_AVG_REMITTANCE_COST)}.
            </p>
            <dl className="flex flex-col gap-3.5 max-w-[440px] m-0">
              {bars.map((b) => (
                <div key={b.label} className="flex flex-col gap-1.5">
                  <div className="flex justify-between text-[13px]">
                    <dt className={b.strong ? "text-foreground font-semibold" : "text-[var(--soft)]"}>
                      {b.label}
                    </dt>
                    <dd className="m-0 tabular-nums text-foreground">
                      {formatUsd(b.fee)}
                    </dd>
                  </div>
                  <div className="h-1 rounded-full bg-white/[0.04] overflow-hidden">
                    <div
                      className={cn("h-full rounded-full", b.barClass)}
                      style={{ width: `${(b.fee / average) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </dl>
            <p className="text-[11px] text-[var(--muted)] mt-4 m-0">
              Cost to send {formatUsd(BENCHMARK_AMOUNT)} ·{" "}
              <a
                href={GLOBAL_AVG_SOURCE_URL}
                target="_blank"
                rel="noreferrer"
                className="underline decoration-white/20 underline-offset-2 hover:text-gold"
              >
                World Bank, Q1 2025
              </a>
            </p>
          </div>

          <ol className="list-none m-0 p-0 border-t-[0.5px] border-border">
            {STORY_STEPS.map((step, i) => (
              <li
                key={step.title}
                className="flex items-baseline gap-5 py-5 border-b-[0.5px] border-border"
              >
                <span className="text-[11px] font-semibold text-gold tabular-nums tracking-[0.12em] w-5 shrink-0">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span className="flex-1 text-[17px] font-semibold text-foreground">
                  {step.title}
                </span>
                <span className="text-[13px] text-[var(--muted)] text-right">
                  {step.note}
                </span>
              </li>
            ))}
          </ol>
        </div>

        <div className="flex items-center justify-between gap-6 max-[640px]:flex-col max-[640px]:items-start">
          <p className="text-[13px] text-[var(--muted)] m-0 tabular-nums">
            <span className="text-foreground font-semibold">
              {SUPPORTED_CURRENCIES.length}
            </span>{" "}
            currencies ·{" "}
            <span className="text-foreground font-semibold">
              {SUPPORTED_COUNTRY_COUNT}
            </span>{" "}
            countries
          </p>
          <button
            type="button"
            className="inline-flex items-center gap-1.5 bg-gold text-[#111] border-none rounded-md px-6 py-2.5 text-[15px] font-bold cursor-pointer transition-[background,transform] duration-200 hover:bg-gold-dark hover:-translate-y-0.5 shrink-0"
            onClick={() => navigate("/register")}
          >
            Create free account <ChevronRight size={16} />
          </button>
        </div>
      </div>
    </section>
  );
}

function isValidAmount(val) {
  const n = parseFloat(val);
  return !isNaN(n) && n >= 1 && n <= 1000000;
}

function Converter() {
  const navigate = useNavigate();
  const [fromCountry, setFromCountry] = useState("");
  const [toCountry, setToCountry] = useState("");
  const [fromValue, setFromValue] = useState("");
  const [toValue, setToValue] = useState("");

  const calculate = (from, to, amount) => {
    if (!from || !to || !isValidAmount(amount)) {
      setToValue("");
      return;
    }
    const fromCcy = COUNTRIES[from];
    const toCcy = COUNTRIES[to];
    const rate = EXCHANGE_RATES[fromCcy]?.[toCcy];
    if (!rate) {
      setToValue("");
      return;
    }
    setToValue((parseFloat(amount) * rate).toFixed(2));
  };

  const handleFrom = (e) => {
    setFromCountry(e.target.value);
    calculate(e.target.value, toCountry, fromValue);
  };

  const handleTo = (e) => {
    setToCountry(e.target.value);
    calculate(fromCountry, e.target.value, fromValue);
  };

  const handleAmount = (e) => {
    const v = e.target.value;
    setFromValue(v);
    if (isValidAmount(v)) {
      calculate(fromCountry, toCountry, v);
    } else {
      setToValue("");
    }
  };

  const handleQuickDest = (dest) => {
    const country = dest.country;
    setToCountry(country);
    calculate(fromCountry, country, fromValue);
  };

  const canSend =
    fromCountry &&
    toCountry &&
    fromValue &&
    isValidAmount(fromValue) &&
    toValue;

  return (
    <div className="py-12 px-10 border-t-[0.5px] border-border max-w-[600px] mx-auto max-[768px]:py-8 max-[768px]:px-5">
      <h2 className="text-[26px] font-bold text-foreground tracking-[-0.5px] mb-[0.3rem]">
        Calculate your transfer
      </h2>
      <p className="text-[14px] text-[var(--muted)] mb-6">
        An indicative quote now; the exact live rate is shown before you
        confirm.
      </p>

      <div className="bg-white/[0.03] backdrop-blur-[8px] border-[0.5px] border-border rounded-[20px] p-6 flex flex-col gap-4">
        <span className="text-[11px] font-semibold text-[var(--muted)] uppercase tracking-[0.6px]">
          Exchange calculator
        </span>

        <div className="flex gap-3">
          <select
            className="flex-1 py-[0.7rem] px-[0.875rem] bg-white/[0.06] text-foreground border-[0.5px] border-white/10 rounded-[10px] text-[13px] outline-none cursor-pointer appearance-none transition-colors duration-200 focus:border-gold"
            value={fromCountry}
            onChange={handleFrom}
          >
            <option value="" style={{ background: "#1f2937" }}>
              From country
            </option>
            {Object.keys(COUNTRIES).map((c) => (
              <option key={c} value={c} style={{ background: "#1f2937" }}>
                {c} ({COUNTRIES[c]})
              </option>
            ))}
          </select>
          <select
            className="flex-1 py-[0.7rem] px-[0.875rem] bg-white/[0.06] text-foreground border-[0.5px] border-white/10 rounded-[10px] text-[13px] outline-none cursor-pointer appearance-none transition-colors duration-200 focus:border-gold"
            value={toCountry}
            onChange={handleTo}
          >
            <option value="" style={{ background: "#1f2937" }}>
              To country
            </option>
            {Object.keys(COUNTRIES).map((c) => (
              <option key={c} value={c} style={{ background: "#1f2937" }}>
                {c} ({COUNTRIES[c]})
              </option>
            ))}
          </select>
        </div>

        <input
          type="number"
          className="w-full p-4 bg-white/[0.06] text-foreground border-[0.5px] border-white/10 rounded-xl text-[22px] font-bold text-center outline-none transition-colors duration-200 focus:border-gold placeholder:text-[var(--muted)] placeholder:text-[15px] placeholder:font-normal [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
          placeholder="Enter amount"
          value={fromValue}
          onChange={handleAmount}
          min="1"
          max="1000000"
        />

        {toValue && (
          <div className="bg-[var(--gold-pale)] border border-dashed border-[var(--gold-border)] rounded-xl p-4 text-center">
            <div className="text-[28px] font-bold text-gold tracking-[-0.5px]">
              {Number(toValue).toLocaleString()} {COUNTRIES[toCountry]}
            </div>
            <div className="text-[11px] text-[rgba(var(--gold-rgb),0.5)] mt-[3px] tracking-[0.2px]">
              1 {COUNTRIES[fromCountry]} ={" "}
              {EXCHANGE_RATES[COUNTRIES[fromCountry]]?.[COUNTRIES[toCountry]]}{" "}
              {COUNTRIES[toCountry]} · indicative rate
            </div>
            <div className="text-[12px] text-[var(--soft)] mt-2 tabular-nums">
              Fee {calcTransferFee(parseFloat(fromValue)).toFixed(2)}{" "}
              {COUNTRIES[fromCountry]} (1.5%) · charged on top, not taken off
              what they receive
            </div>
          </div>
        )}

        {canSend && (
          <button
            className="w-full py-[0.65rem] bg-gold text-[#111] border-none rounded-sm text-[15px] font-bold cursor-pointer transition-[background,transform] duration-200 hover:bg-gold-dark hover:-translate-y-px"
            onClick={() => navigate("/login")}
          >
            Send to {toCountry} →
          </button>
        )}
      </div>

      <div className="mt-6">
        <p className="text-[11px] font-semibold text-[var(--muted)] uppercase tracking-[0.6px] mb-3">
          Popular destinations
        </p>
        <div className="grid grid-cols-4 gap-2.5 max-[768px]:grid-cols-2">
          {QUICK_DESTINATIONS.map((d) => (
            <button
              key={d.name}
              className="bg-white/[0.04] border-[0.5px] border-border rounded-[6px] text-[var(--soft)] py-2 px-1 cursor-pointer flex flex-col items-center gap-[5px] transition-colors duration-200 hover:bg-[var(--gold-pale)] hover:border-[var(--gold-border)] hover:text-gold"
              onClick={() => handleQuickDest(d)}
            >
              <span className="text-xl">{d.flag}</span>
              <span className="text-[11px] font-medium">{d.name}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function Footer() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const year = new Date().getFullYear();
  const QUICK_LINKS = [
    { label: "Features", to: "/features" },
    { label: "Rates", to: "/rates" },
    { label: "Help Center", to: "/help" },
    { label: "Contact", to: "/contact" },
  ];

  return (
    <footer className="relative z-10 flex-shrink-0 bg-[rgba(13,17,23,0.85)] backdrop-blur-[12px] border-t-[0.5px] border-border">
      <div className="max-w-[1280px] mx-auto px-6 py-12 max-[768px]:px-5 max-[768px]:py-9">
        <div className="grid grid-cols-[1.3fr_1fr_1fr] gap-10 max-[768px]:grid-cols-1 max-[768px]:gap-8 max-[768px]:text-center">
          <div className="flex flex-col gap-3 max-[768px]:items-center">
            <img
              src="/images/payzarc.png"
              className="h-9 w-auto self-start block max-[768px]:self-center"
              alt="Payzarc"
            />
            <p className="text-[13px] text-[var(--muted)] leading-relaxed max-w-[280px] max-[768px]:max-w-none">
              Send money abroad at industry-leading rates, with no hidden
              fees — your trusted cross-border financial partner.
            </p>
            <div className="flex items-center gap-1.5 text-[11px] text-[var(--muted)] mt-1">
              <ShieldCheck size={14} className="text-gold flex-shrink-0" />
              Bank-grade security · 256-bit encryption
            </div>
          </div>

          <div className="flex flex-col gap-2.5 max-[768px]:items-center">
            <span className="text-[11px] font-semibold text-foreground uppercase tracking-[0.06em] mb-1">
              Company
            </span>
            {QUICK_LINKS.map((l) => (
              <button
                key={l.label}
                type="button"
                onClick={() => navigate(l.to)}
                className={cn(
                  "bg-transparent border-0 p-0 text-left text-[13px] cursor-pointer transition-colors duration-200",
                  pathname === l.to
                    ? "text-gold font-semibold"
                    : "text-[var(--muted)] hover:text-gold",
                )}
              >
                {l.label}
              </button>
            ))}
          </div>

          <div className="flex flex-col gap-2.5 max-[768px]:items-center">
            <span className="text-[11px] font-semibold text-foreground uppercase tracking-[0.06em] mb-1">
              Get in touch
            </span>
            <a
              href="mailto:info.e@payzarc.com"
              className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-gold no-underline"
            >
              <Mail size={13} className="flex-shrink-0" />
              info.e@payzarc.com
            </a>
            <a
              href="tel:+17138228593"
              className="inline-flex items-center gap-1.5 text-[13px] text-[var(--muted)] no-underline transition-colors duration-200 hover:text-foreground"
            >
              <Phone size={13} className="flex-shrink-0" />
              +1 (713) 822-8593
            </a>
            <div className="inline-flex items-start gap-1.5 text-[13px] text-[var(--muted)] max-[768px]:items-center">
              <MapPin size={13} className="mt-0.5 flex-shrink-0 max-[768px]:mt-0" />
              Kew Gardens Dr, Houston TX, USA
            </div>
          </div>
        </div>

        <div className="mt-10 pt-5 border-t-[0.5px] border-border text-center">
          <span className="text-[11px] text-[var(--muted)]">
            © {year} Payzarc. All rights reserved.
          </span>
        </div>
      </div>
    </footer>
  );
}

function PageHeader({ eyebrow, title, subtitle, titleClassName }) {
  return (
    <div className="max-w-[640px] mb-10">
      <span className="text-[11px] font-bold tracking-[3px] text-gold uppercase">
        {eyebrow}
      </span>
      <h1
        className={cn(
          "text-[clamp(1.8rem,4vw,2.6rem)] font-bold tracking-[-1px] text-foreground mt-2 mb-3",
          titleClassName,
        )}
      >
        {title}
      </h1>
      <p className="text-[15px] text-[var(--muted)] leading-[1.6]">
        {subtitle}
      </p>
    </div>
  );
}

const FEATURES_LIST = [
  {
    icon: Send,
    title: "Instant transfers",
    description:
      "Send money to friends and family in seconds, with live status tracking from sent to delivered.",
    details:
      "Every send moves through a real in-transit stepper — Sent, Processing, Delivered — so you always know where a transfer is. Pick a saved recipient or enter a phone number, and send to several friends at once with Send to Many.",
  },
  {
    icon: Globe,
    title: "Live exchange rates",
    description:
      "Transparent, industry-leading FX rates refreshed throughout the day — no hidden markups.",
    details:
      "Use the calculator on the Rates page to get an indicative quote before you send — the rate you see is the rate you get, with the sending fee shown separately instead of folded into the exchange rate.",
  },
  {
    icon: Zap,
    title: "Multi-currency wallet",
    description:
      "Hold and send in KES, NGN, ZAR, EUR, and more, all from one account.",
    details:
      "Your balance is always shown in your account's home currency, with a one-tap toggle to hide it in public. Add money from a linked bank, card, or mobile money account whenever you need to top up.",
  },
  {
    icon: UsersRound,
    title: "Group funds",
    description:
      "Pool money for shared goals — emergencies, weddings, funerals — with friends contributing directly into a fund you control.",
    details:
      "Create a group for a reason, add friends, and each contribution is tracked per member so you can see exactly who put in what. The group total is kept separate from your personal balance and shown right on your dashboard.",
  },
  {
    icon: ShieldCheck,
    title: "Verified & secure",
    description:
      "Camera-based identity verification and bank/card-linked payment methods keep every account verified.",
    details:
      "Verifying your identity is a quick two-step scan — your ID, then a selfie — right from the Account page. Payment methods on file are used to confirm real actions like upgrading to Pro, never stored as a raw card number.",
  },
  {
    icon: Percent,
    title: "Payzarc Pro",
    description: `Unlock unlimited Send to Many and more for just $${PRO_PLAN_PRICE}/mo.`,
    details:
      "The free plan caps Send to Many at a handful of recipients per send. Pro removes that cap for a flat monthly fee, charged to a linked payment method — upgrade or cancel anytime from the Account page.",
  },
];

function FeaturesContent() {
  const [openTitle, setOpenTitle] = useState(null);

  return (
    <>
      <PageHeader
        eyebrow="Features"
        title="Built for how money actually moves"
        subtitle="Everything in Payzarc is designed around real transfers, real rates, and real people — not just a wallet balance on a screen."
      />
      <div className="stagger grid grid-cols-3 gap-5 max-[1024px]:grid-cols-2 max-[640px]:grid-cols-1">
        {FEATURES_LIST.map(({ icon: Icon, title, description, details }) => {
          const isOpen = openTitle === title;
          return (
            <div
              key={title}
              className="bg-white/[0.03] backdrop-blur-[8px] border-[0.5px] border-border rounded-[20px] p-6 transition-colors duration-200 hover:border-input"
            >
              <div className="w-11 h-11 rounded-xl bg-[var(--gold-pale)] text-gold flex items-center justify-center mb-4">
                <Icon size={20} fill="currentColor" fillOpacity={0.25} />
              </div>
              <h3 className="text-[15px] font-bold text-foreground m-0 mb-1.5">
                {title}
              </h3>
              <p className="text-[13.5px] text-[var(--muted)] leading-[1.6] m-0">
                {description}
              </p>

              <button
                type="button"
                onClick={() => setOpenTitle(isOpen ? null : title)}
                className="inline-flex items-center gap-1 mt-3 bg-transparent border-0 p-0 text-[12px] font-semibold text-gold cursor-pointer"
              >
                {isOpen ? "Show less" : "Learn more"}
                <ChevronDown
                  size={14}
                  className={cn(
                    "transition-transform duration-200",
                    isOpen && "rotate-180",
                  )}
                />
              </button>

              <div
                className="grid transition-[grid-template-rows] duration-300 ease-in-out"
                style={{ gridTemplateRows: isOpen ? "1fr" : "0fr" }}
              >
                <div className="overflow-hidden">
                  <p
                    className={cn(
                      "text-[13px] text-[var(--muted)] leading-[1.6] m-0 pt-3 mt-3 border-t-[0.5px] border-white/[0.06] transition-[opacity,transform] duration-300 ease-in-out",
                      isOpen
                        ? "opacity-100 translate-y-0 delay-100"
                        : "opacity-0 -translate-y-1",
                    )}
                  >
                    {details}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}

function RatesContent() {
  return (
    <>
      <PageHeader
        eyebrow="Rates & fees"
        title="Simple, transparent pricing"
        subtitle="One flat sending fee, live market rates, and no surprise charges buried in the exchange rate."
      />
      <div className="stagger grid grid-cols-3 gap-5 mb-4 max-[768px]:grid-cols-1">
        <div className="bg-white/[0.03] backdrop-blur-[8px] border-[0.5px] border-border rounded-[20px] p-6">
          <Percent size={20} className="text-gold mb-3" />
          <h3 className="text-[15px] font-bold text-foreground m-0 mb-1.5">
            Flat sending fee
          </h3>
          <p className="text-[13.5px] text-[var(--muted)] leading-[1.6] m-0">
            1.5% per transfer, with a $1 minimum — shown up front before you
            send, never subtracted from the exchange rate.
          </p>
        </div>
        <div className="bg-white/[0.03] backdrop-blur-[8px] border-[0.5px] border-border rounded-[20px] p-6">
          <Globe size={20} className="text-gold mb-3" />
          <h3 className="text-[15px] font-bold text-foreground m-0 mb-1.5">
            Live market rates
          </h3>
          <p className="text-[13.5px] text-[var(--muted)] leading-[1.6] m-0">
            Rates refresh throughout the day to track the market — use the
            calculator below for an indicative quote.
          </p>
        </div>
        <div className="bg-white/[0.03] backdrop-blur-[8px] border-[0.5px] border-border rounded-[20px] p-6">
          <UsersRound size={20} className="text-gold mb-3" />
          <h3 className="text-[15px] font-bold text-foreground m-0 mb-1.5">
            Payzarc Pro
          </h3>
          <p className="text-[13.5px] text-[var(--muted)] leading-[1.6] m-0">
            ${PRO_PLAN_PRICE}/mo removes the free-tier cap on Send to Many —
            manage it anytime from your Account page.
          </p>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-5 mt-5 max-[768px]:grid-cols-1">
        <FeeComparison />
        <CurrencyWall />
      </div>
      <Converter />
    </>
  );
}

const FAQS = [
  {
    q: "How do I send money?",
    a: "Open the Send tab on your dashboard, pick a saved friend or enter a phone number, and confirm the amount — funds are tracked from sent to delivered in real time.",
  },
  {
    q: "What are the fees?",
    a: "A flat 1.5% fee with a $1 minimum applies to sends, shown before you confirm. See the Rates page for the full breakdown.",
  },
  {
    q: "How do I verify my identity?",
    a: "From the Account page, tap Verify identity to scan your ID and take a quick selfie. Verification is required to lift certain account limits.",
  },
  {
    q: "What is Payzarc Pro?",
    a: "A paid upgrade that removes the free-tier cap on Send to Many. Upgrade or cancel anytime from the Account page using a linked payment method.",
  },
  {
    q: "How do group funds work?",
    a: "Create a group for a reason — emergency, wedding, funeral — add friends, and let them contribute directly into that fund. The total is tracked separately from your personal balance.",
  },
  {
    q: "Is my money safe?",
    a: "Every account is protected by identity verification and linked payment methods on file, and every transfer is tracked end to end so you always know where it is.",
  },
];

function HelpContent() {
  const navigate = useNavigate();
  const [openIndex, setOpenIndex] = useState(0);
  return (
    <>
      <PageHeader
        eyebrow="Help center"
        title="Answers to the common stuff"
        subtitle="Can't find what you need? The team is one message away."
      />
      <div className="flex flex-col gap-3 max-w-[720px]">
        {FAQS.map(({ q, a }, i) => {
          const isOpen = openIndex === i;
          return (
            <div
              key={q}
              className="bg-white/[0.03] backdrop-blur-[8px] border-[0.5px] border-border rounded-[16px] p-5"
            >
              <button
                type="button"
                onClick={() => setOpenIndex(isOpen ? -1 : i)}
                aria-expanded={isOpen}
                className="w-full flex items-center gap-2.5 bg-transparent border-none p-0 cursor-pointer text-left"
              >
                <CircleHelp size={16} className="text-gold shrink-0" />
                <h3 className="flex-1 text-[14.5px] font-bold text-foreground m-0">
                  {q}
                </h3>
                <ChevronDown
                  size={16}
                  className={cn(
                    "text-[var(--muted)] shrink-0 transition-transform duration-200",
                    isOpen && "rotate-180",
                  )}
                />
              </button>
              {isOpen && (
                <p className="text-[13.5px] text-[var(--muted)] leading-[1.6] m-0 mt-2 pl-[26px]">
                  {a}
                </p>
              )}
            </div>
          );
        })}
      </div>
      <button
        type="button"
        onClick={() => navigate("/contact")}
        className="inline-flex items-center gap-1.5 mt-8 bg-gold text-[#111] border-none rounded-md px-[1.3rem] py-2 text-[13px] font-bold cursor-pointer transition-ui duration-200 hover:bg-gold-dark hover:-translate-y-0.5"
      >
        Contact support <ChevronRight size={14} />
      </button>
    </>
  );
}

const CONTACT_METHODS = [
  {
    icon: Mail,
    label: "Email",
    value: "info.e@payzarc.com",
    href: "mailto:info.e@payzarc.com",
  },
  {
    icon: Phone,
    label: "Phone",
    value: "+1 (713) 822-8593",
    href: "tel:+17138228593",
  },
  { icon: MapPin, label: "Office", value: "Kew Gardens Dr, Houston TX, USA" },
];

function ContactContent() {
  const [form, setForm] = useState({ name: "", email: "", message: "" });
  const [sent, setSent] = useState(false);
  const [formError, setFormError] = useState("");

  const canSubmit = form.name && form.email && form.message;

  const submit = (e) => {
    e.preventDefault();
    if (!canSubmit) return;
    if (!isSafeText(form.name) || !isSafeText(form.message)) {
      setFormError("Name and message can't contain < or > characters");
      return;
    }
    if (!isValidEmail(form.email)) {
      setFormError("Enter a valid email address");
      return;
    }
    setFormError("");
    setSent(true);
  };

  return (
    <>
      <PageHeader
        eyebrow="Contact"
        title="Get in touch"
        subtitle="Questions about your account, a transfer, or anything else — reach out and we'll get back to you."
      />
      <div className="grid grid-cols-[1fr_1.4fr] gap-6 max-[900px]:grid-cols-1">
        <div className="flex flex-col gap-3">
          {CONTACT_METHODS.map(({ icon: Icon, label, value, href }) => (
            <div
              key={label}
              className="bg-white/[0.03] backdrop-blur-[8px] border-[0.5px] border-border rounded-[16px] p-5 flex items-start gap-3.5 transition-colors duration-200 hover:border-input"
            >
              <div className="w-10 h-10 rounded-xl bg-[var(--gold-pale)] text-gold flex items-center justify-center shrink-0">
                <Icon size={17} />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] font-semibold text-[var(--muted)] uppercase tracking-[0.06em] m-0 mb-1">
                  {label}
                </p>
                {href ? (
                  <a
                    href={href}
                    className="text-[14px] font-semibold text-foreground no-underline hover:text-gold break-words"
                  >
                    {value}
                  </a>
                ) : (
                  <p className="text-[14px] font-semibold text-foreground m-0">
                    {value}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="bg-white/[0.03] backdrop-blur-[8px] border-[0.5px] border-border rounded-[20px] p-7 max-[768px]:p-5">
          {sent ? (
            <div className="flex flex-col items-center text-center gap-3 py-10">
              <div className="w-14 h-14 rounded-full bg-success/10 flex items-center justify-center">
                <CircleCheck size={28} className="text-success" />
              </div>
              <h3 className="text-[17px] font-bold text-foreground m-0">
                Message sent
              </h3>
              <p className="text-[13.5px] text-[var(--muted)] m-0 max-w-[320px]">
                Thanks, {form.name.split(" ")[0]} — we'll get back to you at{" "}
                {form.email} soon.
              </p>
              <button
                type="button"
                onClick={() => {
                  setSent(false);
                  setForm({ name: "", email: "", message: "" });
                }}
                className="mt-2 bg-transparent border-0 p-0 text-[13px] font-semibold text-gold cursor-pointer hover:text-gold-dark"
              >
                Send another message
              </button>
            </div>
          ) : (
            <form onSubmit={submit} className="flex flex-col gap-4">
              <h3 className="text-[15px] font-bold text-foreground m-0">
                Send us a message
              </h3>
              <div className="grid grid-cols-2 gap-4 max-[500px]:grid-cols-1">
                <label className="flex flex-col gap-1.5">
                  <span className="text-[12px] font-medium text-[var(--muted)]">
                    Name
                  </span>
                  <input
                    type="text"
                    placeholder="Your name"
                    value={form.name}
                    onChange={(e) =>
                      setForm({ ...form, name: e.target.value })
                    }
                    className="w-full p-3.5 bg-white/[0.06] text-foreground border-[0.5px] border-white/10 rounded-[10px] text-[14px] outline-none transition-colors duration-200 focus:border-gold placeholder:text-[var(--muted)]"
                  />
                </label>
                <label className="flex flex-col gap-1.5">
                  <span className="text-[12px] font-medium text-[var(--muted)]">
                    Email
                  </span>
                  <input
                    type="email"
                    placeholder="you@example.com"
                    value={form.email}
                    onChange={(e) =>
                      setForm({ ...form, email: e.target.value })
                    }
                    className="w-full p-3.5 bg-white/[0.06] text-foreground border-[0.5px] border-white/10 rounded-[10px] text-[14px] outline-none transition-colors duration-200 focus:border-gold placeholder:text-[var(--muted)]"
                  />
                </label>
              </div>
              <label className="flex flex-col gap-1.5">
                <span className="text-[12px] font-medium text-[var(--muted)]">
                  Message
                </span>
                <textarea
                  placeholder="How can we help?"
                  rows={5}
                  value={form.message}
                  onChange={(e) =>
                    setForm({ ...form, message: e.target.value })
                  }
                  className="w-full p-3.5 bg-white/[0.06] text-foreground border-[0.5px] border-white/10 rounded-[10px] text-[14px] outline-none transition-colors duration-200 focus:border-gold placeholder:text-[var(--muted)] resize-none"
                />
              </label>
              {formError && (
                <p className="text-[13px] text-red-400 -mt-2">{formError}</p>
              )}
              <button
                type="submit"
                disabled={!canSubmit}
                className="w-full py-[0.65rem] bg-gold text-[#111] border-none rounded-sm text-[15px] font-bold cursor-pointer transition-[background,transform] duration-200 hover:bg-gold-dark hover:-translate-y-px disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0"
              >
                Send message
              </button>
            </form>
          )}
        </div>
      </div>
    </>
  );
}

const PANEL_ORDER = ["home", "features", "rates", "help", "contact"];

function MarketingPage({ children }) {
  return (
    <div className="px-8 pt-16 pb-24 max-[768px]:px-5 max-[768px]:pt-12">
      <div className="max-w-[1120px] mx-auto">{children}</div>
    </div>
  );
}

function Home({ overlay }) {
  const navigate = useNavigate();
  const closeOverlay = () => navigate("/");

  const isAuthOverlay = overlay === "login" || overlay === "register";
  const panel = isAuthOverlay
    ? "home"
    : PANEL_ORDER.includes(overlay)
      ? overlay
      : "home";

  return (
    <div className="h-screen overflow-hidden flex flex-col">
      <div className="relative flex-1 min-h-0 flex flex-col text-foreground font-sans leading-[1.6] overflow-hidden">
        <div className="absolute rounded-full border border-[rgba(var(--gold-rgb),0.07)] pointer-events-none w-[600px] h-[600px] -top-[160px] left-1/2 -translate-x-1/2" />
        <div className="absolute rounded-full border border-[rgba(var(--gold-rgb),0.07)] pointer-events-none w-[380px] h-[380px] -top-[60px] left-1/2 -translate-x-1/2" />

        <Navbar />

        <div
          data-landing-scroller=""
          className="relative flex-1 min-h-0 overflow-y-auto flex flex-col"
        >
          <div key={panel} className="flex-1 animate-page-swap-in">
            {panel === "home" && (
              <>
                <Hero
                  overlay={isAuthOverlay ? overlay : null}
                  onCloseAuth={closeOverlay}
                />
                <Story />
              </>
            )}
            {panel === "features" && (
              <MarketingPage>
                <FeaturesContent />
              </MarketingPage>
            )}
            {panel === "rates" && (
              <MarketingPage>
                <RatesContent />
              </MarketingPage>
            )}
            {panel === "help" && (
              <MarketingPage>
                <HelpContent />
              </MarketingPage>
            )}
            {panel === "contact" && (
              <MarketingPage>
                <ContactContent />
              </MarketingPage>
            )}
          </div>
          <Footer />
        </div>
      </div>
    </div>
  );
}

function AppContent() {
  const location = useLocation();
  const navigate = useNavigate();
  // Trailing slash tolerated so "/login/" still resolves.
  const path = location.pathname.replace(/\/+$/, "") || "/";

  const standaloneRoutes = [
    "set-password",
    "reset-password",
    "set-new-password",
    "dashboard",
  ];

  if (standaloneRoutes.some((r) => path === `/${r}`)) {
    const goHome = () => navigate("/");
    return (
      <Routes>
        <Route
          path="set-password"
          element={<SetPassword onBack={goHome} />}
        />
        <Route
          path="reset-password"
          element={<ResetPassword onBack={goHome} />}
        />
        <Route
          path="set-new-password"
          element={<SetNewPassword onBack={goHome} />}
        />
        <Route
          path="dashboard"
          element={
            <ProtectedRoute>
              <Dashboard onBack={goHome} />
            </ProtectedRoute>
          }
        />
      </Routes>
    );
  }

  const OVERLAY_PATHS = {
    "/login": "login",
    "/register": "register",
    "/features": "features",
    "/rates": "rates",
    "/help": "help",
    "/contact": "contact",
  };
  const overlay = OVERLAY_PATHS[path] || null;
  if (path !== "/" && !overlay) return <NotFound />;

  return <Home overlay={overlay} />;
}

function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <AppContent />
      </BrowserRouter>
    </ErrorBoundary>
  );
}

export default App;
