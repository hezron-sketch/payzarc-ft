import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import {
  ArrowLeft,
  User,
  Mail,
  Lock,
  Eye,
  EyeOff,
  AlertCircle,
  KeyRound,
} from "lucide-react";
import axiosInstance from "../../utility/axiosInstance";
import styles from "./Login.module.css";

/* ─── Mini phone illustration ─── */
function PhoneIllustration() {
  return (
    <div className={styles.phoneIllustration}>
      <div className={styles.illPhone}>
        <div className={styles.illNotch} />
        <div className={styles.illScreen}>
          <div className={styles.illHeader}>
            <div className={styles.illBrand} />
            <div className={styles.illDots}>
              <span />
              <span />
              <span />
            </div>
          </div>
          <div className={styles.illBal}>
            <div className={styles.illBalLabel}>Total balance</div>
            <div className={styles.illBalAmt}>$4,820.00</div>
          </div>
          <div className={styles.illTxList}>
            {[
              {
                flag: "🇳🇬",
                name: "Nigeria",
                amt: "+NGN 90K",
                color: "#4ade80",
              },
              { flag: "🇮🇳", name: "India", amt: "+INR 41K", color: "#4ade80" },
              { flag: "🇰🇪", name: "Kenya", amt: "+KES 25K", color: "#4ade80" },
            ].map((t) => (
              <div key={t.name} className={styles.illTxRow}>
                <span className={styles.illFlag}>{t.flag}</span>
                <span className={styles.illTxName}>{t.name}</span>
                <span className={styles.illTxAmt} style={{ color: t.color }}>
                  {t.amt}
                </span>
              </div>
            ))}
          </div>
          <div className={styles.illRatePill}>
            <span className={styles.illRateDot} />
            Live rates active
          </div>
        </div>
      </div>

      {/* Floating send card */}
      <div className={styles.illFloatCard}>
        <div className={styles.illCardIcon}>
          <svg width="16" height="11" viewBox="0 0 32 22" fill="none">
            <rect width="32" height="22" rx="3" fill="#003087" />
            <circle cx="13" cy="11" r="6" fill="#EB001B" />
            <circle cx="19" cy="11" r="6" fill="#F79E1B" />
            <path d="M16 6.5a6 6 0 010 9 6 6 0 010-9z" fill="#FF5F00" />
          </svg>
        </div>
        <div>
          <div className={styles.illCardLabel}>You send</div>
          <div className={styles.illCardValue}>$500 USD</div>
        </div>
      </div>

      {/* Floating received card */}
      <div className={styles.illFloatCard2}>
        <span style={{ fontSize: 16 }}>🇰🇪</span>
        <div>
          <div className={styles.illCardLabel}>They receive</div>
          <div className={styles.illCardValue}>KES 64,750</div>
        </div>
      </div>
    </div>
  );
}

/* ─── OTP box ─── */
function OtpInput({ otp, otpRefs, onChange, onKeyDown, onPaste }) {
  return (
    <div className={styles.otpContainer}>
      {[...Array(6)].map((_, i) => (
        <input
          key={i}
          type="text"
          maxLength={1}
          value={otp[i] || ""}
          onChange={(e) => onChange(e.target.value, i)}
          onKeyDown={(e) => onKeyDown(e, i)}
          ref={(el) => (otpRefs.current[i] = el)}
          onPaste={i === 0 ? onPaste : undefined}
          className={styles.otpBox}
          autoComplete="off"
        />
      ))}
    </div>
  );
}

/* ─── Error popup ─── */
function ErrorPopup({ title, message, onClose }) {
  return (
    <div className={styles.popupOverlay}>
      <div className={styles.popupContent}>
        <div className={styles.popupIconWrap}>
          <AlertCircle size={28} color="#f87171" strokeWidth={2} />
        </div>
        <h2 className={styles.popupTitle}>{title}</h2>
        <p className={styles.popupMessage}>{message}</p>
        <button onClick={onClose} className={styles.popupButton}>
          Dismiss
        </button>
      </div>
    </div>
  );
}

