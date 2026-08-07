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
  "fixed flex flex-col bg-[#1c2333] border-[1.5px] border-white/10 overflow-hidden rounded-[26px] z-[1001] [transition:top_0.32s_cubic-bezier(0.16,1,0.3,1),left_0.32s_cubic-bezier(0.16,1,0.3,1),width_0.32s_cubic-bezier(0.16,1,0.3,1),height_0.32s_cubic-bezier(0.16,1,0.3,1),border-radius_0.32s_cubic-bezier(0.16,1,0.3,1),border-width_0.32s_cubic-bezier(0.16,1,0.3,1),transform_0.32s_cubic-bezier(0.16,1,0.3,1),box-shadow_0.32s_ease,background_0.32s_ease,border-color_0.32s_ease]";
const phoneStagePanelOpenClass =
  // translateZ(48px) (with the backdrop's perspective above) is the "above
  // the screen" 3D lift — it grows in alongside width/height/etc since
  // transform is already in the transition list, so the panel rises toward
  // the viewer as it expands, and sinks back down as it shrinks on close.
  "top-1/2 left-1/2 [transform:translate(-50%,-50%)_translateZ(48px)] w-[min(420px,92vw)] h-[min(760px,88vh)] rounded-[36px] bg-[radial-gradient(circle_at_30%_0%,#263252,#1c2333_60%)] border-[0.5px] border-[rgba(var(--gold-rgb),0.16)] max-[480px]:w-[94vw] max-[480px]:h-[90vh] max-[480px]:rounded-[28px]";
// Same "phone" shell/morph as phoneStagePanelOpenClass, just sized to
// actually contain a full page's worth of content (Features/Rates/Help/
// Contact) instead of a login form — a fixed-but-generous target size
// rather than true CSS height:auto, since the FLIP grow/shrink transition
// above can only animate between two known sizes (auto isn't animatable).
// overflow-y-auto on phoneStageScreenClass is still the safety net for
// whatever doesn't fit even at this size.
const phoneStagePanelOpenWideClass =
  "top-1/2 left-1/2 [transform:translate(-50%,-50%)_translateZ(48px)] w-[min(760px,94vw)] h-[min(900px,90vh)] rounded-[28px] bg-[radial-gradient(circle_at_30%_0%,#263252,#1c2333_60%)] border-[0.5px] border-[rgba(var(--gold-rgb),0.16)] max-[480px]:w-[96vw] max-[480px]:h-[92vh] max-[480px]:rounded-[22px]";
const phoneStageNotchClass =
  "w-[42px] h-2 bg-[#0d1117] rounded mx-auto mt-[14px] flex-shrink-0 transition-opacity duration-200 ease-in-out";
const phoneStageScreenClass =
  "relative flex-1 mt-[10px] mx-[9px] mb-3 bg-card rounded-[20px] overflow-y-auto overflow-x-hidden [scrollbar-width:thin] [scrollbar-color:rgba(255,255,255,0.12)_transparent] [&::-webkit-scrollbar]:w-[5px] [&::-webkit-scrollbar-thumb]:bg-white/[0.12] [&::-webkit-scrollbar-thumb]:rounded";
const phoneStagePreviewClass =
  // Matches the panel's own 320ms so the preview finishes fading exactly
  // when the panel finishes growing/shrinking, instead of settling ~100ms
  // early and leaving a moment where the shape is still moving but nothing
  // else on screen is.
  "absolute inset-0 py-[10px] px-2 flex flex-col gap-[7px] opacity-100 transition-opacity duration-[320ms] ease-in-out pointer-events-none";
const phoneStagePreviewHideClass = "opacity-0";
const phoneStageContentClass =
  "px-[1.35rem] pt-[1.6rem] pb-[1.85rem] opacity-0 translate-y-[10px] transition-[opacity,transform] duration-[220ms] ease-in-out";
const phoneStageContentShowClass = "opacity-100 translate-y-0 delay-100";

