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
import { cn } from "@/lib/utils";
import { ArrowRightIcon } from "lucide-react";
import { EXCHANGE_RATES } from "./utility/exchangeRates";

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
  { flag: "🇰🇪", name: "Kenya", currency: "KES", country: "Kenya" },
  { flag: "🇳🇬", name: "Nigeria", currency: "NGN", country: "Nigeria" },
  { flag: "🇮🇳", name: "India", currency: "INR", country: "India" },
  { flag: "🇬🇭", name: "Ghana", currency: "GHS", country: "Ghana" },
];

/* ─── Shared class strings for the "phone preview" snapshot markup, which
   is duplicated verbatim between PhoneMockup and PhoneAuthStage's
   phoneStagePreview clone (same as it was as duplicated CSS-Module classes
   before this migration) — extracted here just so both copies pull from a
   single source instead of two independently-drifting class strings. ─── */
const psHeaderClass = "flex items-center justify-between mb-0.5";
const psLogoClass = "w-[18px] h-[18px] bg-gold rounded-[5px]";
const psDotsClass = "flex gap-[3px]";
const psDotClass = "w-[5px] h-[5px] rounded-full bg-white/20";
const psGreetingClass = "text-[9px] text-muted-foreground";
const psNameClass = "text-[11px] font-bold text-foreground -mt-1";
const psBalanceCardClass =
  "bg-gradient-to-br from-[#234876] to-[#1a2f4d] rounded-sm py-[7px] px-2 border-[0.5px] border-[rgba(96,165,250,0.25)] shadow-[0_6px_16px_rgba(0,0,0,0.25)]";
const psBalLabelClass = "text-[8px] text-info";
const psBalAmountClass = "text-[15px] font-bold text-foreground mt-px";

/* ─── Phone Auth Stage shell (backdrop/panel/notch/screen/preview/content) —
   formerly a small CSS-Modules leftover (App.module.css), now expressed as
   Tailwind classes like the rest of the app.

   phoneStagePanelClass keeps its transition as one arbitrary `transition`
   property (not the transition-/duration- utility classes) because the FLIP
   "grow" animation needs all eight of top/left/width/height/border-radius/
   transform/background/border-color animating at once, with transform/size/
   radius on one easing curve and background/border-color on another —
   Tailwind's utilities only apply a single duration+easing to the whole
   transition-property list, which can't express two curves at once. The
   320ms duration here must also stay in sync with the `setTimeout(..., 320)`
   in PhoneAuthStage's close handler, which unmounts the clone once the
   shrink-back animation finishes — writing it as one exact string removes
   any risk of the utility classes and the JS timer drifting apart. */
const phoneStageBackdropClass =
  "fixed inset-0 z-[1000] flex items-center justify-center px-4 py-8 bg-[rgba(6,8,14,0)] [backdrop-filter:blur(0px)] [-webkit-backdrop-filter:blur(0px)] transition-[background,backdrop-filter] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]";
const phoneStageBackdropOpenClass =
  "bg-[rgba(6,8,14,0.62)] [backdrop-filter:blur(7px)] [-webkit-backdrop-filter:blur(7px)]";
const phoneStagePanelClass =
  "fixed flex flex-col bg-[#1c2333] border-[1.5px] border-white/10 shadow-[0_30px_80px_rgba(0,0,0,0.55)] overflow-hidden rounded-[26px] z-[1001] [transition:top_0.32s_cubic-bezier(0.16,1,0.3,1),left_0.32s_cubic-bezier(0.16,1,0.3,1),width_0.32s_cubic-bezier(0.16,1,0.3,1),height_0.32s_cubic-bezier(0.16,1,0.3,1),border-radius_0.32s_cubic-bezier(0.16,1,0.3,1),transform_0.32s_cubic-bezier(0.16,1,0.3,1),background_0.32s_ease,border-color_0.32s_ease]";
const phoneStagePanelOpenClass =
  "top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[min(420px,92vw)] h-[min(760px,88vh)] rounded-[36px] bg-[radial-gradient(circle_at_30%_0%,#263252,#1c2333_60%)] border-[rgba(236,201,75,0.16)] max-[480px]:w-[94vw] max-[480px]:h-[90vh] max-[480px]:rounded-[28px]";
const phoneStageNotchClass =
  "w-[42px] h-2 bg-[#0d1117] rounded mx-auto mt-[14px] flex-shrink-0 transition-opacity duration-200 ease-in-out";
