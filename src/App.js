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
  ArrowRightIcon,
  Send,
  Globe,
  ShieldCheck,
  UsersRound,
  Zap,
  Percent,
  HelpCircle,
  Mail,
  Phone,
  MapPin,
  CheckCircle2,
  ChevronDown,
} from "lucide-react";
import { EXCHANGE_RATES } from "./utility/exchangeRates";
import { PRO_PLAN_PRICE } from "./utility/constants";
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

// Picks a random hero destination that isn't the one currently shown on the
// other floating card, so the two never quote the same currency at once.
function pickHeroDestination(excludeCurrency) {
  const pool = QUICK_DESTINATIONS.filter((d) => d.currency !== excludeCurrency);
  return pool[Math.floor(Math.random() * pool.length)];
}

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
  // perspective here is what makes the panel's translateZ (below) actually
  // read as depth instead of doing nothing — 3D transforms only render with
  // foreshortening relative to a perspective set on an ancestor.
  "fixed inset-0 z-[1000] flex items-center justify-center px-4 py-8 [perspective:1200px] bg-[rgba(6,8,14,0)] [backdrop-filter:blur(0px)] [-webkit-backdrop-filter:blur(0px)] transition-[background,backdrop-filter] duration-[320ms] ease-[cubic-bezier(0.22,1,0.36,1)]";
const phoneStageBackdropOpenClass =
  "bg-[rgba(6,8,14,0.62)] [backdrop-filter:blur(7px)] [-webkit-backdrop-filter:blur(7px)]";
// Shadow while pinned to the mockup's spot (flat against the page, matching
// the resting PhoneMockup's own shadow) vs once expanded (bigger + more
// diffuse, selling the "lifted toward the viewer" 3D effect below).
const phoneStagePanelShadowClosedClass =
  "shadow-[0_30px_80px_rgba(0,0,0,0.55)]";
const phoneStagePanelShadowOpenClass =
  "shadow-[0_55px_100px_rgba(0,0,0,0.5),0_100px_180px_-40px_rgba(0,0,0,0.6)]";
const phoneStagePanelClass =
  // mask-image forces Chrome to clip this element's rounded corners on its
  // own masking layer instead of the default overflow-hidden+3D-transform
  // path — without it, translateZ (below, once expanded) makes the browser
  // clip border-radius against the un-transformed layer, leaving a jagged
  // sliver of the square edge visible past the rounded corner.
  "fixed flex flex-col p-[8px] border-[1.5px] border-white/10 overflow-hidden rounded-[var(--r)] [mask-image:radial-gradient(white,black)] [-webkit-mask-image:-webkit-radial-gradient(white,black)] z-[1001] [transition:top_0.32s_cubic-bezier(0.16,1,0.3,1),left_0.32s_cubic-bezier(0.16,1,0.3,1),width_0.32s_cubic-bezier(0.16,1,0.3,1),height_0.32s_cubic-bezier(0.16,1,0.3,1),border-radius_0.32s_cubic-bezier(0.16,1,0.3,1),border-width_0.32s_cubic-bezier(0.16,1,0.3,1),transform_0.32s_cubic-bezier(0.16,1,0.3,1),box-shadow_0.32s_ease,background_0.32s_ease,border-color_0.32s_ease]";
const phoneStagePanelOpenClass =
  // translateZ(48px) (with the backdrop's perspective above) is the "above
  // the screen" 3D lift — it grows in alongside width/height/etc since
  // transform is already in the transition list, so the panel rises toward
  // the viewer as it expands, and sinks back down as it shrinks on close.
  // Height-driven with width = height × 9/19.5 (PhoneFrame's own ratio) so
  // the modal keeps a phone's proportions at every viewport height, instead
  // of a fixed 420px width that went squat on shorter screens. The min()
  // against 92vw keeps it from overflowing narrow-but-tall windows.
  "top-1/2 left-1/2 [transform:translate(-50%,-50%)_translateZ(48px)] h-[min(820px,88vh)] w-[min(calc(min(820px,88vh)*9/19.5),92vw)] [--r:44px] border-[0.5px] border-[rgba(var(--gold-rgb),0.16)] max-[480px]:w-[94vw] max-[480px]:h-[90vh] max-[480px]:[--r:36px]";