/* ─── Navbar ─── */
function Navbar() {
  const navigate = useNavigate();
  return (
    <nav className="border-b-[0.5px] border-border sticky top-0 bg-[rgba(13,17,23,0.85)] backdrop-blur-[12px] z-[100]">
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
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex gap-6 max-[768px]:hidden">
          <button
            type="button"
            onClick={() => navigate("/")}
            className="bg-transparent border-0 p-0 text-[13px] text-[var(--muted)] no-underline transition-colors duration-200 hover:text-foreground cursor-pointer"
          >
            Home
          </button>
          <button
            type="button"
            onClick={() => navigate("/features")}
            className="bg-transparent border-0 p-0 text-[13px] text-[var(--muted)] no-underline transition-colors duration-200 hover:text-foreground cursor-pointer"
          >
            Features
          </button>
          <button
            type="button"
            onClick={() => navigate("/rates")}
            className="bg-transparent border-0 p-0 text-[13px] text-[var(--muted)] no-underline transition-colors duration-200 hover:text-foreground cursor-pointer"
          >
            Rates
          </button>
          <button
            type="button"
            onClick={() => navigate("/help")}
            className="bg-transparent border-0 p-0 text-[13px] text-[var(--muted)] no-underline transition-colors duration-200 hover:text-foreground cursor-pointer"
          >
            Help
          </button>
          <button
            type="button"
            onClick={() => navigate("/contact")}
            className="bg-transparent border-0 p-0 text-[13px] text-[var(--muted)] no-underline transition-colors duration-200 hover:text-foreground cursor-pointer"
          >
            Contact
          </button>
        </div>
        <button
          className="group inline-flex items-center gap-1.5 bg-gold text-[#111] border-none rounded-[20px] px-[1.3rem] py-[0.55rem] text-[13px] font-bold cursor-pointer shadow-[0_4px_14px_rgba(var(--gold-rgb),0.25)] transition-[background,transform,box-shadow] duration-200 hover:bg-gold-dark hover:-translate-y-0.5 hover:shadow-[0_8px_22px_rgba(var(--gold-rgb),0.4)]"
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
      // translateZ (no rotation) is the 3D lift — kept rotation-free
      // deliberately, since PhoneAuthStage measures this element's
      // axis-aligned getBoundingClientRect() to start its grow animation;
      // any rotateX/Y here would make that box no longer match what's
      // visually rendered and break the seamless start of that morph.
      className="absolute left-1/2 top-0 origin-top [transform:translate(-50%,0)_scale(1.55)_translateZ(60px)] w-[250px] bg-[#1c2333] rounded-[26px] border-[1.5px] border-[rgba(var(--gold-rgb),0.18)] pt-[10px] px-2 pb-[14px] shadow-[0_45px_90px_rgba(0,0,0,0.5),0_0_0_1px_rgba(255,255,255,0.04)_inset] z-[2] max-[768px]:w-[230px] max-[768px]:[transform:translate(-50%,0)_scale(1.35)_translateZ(60px)] max-[400px]:[transform:translate(-50%,0)_scale(1.15)_translateZ(60px)]"
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
  const isPage = ["features", "rates", "help", "contact"].includes(overlay);

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
                isExpanded
                  ? cn(
                      isPage
                        ? phoneStagePanelOpenWideClass
                        : phoneStagePanelOpenClass,
                      phoneStagePanelShadowOpenClass,
                    )
                  : phoneStagePanelShadowClosedClass,
              )}
              style={panelStyle}
            >
              <button
                type="button"
                className={cn(
                  "absolute top-[14px] right-[14px] z-[2] w-[30px] h-[30px] flex items-center justify-center bg-white/[0.06] border-[0.5px] border-white/[0.12] rounded-full text-[#9ca3af] cursor-pointer transition-[opacity,background,color,transform] duration-200 hover:bg-white/[0.12] hover:text-[#f9fafb] hover:rotate-90",
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
                    {overlay === "features" && <FeaturesContent />}
                    {overlay === "rates" && <RatesContent />}
                    {overlay === "help" && <HelpContent />}
                    {overlay === "contact" && <ContactContent />}
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
function Hero({ overlay, onCloseAuth }) {
  const navigate = useNavigate();
  return (
    <section className="relative flex flex-col items-center text-center min-h-screen pt-16 px-8 pb-12">
      <div className="fixed rounded-full border border-[rgba(var(--gold-rgb),0.07)] pointer-events-none w-[600px] h-[600px] -top-[160px] left-1/2 -translate-x-1/2" />
      <div className="fixed rounded-full border border-[rgba(var(--gold-rgb),0.07)] pointer-events-none w-[380px] h-[380px] -top-[60px] left-1/2 -translate-x-1/2" />
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
        Payzarc offers industry-leading exchange rates with no hidden fees. Save
        more for every transaction you make.
      </p>

      <div className="flex gap-3 mb-14 max-[480px]:flex-col max-[480px]:items-stretch">
        <button
          className="inline-flex items-center justify-center gap-2 bg-gold text-[#111] border-none rounded-[2rem] py-3 px-7 text-2xl font-semibold cursor-pointer transition-[background,transform] duration-200 hover:bg-gold-dark hover:-translate-y-px max-[768px]:text-lg"
          onClick={() => navigate("/components/member/register")}
        >
          Get started <ArrowRightIcon />
        </button>
        {/* <button className="bg-white/5 text-[#d1d5db] border-[0.5px] border-input rounded-[24px] py-3 px-7 text-sm font-medium cursor-pointer transition-colors duration-200 hover:bg-white/[0.09] max-[480px]:text-center">See how it works</button> */}
      </div>

      <div className="relative w-full max-w-[680px] h-[min(75vh,540px)] flex items-start justify-center [perspective:1400px] max-[768px]:h-[220px]">
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
            <div className="text-[11px] text-[rgba(var(--gold-rgb),0.5)] mt-[3px] tracking-[0.2px]">
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

/* ─── Footer — kept visually consistent with Dashboard.js's Footer: same
   stacked/centered mobile layout, logo+tagline as a plain row that stacks
   vertically on mobile, contact block centered underneath. Also `relative
   z-10` with a solid background: on mobile the hero's phone mockup is
   deliberately allowed to overflow down past the hero section (see Hero's
   preview box height below) so it's "buried" halfway under the footer —
   that only reads correctly if the footer paints on top of it and isn't
   see-through. */
function Footer() {
  return (
    <footer className="relative z-10 bg-background border-t-[0.5px] border-border">
      <div className="flex items-center justify-between max-w-[1120px] mx-auto px-8 py-5 flex-wrap gap-4 max-[768px]:flex-col max-[768px]:items-center max-[768px]:text-center max-[768px]:gap-5 max-[768px]:p-5">
        <div className="flex items-center gap-2.5 max-[768px]:flex-col max-[768px]:gap-2">
          <img
            src="/images/payzarc.png"
            className="h-[2.2rem] w-auto block"
            alt="Payzarc"
          />
          <p className="text-xs text-[var(--muted)]">
            Your trusted cross-border financial partner.
          </p>
        </div>
        <div className="flex flex-col gap-[3px] text-center">
          <a
            href="mailto:info.e@payzarc.com"
            className="text-xs font-semibold text-gold no-underline"
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
      </div>
    </footer>
  );
}

/* ─── Marketing pages (Features/Rates/Help/Contact) ───
   Rendered inside PhoneAuthStage's phone-mockup morph (see
   phoneStagePanelOpenWideClass) — same treatment as the Login/Register
   forms — instead of full standalone routes, so every Navbar link (which
   previously had no onClick at all) grows out of the hero mockup the same
   way logging in does. */
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
        titleClassName="whitespace-nowrap text-[clamp(1.3rem,3.6vw,2.6rem)]"
        subtitle="Everything in Payzarc is designed around real transfers, real rates, and real people — not just a wallet balance on a screen."
      />
      <div className="max-w-[720px]">
        {FEATURES_LIST.map(({ icon: Icon, title, description, details }, i) => {
          const isOpen = openTitle === title;
          return (
            <div
              key={title}
              className={cn(
                "border-white/[0.06]",
                i < FEATURES_LIST.length - 1 && "border-b",
              )}
            >
              <button
                type="button"
                onClick={() => setOpenTitle(isOpen ? null : title)}
                className="w-full flex items-center gap-4 py-5 bg-transparent border-none text-left cursor-pointer"
              >
                <div className="w-11 h-11 rounded-xl bg-[var(--gold-pale)] text-gold flex items-center justify-center shrink-0">
                  <Icon size={20} fill="currentColor" fillOpacity={0.25} />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-[15px] font-bold text-foreground m-0">
                    {title}
                  </h3>
                  <p className="text-[13px] text-[var(--muted)] leading-[1.5] m-0 mt-0.5">
                    {description}
                  </p>
                </div>
                <ChevronDown
                  size={18}
                  className={cn(
                    "text-[var(--muted)] shrink-0 transition-transform duration-200",
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
                  <div
                    className={cn(
                      "pb-5 pl-[3.75rem] pr-8 -mt-1 transition-[opacity,transform] duration-300 ease-in-out",
                      isOpen
                        ? "opacity-100 translate-y-0 delay-100"
                        : "opacity-0 -translate-y-1",
                    )}
                  >
                    <p className="text-[13.5px] text-[var(--muted)] leading-[1.65] m-0">
                      {details}
                    </p>
                  </div>
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
        <div className="bg-white/[0.03] border-[0.5px] border-border rounded-[20px] p-6">
          <Percent size={20} className="text-gold mb-3" />
          <h3 className="text-[15px] font-bold text-foreground m-0 mb-1.5">
            Flat sending fee
          </h3>
          <p className="text-[13.5px] text-[var(--muted)] leading-[1.6] m-0">
            1.5% per transfer, with a $1 minimum — shown up front before you
            send, never subtracted from the exchange rate.
          </p>
        </div>
        <div className="bg-white/[0.03] border-[0.5px] border-border rounded-[20px] p-6">
          <Globe size={20} className="text-gold mb-3" />
          <h3 className="text-[15px] font-bold text-foreground m-0 mb-1.5">
            Live market rates
          </h3>
          <p className="text-[13.5px] text-[var(--muted)] leading-[1.6] m-0">
            Rates refresh throughout the day to track the market — use the
            calculator below for an indicative quote.
          </p>
        </div>
        <div className="bg-white/[0.03] border-[0.5px] border-border rounded-[20px] p-6">
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
  return (
    <>
      <PageHeader
        eyebrow="Help center"
        title="Answers to the common stuff"
        subtitle="Can't find what you need? The team is one message away."
      />
      <div className="flex flex-col gap-3 max-w-[720px]">
        {FAQS.map(({ q, a }) => (
          <div
            key={q}
            className="bg-white/[0.03] border-[0.5px] border-border rounded-[16px] p-5"
          >
            <div className="flex items-center gap-2.5 mb-2">
              <HelpCircle size={16} className="text-gold shrink-0" />
              <h3 className="text-[14.5px] font-bold text-foreground m-0">
                {q}
              </h3>
            </div>
            <p className="text-[13.5px] text-[var(--muted)] leading-[1.6] m-0">
              {a}
            </p>
          </div>
        ))}
      </div>
      <button
        type="button"
        onClick={() => navigate("/contact")}
        className="inline-flex items-center gap-1.5 mt-8 bg-gold text-[#111] border-none rounded-[20px] px-[1.3rem] py-[0.7rem] text-[13px] font-bold cursor-pointer transition-all duration-200 hover:bg-gold-dark hover:-translate-y-0.5"
      >
        Contact support <ArrowRightIcon size={14} />
      </button>
    </>
  );
}

function ContactContent() {
  const [form, setForm] = useState({ name: "", email: "", message: "" });
  const [sent, setSent] = useState(false);

  const canSubmit = form.name && form.email && form.message;

  const submit = (e) => {
    e.preventDefault();
    if (!canSubmit) return;
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
      <div className="grid grid-cols-[280px_1fr] gap-8 max-[768px]:grid-cols-1">
        <div className="flex flex-col gap-4">
          <div className="flex items-start gap-3">
            <Mail size={18} className="text-gold shrink-0 mt-0.5" />
            <div>
              <p className="text-[13px] font-semibold text-foreground m-0">
                Email
              </p>
              <a
                href="mailto:info.e@payzarc.com"
                className="text-[13px] text-[var(--muted)] no-underline hover:text-gold"
              >
                info.e@payzarc.com
              </a>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <Phone size={18} className="text-gold shrink-0 mt-0.5" />
            <div>
              <p className="text-[13px] font-semibold text-foreground m-0">
                Phone
              </p>
              <p className="text-[13px] text-[var(--muted)] m-0">
                +1 (713) 822-8593
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <MapPin size={18} className="text-gold shrink-0 mt-0.5" />
            <div>
              <p className="text-[13px] font-semibold text-foreground m-0">
                Office
              </p>
              <p className="text-[13px] text-[var(--muted)] m-0">
                Kew Gardens Dr Houston Tx, USA
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white/[0.03] border-[0.5px] border-border rounded-[20px] p-6">
          {sent ? (
            <div className="flex flex-col items-center text-center gap-3 py-8">
              <CheckCircle2 size={40} className="text-success" />
              <h3 className="text-[16px] font-bold text-foreground m-0">
                Message sent
              </h3>
              <p className="text-[13.5px] text-[var(--muted)] m-0">
                Thanks, {form.name.split(" ")[0]} — we'll get back to you at{" "}
                {form.email} soon.
              </p>
            </div>
          ) : (
            <form onSubmit={submit} className="flex flex-col gap-4">
              <input
                type="text"
                placeholder="Your name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full p-3.5 bg-white/[0.06] text-foreground border-[0.5px] border-white/10 rounded-[10px] text-[14px] outline-none transition-colors duration-200 focus:border-gold placeholder:text-[var(--muted)]"
              />
              <input
                type="email"
                placeholder="Your email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="w-full p-3.5 bg-white/[0.06] text-foreground border-[0.5px] border-white/10 rounded-[10px] text-[14px] outline-none transition-colors duration-200 focus:border-gold placeholder:text-[var(--muted)]"
              />
              <textarea
                placeholder="How can we help?"
                rows={5}
                value={form.message}
                onChange={(e) =>
                  setForm({ ...form, message: e.target.value })
                }
                className="w-full p-3.5 bg-white/[0.06] text-foreground border-[0.5px] border-white/10 rounded-[10px] text-[14px] outline-none transition-colors duration-200 focus:border-gold placeholder:text-[var(--muted)] resize-none"
              />
              <button
                type="submit"
                disabled={!canSubmit}
                className="w-full py-[0.9rem] bg-gold text-[#111] border-none rounded-md text-[15px] font-bold cursor-pointer transition-[background,transform] duration-200 hover:bg-gold-dark hover:-translate-y-px disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0"
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
   rather than "a new page appeared". */
function Home({ overlay }) {
  const navigate = useNavigate();
  const closeOverlay = () => navigate("/");

  return (
    <div className="bg-[#0602145f] bg-fixed overflow-x-hidden">
      <div className="bg-[radial-gradient(ellipse_120%_60%_at_50%_-10%,rgba(38,50,82,0.6),var(--bg)_60%)] bg-fixed text-foreground font-sans min-h-screen leading-[1.6] overflow-x-hidden">
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

  // Features/Rates/Help/Contact grow out of the hero's phone mockup the
  // same way Login/Register do (see PhoneAuthStage) — Home stays mounted
  // underneath and only the overlay value changes, rather than unmounting
  // into a separate standalone page.
  const OVERLAY_PATHS = {
    "/components/member/login": "login",
    "/components/member/register": "register",
    "/features": "features",
    "/rates": "rates",
    "/help": "help",
    "/contact": "contact",
  };
  const overlay = OVERLAY_PATHS[path] || null;

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
