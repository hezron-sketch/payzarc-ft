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
import styles from "./App.module.css";
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

/* ─── Navbar ─── */
function Navbar() {
  const navigate = useNavigate();
  return (
    <nav className={styles.navbar}>
      <div className={styles.navInner}>
        <div className={styles.navLeft}>
          <div className={styles.navBrand}>
            <div className={styles.navLogo}>
              <img
                src="/images/payzarc.png"
                className={styles.logo}
                alt="Payzarc-logo"
              />
            </div>
            {/* <span className={styles.navName}>Payzarc</span> */}
          </div>
        </div>
        <div className={styles.navLinks}>
          <a href="#">Home</a>
          <a href="#">Features</a>
          <a href="#">Rates</a>
          <a href="#">Help</a>
          <a href="#">Contact</a>
        </div>
        <button
          className={styles.navBtn}
          onClick={() => navigate("/components/member/login")}
        >
          Login <ArrowRightIcon size={14} />
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
      className={styles.phoneFrame}
      style={hidden ? { visibility: "hidden" } : undefined}
    >
      <div className={styles.phoneNotch} />
      <div className={styles.phoneScreen}>
        <div className={styles.psHeader}>
          <div className={styles.psLogo} />
          <div className={styles.psDots}>
            <div className={styles.psDot} />
            <div className={styles.psDot} />
            <div className={styles.psDot} />
          </div>
        </div>
        <div className={styles.psGreeting}>Hello,</div>
        <div className={styles.psName}>Elaine W.</div>
        <div className={styles.psBalanceCard}>
          <div className={styles.psBalLabel}>Wallet balance</div>
          <div className={styles.psBalAmount}>$4,820.00</div>
        </div>
        <div className={styles.psSendLabel}>Send to</div>
        <div className={styles.psRecipients}>
          {[
            { initials: "JM", bg: "#fde68a", color: "#78350f", name: "James" },
            { initials: "SA", bg: "#bfdbfe", color: "#1e3a5f", name: "Sarah" },
            { initials: "NK", bg: "#d9f99d", color: "#365314", name: "Nora" },
            { initials: "+", bg: "#fecdd3", color: "#881337", name: "More" },
          ].map((r) => (
            <div key={r.name} className={styles.psRec}>
              <div
                className={styles.psRecAv}
                style={{ background: r.bg, color: r.color }}
              >
                {r.initials}
              </div>
              <div className={styles.psRecName}>{r.name}</div>
            </div>
          ))}
        </div>
        <div className={styles.psActivity}>Recent activity</div>
        <div className={styles.psTx}>
          {[
            { flag: "🇳🇬", name: "Nigeria", amt: "+NGN 90K" },
            { flag: "🇮🇳", name: "India", amt: "+INR 41K" },
            { flag: "🇰🇪", name: "Kenya", amt: "+KES 25K" },
          ].map((t) => (
            <div key={t.name} className={styles.psRow}>
              <span className={styles.psFlag}>{t.flag}</span>
              <span className={styles.psTxName}>{t.name}</span>
              <span className={styles.psTxAmt}>{t.amt}</span>
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
   mockup rather than the page navigating away. */
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
            className={`${styles.phoneStageBackdrop} ${isExpanded ? styles.phoneStageBackdropOpen : ""}`}
            onMouseDown={(e) => {
              if (e.target === e.currentTarget) onClose();
            }}
          >
            <div
              className={`${styles.phoneStagePanel} ${isExpanded ? styles.phoneStagePanelOpen : ""}`}
              style={panelStyle}
            >
              <button
                type="button"
                className={styles.phoneStageCloseBtn}
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

              <div className={styles.phoneStageNotch} />

              <div className={styles.phoneStageScreen}>
                <div
                  className={`${styles.phoneStagePreview} ${isExpanded ? styles.phoneStagePreviewHide : ""}`}
                >
                  <div className={styles.psHeader}>
                    <div className={styles.psLogo} />
                    <div className={styles.psDots}>
                      <div className={styles.psDot} />
                      <div className={styles.psDot} />
                      <div className={styles.psDot} />
                    </div>
                  </div>
                  <div className={styles.psGreeting}>Hello,</div>
                  <div className={styles.psName}>Elaine W.</div>
                  <div className={styles.psBalanceCard}>
                    <div className={styles.psBalLabel}>Wallet balance</div>
                    <div className={styles.psBalAmount}>$4,820.00</div>
                  </div>
                </div>

                <div
                  className={`${styles.phoneStageContent} ${isExpanded ? styles.phoneStageContentShow : ""}`}
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
      className={`${styles.floatCard} ${side === "left" ? styles.floatLeft : styles.floatRight}`}
    >
      <div className={styles.fcIcon} style={{ background: iconBg }}>
        {icon}
      </div>
      <div>
        <div className={styles.fcLabel}>{label}</div>
        <div className={styles.fcValue}>{value}</div>
        <div className={styles.fcSub}>{sub}</div>
      </div>
    </div>
  );
}

/* ─── Hero Section ─── */
function Hero({ overlay, onCloseAuth }) {
  const navigate = useNavigate();
  return (
    <section className={styles.hero}>
      <div className={`${styles.bgRing} ${styles.ringLg}`} />
      <div className={`${styles.bgRing} ${styles.ringSm}`} />
      <div className={`${styles.bgRing} ${styles.ringInner}`} />

      {/* <div className={styles.trustPill}>
        <div className={styles.avatars}>
          <div className={`${styles.av} ${styles.av1}`}>J</div>
          <div className={`${styles.av} ${styles.av2}`}>A</div>
          <div className={`${styles.av} ${styles.av3}`}>M</div>
        </div>
        phoneFrame Trusted by 21,000+ people worldwide
      </div> */}
      <h1 className={styles.heroTitle}>PAYZARC</h1>

      <h1 className={styles.heroHeadline}>
        Send money
        <br />
        at <span className={styles.accent}>Lower Rates</span>
      </h1>

      <p className={styles.heroSub}>
        Payzarc offers industry-leading exchange rates with no hidden fees. Save
        more for every transaction you make.
      </p>

      <div className={styles.heroCta}>
        <button
          className={styles.ctaPrimary}
          onClick={() => navigate("/components/member/register")}
        >
          Get started <ArrowRightIcon />
        </button>
        {/* <button className={styles.ctaSecondary}>See how it works</button> */}
      </div>

      <div className={styles.illustrationArea}>
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

        <div className={styles.ratePill}>
          <div className={styles.rateDot} />
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

function FeaturesStrip() {
  return (
    <div className={styles.featuresRow}>
      {FEATURES.map((f) => (
        <div key={f.title} className={styles.featItem}>
          <div className={styles.featIcon} style={{ background: f.iconBg }}>
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
          <div className={styles.featTitle}>{f.title}</div>
          <div className={styles.featDesc}>{f.desc}</div>
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
    <div className={styles.converterSection}>
      <h2 className={styles.convTitle}>Calculate your transfer</h2>
      <p className={styles.convSub}>Real-time rates, zero surprises.</p>

      <div className={styles.converterBox}>
        <span className={styles.convLabel}>Exchange calculator</span>

        <div className={styles.selectRow}>
          <select
            className={styles.dropdown}
            value={fromCountry}
            onChange={handleFrom}
          >
            <option value="">From country</option>
            {Object.keys(COUNTRIES).map((c) => (
              <option key={c} value={c}>
                {c} ({COUNTRIES[c]})
              </option>
            ))}
          </select>
          <select
            className={styles.dropdown}
            value={toCountry}
            onChange={handleTo}
          >
            <option value="">To country</option>
            {Object.keys(COUNTRIES).map((c) => (
              <option key={c} value={c}>
                {c} ({COUNTRIES[c]})
              </option>
            ))}
          </select>
        </div>

        <input
          type="number"
          className={styles.amountInput}
          placeholder="Enter amount"
          value={fromValue}
          onChange={handleAmount}
          min="1"
          max="1000000"
        />

        {toValue && (
          <div className={styles.resultBox}>
            <div className={styles.resultAmount}>
              {Number(toValue).toLocaleString()} {COUNTRIES[toCountry]}
            </div>
            <div className={styles.resultMeta}>
              1 {COUNTRIES[fromCountry]} ={" "}
              {EXCHANGE_RATES[COUNTRIES[fromCountry]]?.[COUNTRIES[toCountry]]}{" "}
              {COUNTRIES[toCountry]} · indicative rate
            </div>
          </div>
        )}

        {canSend && (
          <button
            className={styles.sendBtn}
            onClick={() => navigate("/components/member/login")}
          >
            Send to {toCountry} →
          </button>
        )}
      </div>

      <div className={styles.quickSection}>
        <p className={styles.quickLabel}>Popular destinations</p>
        <div className={styles.destinations}>
          {QUICK_DESTINATIONS.map((d) => (
            <button
              key={d.name}
              className={styles.destBtn}
              onClick={() => handleQuickDest(d)}
            >
              <span className={styles.destFlag}>{d.flag}</span>
              <span className={styles.destName}>{d.name}</span>
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
    <footer className={styles.footer}>
      <div className={styles.footerInner}>
        <div className={styles.footerLeft}>
          <div className={styles.navBrand}>
            <div className={styles.navLogo}>
              <img src="/images/payzarc.png" className={styles.logo} />
            </div>
            {/* <span className={styles.navName}>Payzarc</span> */}
            <p className={styles.footerTagline}>
              Your trusted cross-border financial partner.
            </p>
          </div>
        </div>
        <div className={styles.footerMid}>
          <a href="mailto:info.e@payzarc.com" className={styles.footerEmail}>
            info.e@payzarc.com
          </a>
          <span className={styles.footerPhone}>+1 (713) 822-8593</span>
          <span className={styles.footerAddr}>
            Kew Gardens Dr Houston Tx, USA
          </span>
        </div>
        {/* <div className={styles.trustBadge}>
          <div className={styles.trustDot} />
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
    <div className={styles.pageWrap}>
      <div className={styles.page}>
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
            // <ProtectedRoute>
            <Dashboard onBack={goHome} />
            // </ProtectedRoute>
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