// Notch hangs from the screen's top edge (top = the panel's 8px bezel) in
// the bezel's own color, like an iPhone's.
const phoneStageNotchClass =
  "top-[8px] w-[40%] h-[22px] rounded-b-[14px]";
// Screen radius = panel radius (--r) − 8px bezel, keeping corners concentric.
const phoneStageScreenClass =
  "relative flex-1 bg-card rounded-[calc(var(--r)-8px)] [transition:border-radius_0.32s_cubic-bezier(0.16,1,0.3,1)] overflow-y-auto overflow-x-hidden [scrollbar-width:thin] [scrollbar-color:rgba(255,255,255,0.12)_transparent] [&::-webkit-scrollbar]:w-[5px] [&::-webkit-scrollbar-thumb]:bg-white/[0.12] [&::-webkit-scrollbar-thumb]:rounded";
const phoneStagePreviewClass =
  // Matches the panel's own 320ms so the preview finishes fading exactly
  // when the panel finishes growing/shrinking, instead of settling ~100ms
  // early and leaving a moment where the shape is still moving but nothing
  // else on screen is.
  "absolute inset-0 pt-[30px] pb-[10px] px-2 flex flex-col gap-[7px] opacity-100 transition-opacity duration-[320ms] ease-in-out pointer-events-none";
const phoneStagePreviewHideClass = "opacity-0";
const phoneStageContentClass =
  "px-[1.35rem] pt-[2.75rem] pb-[1.85rem] opacity-0 translate-y-[10px] transition-[opacity,transform] duration-[220ms] ease-in-out";
const phoneStageContentShowClass = "opacity-100 translate-y-0 delay-100";