/* ─── Main Login component ─── */
function Login({ onBack, embedded = false, compact = false }) {
  const [step, setStep] = useState(1); // 1 = credentials, 2 = OTP
  const [isLoading, setIsLoading] = useState(false);
  const [useUsername, setUseUsername] = useState(true);
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [otp, setOtp] = useState("");
  const [error, setError] = useState("");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [remainingTime, setRemainingTime] = useState(120);
  const [timerStarted, setTimerStarted] = useState(false);
  const [showExpired, setShowExpired] = useState(false);

  // popup states
  const [popup, setPopup] = useState(null); // { title, message }

  const otpRefs = React.useRef([]);
  const navigate = useNavigate();

  const usernameRegex = /^[a-zA-Z0-9 ]{3,30}$/;
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

  useEffect(() => {
    if (localStorage.getItem("accessToken")) navigate("/dashboard");
  }, [navigate]);

  useEffect(() => {
    let interval;
    if (step === 2 && timerStarted && remainingTime > 0) {
      interval = setInterval(() => {
        setRemainingTime((prev) => {
          if (prev <= 1) {
            clearInterval(interval);
            setShowExpired(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [step, timerStarted, remainingTime]);

  useEffect(() => {
    setIdentifier("");
    setPassword("");
    setError("");
  }, [useUsername]);

  const formatTime = (s) =>
    `${Math.floor(s / 60)
      .toString()
      .padStart(2, "0")}:${(s % 60).toString().padStart(2, "0")}`;

  const showPopup = (title, message) => setPopup({ title, message });

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    if (!identifier || !password) {
      setError("All fields are required.");
      return;
    }
    setIsLoading(true);
    let loginEmail = "";
    try {
      if (useUsername) {
        const t = identifier.trim();
        if (!usernameRegex.test(t)) {
          setError("Username must be 3–30 characters.");
          return;
        }
        const r = await axiosInstance.post("/api/resolve-username", {
          username: t,
        });
        if (!r.data?.email) {
          showPopup("Not registered", "This username is not registered.");
          return;
        }
        loginEmail = r.data.email;
      } else {
        if (!emailRegex.test(identifier)) {
          setError("Enter a valid email address.");
          return;
        }
        loginEmail = identifier;
      }
      if (password.length < 8 || password.length > 15) {
        setError("Password must be 8–15 characters.");
        return;
      }
      const res = await axiosInstance.post("/api/login", {
        email: loginEmail,
        password,
      });
      setFullName(res.data.fullName || "User");
      setEmail(loginEmail);
      setStep(2);
      setRemainingTime(120);
      setTimerStarted(true);
      setShowExpired(false);
    } catch (err) {
      const msg = err.response?.data?.error || "";
      if (err.response?.status === 401)
        showPopup("Login failed", "Incorrect username or password.");
      else if (msg.toLowerCase().includes("blocked"))
        showPopup(
          "Account blocked",
          "Your account is blocked. Contact support.",
        );
      else if (msg.toLowerCase().includes("not registered"))
        showPopup("Not registered", "This account does not exist.");
      else showPopup("Error", msg || "Login failed. Please try again.");
      setPassword("");
    } finally {
      setIsLoading(false);
    }
  };

  const handleOtpChange = (value, index) => {
    if (!value) return;
    if (!/^[A-Z0-9]$/i.test(value)) return;
    const up = value.toUpperCase();
    const arr = otp.split("");
    arr[index] = up;
    const next = arr.join("").slice(0, 6);
    setOtp(next);
    if (up && index < 5) otpRefs.current[index + 1]?.focus();
    if (next.length === 6) handleVerify(null, next);
  };

  const handleOtpKeyDown = (e, index) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  };

  const handleOtpPaste = (e) => {
    e.preventDefault();
    const cleaned = e.clipboardData
      .getData("text")
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, "")
      .slice(0, 6);
    if (cleaned) {
      setOtp(cleaned);
      otpRefs.current[Math.min(cleaned.length - 1, 5)]?.focus();
      if (cleaned.length === 6)
        setTimeout(() => handleVerify(null, cleaned), 100);
    }
  };

  const handleVerify = async (e, passedOtp) => {
    if (e) e.preventDefault();
    const code = passedOtp || otp;
    setError("");
    if (code.length !== 6) {
      setError("Enter all 6 characters.");
      return;
    }
    setIsLoading(true);
    try {
      const res = await axiosInstance.post("/api/login/verify-otp", {
        email,
        code,
      });
      const { accessToken, user } = res.data;
      if (accessToken && user) {
        localStorage.setItem("accessToken", accessToken);
        localStorage.setItem("user", JSON.stringify(user));
        navigate("/dashboard");
      }
    } catch (err) {
      const r = err.response?.data;
      if (r?.result === "invalid")
        setError(`Wrong code. Attempt ${r.attempts || "?"} of 3.`);
      else if (r?.result === "expired") {
        setShowExpired(true);
        setOtp("");
      } else setError("Verification failed. Try again.");
      setOtp("");
    } finally {
      setIsLoading(false);
    }
  };

  const resendOtp = async () => {
    setIsLoading(true);
    try {
      await axiosInstance.post("/api/login", { email, password: "resend" });
      setRemainingTime(120);
      setTimerStarted(true);
      setShowExpired(false);
      setError("");
    } catch {
      setError("Failed to resend. Try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={`${styles.app} ${embedded ? styles.embedded : ""} ${compact ? styles.compact : ""}`}>
      {popup && (
        <ErrorPopup
          title={popup.title}
          message={popup.message}
          onClose={() => setPopup(null)}
        />
      )}

      <div className={`${styles.page} ${embedded ? styles.embedded : ""} ${compact ? styles.compact : ""}`}>
        {/* Left panel — illustration */}
        <div className={styles.leftPanel}>
          <div className={styles.leftInner}>
            {/* <div className={styles.leftBrand}>
              <img src="/images/payzarc.png" className={styles.logo} /> */}
            {/* <span className={styles.leftBrandName}>Payzarc</span> */}
            {/* </div> */}
            <h2 className={styles.leftHeadline}>
              <span className={styles.leftAccent}>PAYZARC</span>
            </h2>
            <p className={styles.leftSub}>
              Cross-border transfers to 50+ countries with real-time rates and
              zero hidden charges.
            </p>
            <PhoneIllustration />
            <div className={styles.leftStats}>
              <div className={styles.stat}>
                {/* <div className={styles.statValue}>$2B+</div> */}
                <div className={styles.statLabel}>Transferred</div>
              </div>
              <div className={styles.statDiv} />
              <div className={styles.stat}>
                <div className={styles.statValue}>21K+</div>
                <div className={styles.statLabel}>Users</div>
              </div>
              <div className={styles.statDiv} />
              <div className={styles.stat}>
                <div className={styles.statValue}>50+</div>
                <div className={styles.statLabel}>Countries</div>
              </div>
            </div>
          </div>
        </div>

        {/* Right panel — form */}
        <div className={styles.rightPanel}>
          <div className={styles.formCard}>
            {/* Back home — hidden when embedded, the Modal already offers a close (×) */}
            <button
              className={`${styles.backBtn} ${embedded ? styles.hiddenWhenEmbedded : ""}`}
              onClick={onBack}
              title="Back to home"
            >
              <ArrowLeft size={16} />
              Home
            </button>

            {step === 1 ? (
              <>
                <div className={styles.formHeader}>
                  <h1 className={styles.formTitle} id="login-modal-title">
                    Welcome back
                  </h1>
                  <p className={styles.formSub}>
                    Sign in to your Payzarc account
                  </p>
                </div>

                {/* Toggle */}
                <div className={styles.toggleRow}>
                  <button
                    className={`${styles.toggleTab} ${useUsername ? styles.toggleActive : ""}`}
                    onClick={() => setUseUsername(true)}
                  >
                    Username
                  </button>
                  <button
                    className={`${styles.toggleTab} ${!useUsername ? styles.toggleActive : ""}`}
                    onClick={() => setUseUsername(false)}
                  >
                    Email
                  </button>
                </div>

                <form onSubmit={handleLogin} className={styles.form}>
                  {/* Identifier */}
                  <div className={styles.fieldGroup}>
                    <label className={styles.fieldLabel}>
                      {useUsername ? "Username" : "Email address"}
                    </label>
                    <div className={styles.inputWrap}>
                      {useUsername ? (
                        <User className={styles.inputIcon} size={16} />
                      ) : (
                        <Mail className={styles.inputIcon} size={16} />
                      )}
                      <input
                        type={useUsername ? "text" : "email"}
                        placeholder={
                          useUsername
                            ? "Enter your username"
                            : "Enter your email"
                        }
                        value={identifier}
                        onChange={(e) => setIdentifier(e.target.value)}
                        className={styles.inputField}
                        autoComplete={useUsername ? "username" : "email"}
                      />
                    </div>
                  </div>

                  {/* Password */}
                  <div className={styles.fieldGroup}>
                    <label className={styles.fieldLabel}>Password</label>
                    <div className={styles.inputWrap}>
                      <Lock className={styles.inputIcon} size={16} />
                      <input
                        type={showPw ? "text" : "password"}
                        placeholder="Enter your password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className={styles.inputField}
                        autoComplete="current-password"
                      />
                      <button
                        type="button"
                        className={styles.eyeBtn}
                        onClick={() => setShowPw(!showPw)}
                        tabIndex={-1}
                      >
                        {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>

                  <div className={styles.forgotRow}>
                    <Link
                      to="/components/member/reset-password"
                      className={styles.forgotLink}
                    >
                      Forgot password?
                    </Link>
                  </div>

                  {error && (
                    <div className={styles.inlineError}>
                      <AlertCircle size={14} color="#f87171" strokeWidth={2} />
                      {error}
                    </div>
                  )}

                  <button
                    type="submit"
                    className={styles.submitBtn}
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <span className={styles.spinner} />
                    ) : (
                      "Sign in →"
                    )}
                  </button>
                </form>

                <p className={styles.registerPrompt}>
                  Don't have an account?{" "}
                  <Link
                    to="/components/member/register"
                    className={styles.registerLink}
                  >
                    Create one
                  </Link>
                </p>
              </>
            ) : (
              /* ── Step 2: OTP ── */
              <>
                <div className={styles.formHeader}>
                  <div className={styles.otpIconWrap}>
                    <KeyRound size={28} color="#ecc94b" strokeWidth={1.8} />
                  </div>
                  <h1 className={styles.formTitle}>Check your email</h1>
                  <p className={styles.formSub}>
                    Hi <strong style={{ color: "#f0f4f8" }}>{fullName}</strong>{" "}
                    — we sent a 6-digit code to
                    <br />
                    <span className={styles.emailHighlight}>{email}</span>
                  </p>
                </div>

                <OtpInput
                  otp={otp}
                  otpRefs={otpRefs}
                  onChange={handleOtpChange}
                  onKeyDown={handleOtpKeyDown}
                  onPaste={handleOtpPaste}
                />

                {error && (
                  <div className={styles.inlineError}>
                    <AlertCircle size={14} color="#f87171" strokeWidth={2} />
                    {error}
                  </div>
                )}

                {otp.length === 6 && (
                  <button
                    className={styles.submitBtn}
                    onClick={handleVerify}
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <span className={styles.spinner} />
                    ) : (
                      "Verify code →"
                    )}
                  </button>
                )}

                <div className={styles.timerRow}>
                  {remainingTime > 0 && !showExpired && (
                    <span className={styles.timerText}>
                      Code expires in{" "}
                      <strong>{formatTime(remainingTime)}</strong>
                    </span>
                  )}
                  {showExpired && (
                    <div className={styles.expiredBlock}>
                      <p className={styles.expiredText}>
                        Your code has expired.
                      </p>
                      <button
                        onClick={resendOtp}
                        className={styles.resendBtn}
                        disabled={isLoading}
                      >
                        {isLoading ? "Sending…" : "Resend code"}
                      </button>
                    </div>
                  )}
                </div>

                <button
                  className={styles.backStepBtn}
                  onClick={() => {
                    setStep(1);
                    setOtp("");
                    setError("");
                  }}
                >
                  ← Use a different account
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default Login;