const phoneStageScreenClass =
  "relative flex-1 mt-[10px] mx-[9px] mb-3 bg-card rounded-[20px] overflow-y-auto overflow-x-hidden [scrollbar-width:thin] [scrollbar-color:rgba(255,255,255,0.12)_transparent] [&::-webkit-scrollbar]:w-[5px] [&::-webkit-scrollbar-thumb]:bg-white/[0.12] [&::-webkit-scrollbar-thumb]:rounded";
const phoneStagePreviewClass =
  "absolute inset-0 py-[10px] px-2 flex flex-col gap-[7px] opacity-100 transition-opacity duration-[220ms] ease-in-out pointer-events-none";
const phoneStagePreviewHideClass = "opacity-0";
const phoneStageContentClass =
  "px-[1.35rem] pt-[1.6rem] pb-[1.85rem] opacity-0 translate-y-[10px] transition-[opacity,transform] duration-[220ms] ease-in-out";
const phoneStageContentShowClass = "opacity-100 translate-y-0 delay-100";

/* ─── Navbar ─── */
function Navbar() {
  const navigate = useNavigate();
  return (
    <nav className="border-b-[0.5px] border-border sticky top-0 bg-[rgba(13,17,23,0.85)] backdrop-blur-[12px] z-[100]">
      <div className="grid grid-cols-[1fr_auto_1fr] items-center max-w-[1120px] mx-auto px-8 py-4 max-[768px]:px-5">
        <div className="flex items-center gap-9 justify-self-start">
          <div className="flex items-center gap-2">
            <div className="w-[60px] h-[30px] rounded-sm flex items-center justify-center flex-shrink-0">
              <img
                src="/images/payzarc.png"
                className="h-8 w-20"
                alt="Payzarc-logo"
              />
            </div>
            {/* <span className="text-[17px] font-bold text-foreground tracking-[-0.3px]">Payzarc</span> */}
          </div>
        </div>
        <div className="flex gap-6 justify-self-center max-[768px]:hidden">
          <button
            type="button"
            className="bg-transparent border-0 p-0 text-[13px] text-[var(--muted)] no-underline transition-colors duration-200 hover:text-foreground cursor-pointer"
          >
            Home
          </button>
          <button
            type="button"
            className="bg-transparent border-0 p-0 text-[13px] text-[var(--muted)] no-underline transition-colors duration-200 hover:text-foreground cursor-pointer"
          >
            Features
          </button>
          <button
            type="button"
            className="bg-transparent border-0 p-0 text-[13px] text-[var(--muted)] no-underline transition-colors duration-200 hover:text-foreground cursor-pointer"
          >
            Rates
          </button>
          <button
            type="button"
            className="bg-transparent border-0 p-0 text-[13px] text-[var(--muted)] no-underline transition-colors duration-200 hover:text-foreground cursor-pointer"
          >
            Help
          </button>
          <button
            type="button"
            className="bg-transparent border-0 p-0 text-[13px] text-[var(--muted)] no-underline transition-colors duration-200 hover:text-foreground cursor-pointer"
          >
            Contact
          </button>
        </div>
        <button
          className="group inline-flex items-center gap-1.5 bg-gold text-[#111] border-none rounded-[20px] px-[1.3rem] py-[0.55rem] text-[13px] font-bold cursor-pointer justify-self-end shadow-[0_4px_14px_rgba(236,201,75,0.25)] transition-[background,transform,box-shadow] duration-200 hover:bg-gold-dark hover:-translate-y-0.5 hover:shadow-[0_8px_22px_rgba(236,201,75,0.4)]"
          onClick={() => navigate("/components/member/login")}
        >
          Login{" "}
          <ArrowRightIcon
            size={14}
            className="transition-transform duration-200 group-hover:translate-x-0.5"
          />
        </button>
      </div>
    </nav>
  );
}

/* ─── Phone Mockup ───
   Rendered with a forwarded ref so PhoneAuthStage (below) can read its exact
   on-screen position/size and morph a login/register panel out of it. */