/* ─── Navbar ─── */
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
    <nav className="border-b-[0.5px] border-border sticky top-0 bg-[rgba(13,17,23,0.85)] z-[100]">
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
            {/* <span className="text-[17px] font-bold text-foreground tracking-[-0.3px]">Payzarc</span> */}
          </div>
        </div>
        {/* Absolutely positioned instead of a grid/flex sibling — same fix
        as Dashboard.js's topbar — so it never fights the logo/login button
        for space; it's just hidden below md anyway. */}
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
          className="group inline-flex items-center gap-1.5 bg-gold text-[#111] border-none rounded-md px-[1.3rem] py-[0.4rem] text-[13px] font-bold cursor-pointer shadow-[0_4px_14px_rgba(var(--gold-rgb),0.25)] transition-[background,transform,box-shadow] duration-200 hover:bg-gold-dark hover:-translate-y-0.5 hover:shadow-[0_8px_22px_rgba(var(--gold-rgb),0.4)]"
          onClick={() => navigate("/login")}
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
function PhoneAuthStage({ overlay, onClose, mockupRef }) {
  const anchorRef = useRef(null);
  const closeTimerRef = useRef(null);
  const [rect, setRect] = useState(null);
  // closed -> opening -> open -> closing -> closed
  const [phase, setPhase] = useState("closed");

  // Start the grow animation: snapshot the mockup's rect, then flip to
  // "opening" so we can render the clone in that exact spot first.
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
    const node = anchorRef.current;
    const r = node.getBoundingClientRect();
    const scale = r.width / node.offsetWidth;
    setRect({ top: r.top, left: r.left, width: r.width, height: r.height, scale });
    setPhase("closing");
    return undefined;
    // Must only re-run when overlay flips, so it captures phase as of that
    // moment; adding phase would re-fire this on every phase transition and
    // re-snapshot the rect.
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
                  ? cn(phoneStagePanelOpenClass, phoneStagePanelShadowOpenClass)
                  : phoneStagePanelShadowClosedClass,
              )}
              style={panelStyle}
            >
              <button
                type="button"
                className={cn(
                  "absolute top-[20px] right-[20px] z-[2] w-[30px] h-[30px] flex items-center justify-center bg-white/[0.06] border-[0.5px] border-white/[0.12] rounded-full text-[#9ca3af] cursor-pointer transition-[opacity,background,color,transform] duration-200 hover:bg-white/[0.12] hover:text-[#f9fafb] hover:rotate-90",
                  // Delay only on the way in, so it appears once the panel
                  // has mostly finished growing instead of popping in ~120ms
                  // early; no delay on the way out, so it disappears
                  // immediately when closing starts.
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
                  {/* key={overlay} forces a fresh element (and thus the
                  fade-in below) whenever overlay flips between "login" and
                  "register" — including the two-truthy-values case where
                  the panel itself is already open and never re-runs its own
                  grow/shrink effects (see the Link inside each form to the
                  other). Rendering straight off `overlay` (not a separately
                  tracked copy) means this can never end up stuck showing
                  neither form. */}
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
const HERO_SEND_AMOUNT = 2000;

function Hero({ overlay, onCloseAuth }) {
  const navigate = useNavigate();
  const mockupNodeRef = useRef(null);

  // The "buried under the footer" effect needs the preview box to be
  // shorter than the phone mockup's actual rendered height, and Footer
  // (a sibling under Home, not a child here) needs to be told how tall a
  // buffer to add so the buried slice stays inside its own painted
  // background instead of spilling out past it. A static px guess for that
  // height broke on real content (fonts/line-heights render taller than
  // estimated), so this measures the mockup directly and republishes it as
  // CSS vars on the root — read by both the box below (--phone-box-h) and
  // Footer's top buffer (--phone-footer-buffer) — instead of guessing again.
  useLayoutEffect(() => {
    const el = mockupNodeRef.current;
    if (!el) return undefined;
    const update = () => {
      const h = el.getBoundingClientRect().height;
      if (!h) return;
      const overlap = Math.round(h * 0.32);
      const root = document.documentElement.style;
      root.setProperty("--phone-box-h", `${Math.round(h - overlap)}px`);
      root.setProperty("--phone-footer-buffer", `${overlap}px`);
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    window.addEventListener("resize", update);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", update);
    };
  }, []);

  // Live-looking rates on the two floating cards: each swaps to a random
  // destination currency every 10s, staggered 5s apart (one tick alternates
  // which side updates) so they never change in lockstep or show the same
  // currency at the same time.
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
    <section className="relative flex flex-col items-center text-center min-h-screen pt-16 px-8 pb-12">
      {/* The two larger rings moved to Home, shared across every panel
          instead of Hero-only — see the comment there. */}
      <div className="absolute rounded-full border border-[rgba(var(--gold-rgb),0.07)] pointer-events-none" />

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

      <h1 className="text-[2rem] font-bold leading-[1.1] tracking-[-1.5px] text-foreground max-w-[520px] m-12 max-[768px]:text-lg max-[768px]:mx-4 max-[768px]:my-6">
        Send money
        <br />
        at <span className="text-gold">Lower Rates</span>
      </h1>

      <p className="text-[1.3rem] text-[var(--muted)] max-w-[400px] leading-[1.7] mb-8 max-[768px]:text-sm">
        Payzarc offers industry-leading exchange rates with no hidden fees on
        local and international transfers. Save more for every transaction
        you make.
      </p>

      <div className="flex gap-3 mb-14 max-[480px]:flex-col max-[480px]:items-stretch">
        <button
          className="inline-flex items-center justify-center gap-2 bg-gold text-[#111] border-none rounded-md py-2 px-7 text-2xl font-semibold cursor-pointer transition-[background,transform] duration-200 hover:bg-gold-dark hover:-translate-y-px max-[768px]:text-lg"
          onClick={() => navigate("/register")}
        >
          Get started <ArrowRightIcon />
        </button>
        {/* <button className="bg-white/5 text-[#d1d5db] border-[0.5px] border-input rounded-md py-2 px-7 text-sm font-medium cursor-pointer transition-colors duration-200 hover:bg-white/[0.09] max-[480px]:text-center">See how it works</button> */}
      </div>

      {/* Lives above the phone/cards group rather than below it — the box
          below is deliberately shorter than the mockup so the phone
          overflows into Footer, which leaves no clear space under the phone
          for this pill anymore. */}
      <div className="relative z-[3] mb-4 inline-flex items-center gap-1.5 bg-success/[0.08] border-[0.5px] border-success/25 rounded-[20px] py-[5px] px-3 text-[11px] text-success whitespace-nowrap">
        <div className="w-1.5 h-1.5 rounded-full bg-success flex-shrink-0" />
        Live rate · updated 2s ago
      </div>

      {/* Box is intentionally shorter than PhoneMockup's own rendered height
          so the mockup overflows past it — and past Hero's bottom edge
          straight into Footer, which paints over the buried bottom slice
          (see Footer's comment). --phone-box-h is set by the measurement
          effect above (~68% of the mockup's real height, same ratio at any
          breakpoint since it's re-measured on resize), with this 260px
          only as the first-paint fallback before that effect runs. */}
      <div className="relative w-full max-w-[680px] h-[var(--phone-box-h,260px)] flex items-start justify-center [perspective:1400px]">
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
          sub={`USD · 1 = ${sendDest.currency} ${sendRate}`}
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
          sub={`${receiveDest.currency} · fees: ${receiveDest.symbol}0.00`}
        />
      </div>
    </section>
  );
}

/* ─── Features Strip ─── */
const FEATURES = [
  {
    iconBg: "rgba(var(--gold-rgb),0.12)",
    iconStroke: "var(--gold)",
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
          className="bg-white/[0.03] backdrop-blur-[8px] border-[0.5px] border-border rounded-[14px] p-5 flex flex-col gap-1.5 transition-[border-color,background] duration-200 hover:bg-white/[0.055] hover:border-input"
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

/* ─── Footer ───
   `relative z-10` with a solid background: the hero's phone mockup is
   deliberately allowed to overflow down past the hero section (see Hero's
   preview box) so it's "buried" under the footer — that only reads
   correctly if the footer paints on top of it and isn't see-through, and
   is tall enough to actually contain the buried slice instead of it
   sticking out past Footer's own bottom edge. min-h-[var(--phone-footer-buffer)]
   (set by Hero's measurement effect to the real overflow amount) is a
   floor, not padding: with this much real content the footer is already
   taller than that floor in the normal case, so content still starts
   flush at the top border; the floor only pads out empty space below the
   content — instead of pushing it down from above — on the rare
   viewport/content combo where the overflow is taller than the content. */
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
    // flex-shrink-0: without it, a flex item's explicit min-height (the
    // buffer below) replaces its *default* min-height, which is normally
    // "never shrink below your own content" — on a marketing-page pane
    // where content is taller than the viewport, that let flex-shrink
    // compress this footer down to the (much smaller) buffer value,
    // clipping nothing itself (overflow:visible) but leaving its content
    // spilling past its own background box, into the page's bg behind it.
    <footer className="relative z-10 flex-shrink-0 bg-[rgba(13,17,23,0.85)] backdrop-blur-[12px] border-t-[0.5px] border-border min-h-[var(--phone-footer-buffer,0px)]">
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

/* ─── Marketing pages (Features/Rates/Help/Contact) ───
   Full-width panels in Home's horizontal strip (see PANEL_ORDER + MarketingPage
   above Home) — each wrapped by MarketingPage there, not by these
   components directly. */
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
      {/* Was a single-column accordion list, sized for the old ~380px phone
          panel — a 3-up card grid (matching Rates' card style) actually
          uses the page's real width instead of leaving it mostly empty.
          Each card keeps the same expand-for-detail interaction (same
          grid-template-rows 0fr->1fr trick), just triggered by its own
          "Learn more" instead of the whole row being a giant button. */}
      <div className="grid grid-cols-3 gap-5 max-[1024px]:grid-cols-2 max-[640px]:grid-cols-1">
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

              {/* grid-template-rows 0fr->1fr instead of conditional
                  mount/unmount — animates smoothly both ways (open AND
                  close) without measuring scrollHeight in JS. */}
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
      <div className="grid grid-cols-3 gap-5 mb-4 max-[768px]:grid-cols-1">
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
  // Single index open at a time — a standard accordion, not a checklist of
  // independently-toggled panels.
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
                <HelpCircle size={16} className="text-gold shrink-0" />
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
        className="inline-flex items-center gap-1.5 mt-8 bg-gold text-[#111] border-none rounded-md px-[1.3rem] py-2 text-[13px] font-bold cursor-pointer transition-all duration-200 hover:bg-gold-dark hover:-translate-y-0.5"
      >
        Contact support <ArrowRightIcon size={14} />
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
    // No support-ticketing backend exists for the marketing site — this is
    // an honest client-side "mock success", same pattern the rest of the
    // app uses for flows without a real endpoint behind them yet.
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
                <CheckCircle2 size={28} className="text-success" />
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

/* ─── Home Page ───
   Home is the single source of truth for the app's visual language, and it
   stays mounted for "/", the login route, and the register route — only the
   `overlay` value changes. Auth no longer opens as a separate modal: the
   phone mockup in the hero morphs directly into the login/register screen
   (see PhoneAuthStage), so the transition reads as "this page transformed"
   rather than "a new page appeared". Features/Rates/Help/Contact get the
   same treatment at the page level now: one fixed shell (Navbar + a single
   scrollable pane below), and navigating between them swaps the pane's
   content in place with a smooth rise (animate-page-swap-in) instead of
   sliding between separate full-screen panels — so it reads as "this page's
   content changed", not "a new page appeared", matching Login/Register. */
const PANEL_ORDER = ["home", "features", "rates", "help", "contact"];

// min-h-full (not h-full) — unlike the old multi-panel strip, only one of
// these is ever mounted at a time now, so it can grow taller than the pane
// and let the pane's own overflow-y-auto handle it, instead of needing a
// fixed height itself. flex-col + flex-1 on the content wrapper still
// pushes Footer to the bottom on pages shorter than the viewport.
// No Footer here anymore — it's rendered once at the Home level now,
// outside the swapped content, so it doesn't unmount/remount (and flicker)
// on every page change. See Home.
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
  // Login/Register still morph out of the hero's own phone mockup, so
  // opening either forces the pane back to "home" content first — needed
  // for PhoneAuthStage to have a mounted mockup to measure regardless of
  // which page the user was on when they hit the navbar's Login button.
  const panel = isAuthOverlay
    ? "home"
    : PANEL_ORDER.includes(overlay)
      ? overlay
      : "home";

  return (
    // Fixed-height app shell (h-screen, overflow-hidden): Navbar stays put,
    // and the single pane below is the only thing that scrolls — switching
    // pages never scrolls the whole document, just swaps this pane's
    // content. No bg-fixed needed since this shell itself never scrolls.
    <div className="h-screen overflow-hidden bg-[#0602145f] flex flex-col">
      <div className="relative flex-1 min-h-0 flex flex-col bg-[radial-gradient(ellipse_120%_60%_at_50%_-10%,rgba(38,50,82,0.6),var(--bg)_60%)] text-foreground font-sans leading-[1.6] overflow-hidden">
        {/* Shared across every page (was Hero-only) — sits at this level so
            it isn't tied to any one page's content and never scrolls away,
            same as the gradient background above. */}
        <div className="absolute rounded-full border border-[rgba(var(--gold-rgb),0.07)] pointer-events-none w-[600px] h-[600px] -top-[160px] left-1/2 -translate-x-1/2" />
        <div className="absolute rounded-full border border-[rgba(var(--gold-rgb),0.07)] pointer-events-none w-[380px] h-[380px] -top-[60px] left-1/2 -translate-x-1/2" />

        <Navbar />

        {/* flex-col here (not on the key={panel} div below) — Footer sits
            outside the swapped/animated block as a stable sibling, so it
            never unmounts or re-plays an entrance animation on page change,
            same as Navbar. flex-1 on the swapped block still pushes Footer
            to the bottom of the pane on pages shorter than the viewport. */}
        <div className="relative flex-1 min-h-0 overflow-y-auto flex flex-col">
          {/* key={panel}, not overlay — opening Login/Register while
              already on "home" shouldn't re-trigger this fade (that's
              PhoneAuthStage's own transition); only an actual page change
              should. */}
          <div key={panel} className="flex-1 animate-page-swap-in">
            {panel === "home" && (
              <Hero
                overlay={isAuthOverlay ? overlay : null}
                onCloseAuth={closeOverlay}
              />
            )}
            {/* <FeaturesStrip /> */}
            {/* <Converter /> */}
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

/* ─── App Content ───
   Home is rendered unconditionally so it never unmounts while the user
   opens/closes the login or register overlay — only the `overlay` value
   changes. Fully separate destinations (password recovery, the logged-in
   dashboard) remain standalone pages via <Routes>, since they represent a
   genuinely different context from the marketing home screen. */
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

  // Features/Rates/Help/Contact grow out of the hero's phone mockup the
  // same way Login/Register do (see PhoneAuthStage) — Home stays mounted
  // underneath and only the overlay value changes, rather than unmounting
  // into a separate standalone page.
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

/* ─── App Router ─── */
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