const PhoneMockup = React.forwardRef(function PhoneMockup({ hidden }, ref) {
  return (
    <div
      ref={ref}
      className="absolute left-1/2 top-0 -translate-x-1/2 scale-[1.55] origin-top w-[250px] bg-[#1c2333] rounded-[26px] border-[1.5px] border-[rgba(236,201,75,0.18)] pt-[10px] px-2 pb-[14px] shadow-[0_30px_70px_rgba(0,0,0,0.45),0_0_0_1px_rgba(255,255,255,0.04)_inset] z-[2] max-[768px]:w-[230px]"
      style={hidden ? { visibility: "hidden" } : undefined}
    >
      <div className="w-[42px] h-2 bg-[#0d1117] rounded mx-auto mb-[9px]" />
      <div className="bg-card rounded-2xl py-[10px] px-2 min-h-[240px] flex flex-col gap-[7px]">
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
        <div className="text-[9px] text-[var(--muted)]">Send to</div>
        <div className="flex gap-[7px]">
          {[
            { initials: "JM", bg: "#fde68a", color: "#78350f", name: "James" },
            { initials: "SA", bg: "#bfdbfe", color: "#1e3a5f", name: "Sarah" },
            { initials: "NK", bg: "#d9f99d", color: "#365314", name: "Nora" },
            { initials: "+", bg: "#fecdd3", color: "#881337", name: "More" },
          ].map((r) => (
            <div key={r.name} className="flex flex-col items-center gap-[3px]">
              <div
                className="w-[23px] h-[23px] rounded-full flex items-center justify-center text-[8px] font-bold"
                style={{ background: r.bg, color: r.color }}
              >
                {r.initials}
              </div>
              <div className="text-[7px] text-[var(--muted)]">{r.name}</div>
            </div>
          ))}
        </div>
        <div className="text-[9px] text-[var(--muted)] mt-0.5">
          Recent activity
        </div>
        <div className="flex flex-col gap-1">
          {[
            { flag: "🇳🇬", name: "Nigeria", amt: "+NGN 90K" },
            { flag: "🇮🇳", name: "India", amt: "+INR 41K" },
            { flag: "🇰🇪", name: "Kenya", amt: "+KES 25K" },
          ].map((t) => (
            <div
              key={t.name}
              className="flex items-center gap-1 bg-white/[0.04] rounded-[5px] px-[5px] py-1"
            >
              <span className="text-[10px] flex-shrink-0">{t.flag}</span>
              <span className="text-[8px] text-[#d1d5db] flex-1">
                {t.name}
              </span>
              <span className="text-[8px] font-bold text-success">
                {t.amt}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
});

/* ─── Phone Auth Stage ───
   This is the "morph" — instead of a modal, the same phone mockup shown in
   the hero literally grows into the login/register screen. We measure the
   mockup's live position with getBoundingClientRect (FLIP technique), hide
   it in place, and render an animated clone (via a portal, so it can sit
   above everything at position:fixed) that transitions from that exact spot
   to a large centered "phone" containing the real form. Reversing the same
   animation on close makes it feel like the form shrinks back into the
   mockup rather than the page navigating away.

   The clone's shell (backdrop/panel/notch/screen/preview/content) uses the
   phoneStage*Class Tailwind strings defined above PhoneMockup — see the
   comment there for why the panel's transition is one arbitrary property
   instead of Tailwind's transition-/duration- utility classes. */
function PhoneAuthStage({ overlay, onClose }) {
  const anchorRef = useRef(null);
  const closeTimerRef = useRef(null);
  const [rect, setRect] = useState(null);
  // closed -> opening -> open -> closing -> closed
  const [phase, setPhase] = useState("closed");

  // Start the grow animation: snapshot the mockup's rect, then flip to
  // "opening" so we can render the clone in that exact spot first.
  useLayoutEffect(() => {
    if (overlay && phase === "closed") {
      const r = anchorRef.current.getBoundingClientRect();
      setRect({ top: r.top, left: r.left, width: r.width, height: r.height });
      setPhase("opening");
    }
  }, [overlay, phase]);

  // One frame later, swap to the expanded (centered/large) CSS state so the
  // browser animates between the two — this is the actual "morph".
  useEffect(() => {
    if (phase !== "opening") return undefined;
    const id = requestAnimationFrame(() =>
      requestAnimationFrame(() => setPhase("open")),
    );
    return () => cancelAnimationFrame(id);
  }, [phase]);

  // Start the shrink animation: snapshot the mockup's current rect (in case
  // of scroll/resize) and animate back to it before unmounting.
  useEffect(() => {
    if (overlay) return undefined;
    if (phase !== "open" && phase !== "opening") return undefined;
    const r = anchorRef.current.getBoundingClientRect();
    setRect({ top: r.top, left: r.left, width: r.width, height: r.height });
    setPhase("closing");
    return undefined;
    // eslint-disable-next-line react-hooks/exhaustive-deps -- must only re-run
    // when overlay flips, so it captures phase as of that moment; adding phase
    // would re-fire this on every phase transition and re-snapshot the rect.
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

  // While opening/closing we pin the clone to the mockup's exact measured
  // rect via inline styles; once "open" we hand control to the CSS class,
  // which defines the large, centered target — the transition between the
  // two is what produces the grow/shrink motion.
  const panelStyle =
    rect && !isExpanded
      ? {
          top: rect.top,
          left: rect.left,
          width: rect.width,
          height: rect.height,
          transform: "none",
          borderRadius: "26px",
        }
      : undefined;

  return (
    <>
      <PhoneMockup ref={anchorRef} hidden={isActive} />

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
                isExpanded && phoneStagePanelOpenClass,
              )}
              style={panelStyle}
            >
              <button
                type="button"
                className={cn(
                  "absolute top-[14px] right-[14px] z-[2] w-[30px] h-[30px] flex items-center justify-center bg-white/[0.06] border-[0.5px] border-white/[0.12] rounded-full text-[#9ca3af] cursor-pointer transition-[opacity,background,color,transform] duration-200 hover:bg-white/[0.12] hover:text-[#f9fafb] hover:rotate-90",
                  isExpanded ? "opacity-100" : "opacity-0",
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

              <div className={cn(phoneStageNotchClass, isExpanded && "opacity-0")} />

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
                  {overlay === "login" && (
                    <Login onBack={onClose} embedded compact />
                  )}
                  {overlay === "register" && (
                    <Register onBack={onClose} embedded compact />
                  )}
                </div>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}

/* ─── Float Card ─── */
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

/* ─── Hero Section ─── */
function Hero({ overlay, onCloseAuth }) {
  const navigate = useNavigate();
  return (
    <section className="relative flex flex-col items-center text-center min-h-screen pt-16 px-8 pb-12">
      <div className="fixed rounded-full border border-[rgba(236,201,75,0.07)] pointer-events-none w-[600px] h-[600px] -top-[160px] left-1/2 -translate-x-1/2" />
      <div className="fixed rounded-full border border-[rgba(236,201,75,0.07)] pointer-events-none w-[380px] h-[380px] -top-[60px] left-1/2 -translate-x-1/2" />
      <div className="absolute rounded-full border border-[rgba(236,201,75,0.07)] pointer-events-none" />

      {/* <div className="inline-flex items-center gap-2 bg-white/5 border-[0.5px] border-input rounded-[20px] py-1.5 px-4 text-xs text-[var(--soft)] mb-6">
        <div className="flex">
          <div className="w-5 h-5 rounded-full border-[1.5px] border-background -mr-[5px] text-[9px] font-bold flex items-center justify-center bg-success text-[#166534]">J</div>
          <div className="w-5 h-5 rounded-full border-[1.5px] border-background -mr-[5px] text-[9px] font-bold flex items-center justify-center bg-info text-[#1e3a5f]">A</div>
          <div className="w-5 h-5 rounded-full border-[1.5px] border-background -mr-[5px] text-[9px] font-bold flex items-center justify-center bg-pink text-[#831843]">M</div>
        </div>
        Trusted by 21,000+ people worldwide
      </div> */}
      <h1 className="text-[clamp(2.5rem,8vw,5rem)] font-bold tracking-[2px] text-gold text-center leading-[1.05] flex p-0 max-[768px]:text-[34px]">
        PAYZARC
      </h1>

      <h1 className="text-[2rem] font-bold leading-[1.1] tracking-[-1.5px] text-foreground max-w-[520px] m-12 max-[768px]:text-lg">
        Send money
        <br />
        at <span className="text-gold">Lower Rates</span>
      </h1>

      <p className="text-[1.3rem] text-[var(--muted)] max-w-[400px] leading-[1.7] mb-8 max-[768px]:text-sm">
        Payzarc offers industry-leading exchange rates with no hidden fees. Save
        more for every transaction you make.
      </p>

      <div className="flex gap-3 mb-14 max-[480px]:flex-col max-[480px]:items-stretch">
        <button
          className="bg-gold text-[#111] border-none rounded-[2rem] py-3 px-7 text-2xl font-semibold cursor-pointer transition-[background,transform] duration-200 hover:bg-gold-dark hover:-translate-y-px max-[480px]:text-center"
          onClick={() => navigate("/components/member/register")}
        >
          Get started <ArrowRightIcon />
        </button>
        {/* <button className="bg-white/5 text-[#d1d5db] border-[0.5px] border-input rounded-[24px] py-3 px-7 text-sm font-medium cursor-pointer transition-colors duration-200 hover:bg-white/[0.09] max-[480px]:text-center">See how it works</button> */}
      </div>

      <div className="relative w-full max-w-[680px] h-[min(75vh,540px)] flex items-start justify-center max-[768px]:h-[300px]">
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
          value="$2,000"
          sub="USD · 1 = KES 129.5"
        />

        <PhoneAuthStage overlay={overlay} onClose={onCloseAuth} />

        <FloatCard
          side="right"
          iconBg="rgba(74,222,128,0.1)"
          icon={
            <svg width="20" height="14" viewBox="0 0 32 22" fill="none">
              <rect width="32" height="22" rx="2" fill="#FF9933" />
              <rect y="7" width="32" height="8" fill="white" />
              <rect y="15" width="32" height="7" fill="#138808" />
              <circle
                cx="16"
                cy="11"
                r="3"
                fill="none"
                stroke="#000080"
                strokeWidth="1"
              />
            </svg>
          }
          label="They receive"
          value="₹1,66,600"
          sub="INR · fees: ₹0.00"
        />

        <div className="absolute bottom-[10px] left-1/2 -translate-x-1/2 inline-flex items-center gap-1.5 bg-success/[0.08] border-[0.5px] border-success/25 rounded-[20px] py-[5px] px-3 text-[11px] text-success whitespace-nowrap">
          <div className="w-1.5 h-1.5 rounded-full bg-success flex-shrink-0" />
          Live rate · updated 2s ago
        </div>
      </div>
    </section>
  );
}

/* ─── Features Strip ─── */
const FEATURES = [
  {
    iconBg: "rgba(236,201,75,0.12)",
    iconStroke: "#ecc94b",
    iconPath: (
      <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
    ),
    title: "Low rates",
    desc: "Reduced transaction cost.",
  },
  {
    iconBg: "rgba(96,165,250,0.12)",
    iconStroke: "#60a5fa",
    iconPath: (
      <>
        <circle cx="12" cy="12" r="10" />
        <polyline points="12 6 12 12 16 14" />
      </>
    ),
    title: "Transfers in minutes",
    desc: "Most transfers arrive in under 60 seconds across 50+ countries.",
  },
  {
    iconBg: "rgba(74,222,128,0.1)",
    iconStroke: "#4ade80",
    iconPath: (
      <>
        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
        <path d="M7 11V7a5 5 0 0110 0v4" />
      </>
    ),
    title: "Bank-grade security",
    desc: "256-bit encryption and full regulatory compliance in all regions.",
  },
];

// eslint-disable-next-line no-unused-vars -- kept for when FeaturesStrip is re-enabled in Home()
function FeaturesStrip() {
  return (
    <div className="flex flex-col gap-3 w-full px-10 py-8 border-t-[0.5px] border-border items-center flex-1 max-[768px]:py-6 max-[768px]:px-5">
      {FEATURES.map((f) => (
        <div
          key={f.title}
          className="bg-white/[0.03] border-[0.5px] border-border rounded-[14px] p-5 flex flex-col gap-1.5 transition-[border-color,background] duration-200 hover:bg-white/[0.055] hover:border-input"
        >
          <div
            className="w-[34px] h-[34px] rounded-[10px] flex items-center justify-center mb-1.5"
            style={{ background: f.iconBg }}
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke={f.iconStroke}
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              {f.iconPath}
            </svg>
          </div>
          <div className="text-[13px] font-bold text-foreground">
            {f.title}
          </div>
          <div className="text-[12px] text-[var(--muted)] leading-[1.55]">
            {f.desc}
          </div>
        </div>
      ))}
    </div>
  );
}

/* ─── Converter Section ─── */
function isValidAmount(val) {
  const n = parseFloat(val);
  return !isNaN(n) && n >= 1 && n <= 1000000;
}

// eslint-disable-next-line no-unused-vars -- kept for when Converter is re-enabled in Home()
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
        Real-time rates, zero surprises.
      </p>

      <div className="bg-white/[0.03] border-[0.5px] border-border rounded-[20px] p-6 flex flex-col gap-4">
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
            <div className="text-[11px] text-[rgba(236,201,75,0.5)] mt-[3px] tracking-[0.2px]">
              1 {COUNTRIES[fromCountry]} ={" "}
              {EXCHANGE_RATES[COUNTRIES[fromCountry]]?.[COUNTRIES[toCountry]]}{" "}
              {COUNTRIES[toCountry]} · indicative rate
            </div>
          </div>
        )}

        {canSend && (
          <button
            className="w-full py-[0.9rem] bg-gold text-[#111] border-none rounded-md text-[15px] font-bold cursor-pointer transition-[background,transform] duration-200 hover:bg-gold-dark hover:-translate-y-px"
            onClick={() => navigate("/components/member/login")}
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
              className="bg-white/[0.04] border-[0.5px] border-border rounded-[10px] text-[var(--soft)] py-[0.7rem] px-1 cursor-pointer flex flex-col items-center gap-[5px] transition-colors duration-200 hover:bg-[var(--gold-pale)] hover:border-[var(--gold-border)] hover:text-gold"
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

/* ─── Footer ─── */
function Footer() {
  return (
    <footer className="border-t-[0.5px] border-border">
      <div className="flex items-center justify-between max-w-[1120px] mx-auto px-8 py-5 flex-wrap gap-4 max-[768px]:flex-col max-[768px]:items-start max-[768px]:p-5">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <div className="w-[60px] h-[30px] rounded-sm flex items-center justify-center flex-shrink-0">
              <img src="/images/payzarc.png" className="h-8 w-20" alt="" />
            </div>
            {/* <span className="text-[17px] font-bold text-foreground tracking-[-0.3px]">Payzarc</span> */}
            <p className="text-[12px] text-[var(--muted)] pl-[38px] max-[768px]:pl-0 max-[768px]:mt-1">
              Your trusted cross-border financial partner.
            </p>
          </div>
        </div>
        <div className="flex flex-col gap-[3px] text-center max-[768px]:text-left">
          <a
            href="mailto:info.e@payzarc.com"
            className="text-[12px] font-semibold text-gold no-underline"
          >
            info.e@payzarc.com
          </a>
          <span className="text-[11px] text-[var(--muted)]">
            +1 (713) 822-8593
          </span>
          <span className="text-[11px] text-[var(--muted)]">
            Kew Gardens Dr Houston Tx, USA
          </span>
        </div>
        {/* <div className="flex items-center gap-1.5 bg-white/[0.04] border-[0.5px] border-border rounded-[20px] py-1.5 px-3.5 text-xs text-[var(--soft)]">
          <div className="w-[7px] h-[7px] rounded-full bg-success flex-shrink-0" />
          Secure &amp; live
        </div> */}
      </div>
    </footer>
  );
}

/* ─── Home Page ───
   Home is the single source of truth for the app's visual language, and it
   stays mounted for "/", the login route, and the register route — only the
   `overlay` value changes. Auth no longer opens as a separate modal: the
   phone mockup in the hero morphs directly into the login/register screen
   (see PhoneAuthStage), so the transition reads as "this page transformed"
   rather than "a new page appeared". */
function Home({ overlay }) {
  const navigate = useNavigate();
  const closeOverlay = () => navigate("/");

  return (
    <div className="bg-[#0602145f] bg-fixed">
      <div className="bg-[radial-gradient(ellipse_120%_60%_at_50%_-10%,rgba(38,50,82,0.6),var(--bg)_60%)] bg-fixed text-foreground font-sans min-h-screen leading-[1.6]">
        <Navbar />

        <Hero overlay={overlay} onCloseAuth={closeOverlay} />

        {/* <FeaturesStrip /> */}
        {/* <Converter /> */}
        <Footer />
      </div>
    </div>
  );
}

/* ─── App Content ───
   Home is rendered unconditionally so it never unmounts while the user
   opens/closes the login or register overlay — only the `overlay` value
   changes. Fully separate destinations (password recovery, the logged-in
   dashboard) remain standalone pages via <Routes>, since they represent a
   genuinely different context from the marketing home screen. */
function AppContent() {
  const location = useLocation();
  const navigate = useNavigate();
  const path = location.pathname;

  const standaloneRoutes = [
    "components/member/set-password",
    "components/member/reset-password",
    "components/member/set-new-password",
    "dashboard",
  ];

  if (standaloneRoutes.some((r) => path === `/${r}` || path === r)) {
    const goHome = () => navigate("/");
    return (
      <Routes>
        <Route
          path="components/member/set-password"
          element={<SetPassword onBack={goHome} />}
        />
        <Route
          path="components/member/reset-password"
          element={<ResetPassword onBack={goHome} />}
        />
        <Route
          path="components/member/set-new-password"
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

  const overlay =
    path === "/components/member/login"
      ? "login"
      : path === "/components/member/register"
        ? "register"
        : null;

  return <Home overlay={overlay} />;
}

/* ─── App Router ─── */
function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
}

export default App;
