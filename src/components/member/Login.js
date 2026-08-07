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
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";

// Shared class-builders for pieces whose sizing changes in compact mode
// (Login rendered inside the phone-width Phone Auth Stage) — kept as
// functions rather than static strings since they depend on the `compact`
// prop, mirroring the `.page.compact .foo` CSS Module modifiers they replace.
const formHeaderClass = (compact) =>
  cn("flex flex-col", compact ? "gap-1" : "gap-1.5");
const formTitleClass = (compact) =>
  cn(
    "font-extrabold text-[#f9fafb] tracking-[-0.5px]",
    compact ? "text-[21px]" : "text-[26px] max-[480px]:text-[22px]",
  );
const formSubClass = (compact) =>
  cn("text-[var(--muted)] leading-[1.55]", compact ? "text-xs" : "text-[13px]");
const formGapClass = (compact) =>
  cn("flex flex-col", compact ? "gap-[0.85rem]" : "gap-4");
const toggleTabClass = (active, compact) =>
  cn(
    "flex-1 border-none rounded-[7px] font-medium cursor-pointer bg-transparent text-[var(--muted)] transition-colors",
    compact ? "py-[0.42rem] text-xs" : "py-2 text-[13px]",
    active && "bg-[#1f2937] text-[#f9fafb] border-[0.5px] border-white/10",
  );
const inputFieldClass = (compact) =>
  cn(
    "h-auto w-full bg-white/5 text-[#f9fafb] border-[0.5px] border-white/10 rounded-[10px] outline-none transition-colors focus-visible:ring-0 focus-visible:border-gold focus-visible:bg-white/[0.07] placeholder:text-[#4b5563] shadow-none",
    compact ? "py-[0.65rem] pr-10 pl-9 text-[13px]" : "py-3 pr-11 pl-10 text-sm",
  );
const submitBtnClass = (compact) =>
  cn(
    "w-full h-auto bg-gold text-[#111] border-none rounded-[10px] font-bold cursor-pointer transition-all flex items-center justify-center gap-1.5 hover:bg-gold-dark hover:-translate-y-px disabled:opacity-60 disabled:cursor-not-allowed shadow-none",
    compact ? "py-3 text-sm" : "py-[0.85rem] text-[15px]",
  );
const otpBoxClass = (compact) =>
  cn(
    "bg-white/5 text-[#f9fafb] border-[0.5px] border-white/[0.12] font-bold text-center outline-none transition-colors caret-gold focus:border-gold focus:bg-[rgba(var(--gold-rgb),0.06)]",
    compact
      ? "w-10 h-12 text-[17px] rounded-sm"
      : "w-12 h-[54px] text-xl rounded-[10px] max-[768px]:w-[42px] max-[768px]:h-12 max-[768px]:text-[18px] max-[480px]:w-[38px] max-[480px]:h-11 max-[480px]:text-base max-[480px]:rounded-sm",
  );
const otpContainerClass = (compact) =>
  cn("flex justify-center", compact ? "gap-1.5" : "gap-2 max-[480px]:gap-1.5");
const inlineErrorClass =
  "flex items-center gap-1.5 bg-red-400/[0.08] border-[0.5px] border-red-400/25 rounded-sm px-3 py-2 text-xs text-red-400";

/* ─── Mini phone illustration ─── */
function PhoneIllustration() {
  return (
    <div className="relative flex justify-center h-[280px]">
      <div className="w-[140px] bg-[#1c2333] rounded-[24px] border-[1.5px] border-white/10 px-[7px] pt-[9px] pb-3 relative z-[2] self-center">
        <div className="w-[38px] h-[7px] bg-[#0d1117] rounded mx-auto mb-2" />
        <div className="bg-[#131c2e] rounded-[14px] px-[7px] py-[9px] flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <div className="w-4 h-4 bg-gold rounded" />
            <div className="flex gap-[3px]">
              <span className="block w-1 h-1 rounded-full bg-white/20" />
              <span className="block w-1 h-1 rounded-full bg-white/20" />
              <span className="block w-1 h-1 rounded-full bg-white/20" />
            </div>
          </div>
          <div className="bg-[#1e3a5f] rounded-[7px] px-[7px] py-1.5 border-[0.5px] border-[rgba(96,165,250,0.2)]">
            <div className="text-[7px] text-[#60a5fa]">Total balance</div>
            <div className="text-[13px] font-extrabold text-[#f9fafb]">$4,820.00</div>
          </div>
          <div className="flex flex-col gap-1">
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
              <div
                key={t.name}
                className="flex items-center gap-1 bg-white/[0.04] rounded-[5px] px-[5px] py-1"
              >
                <span className="text-[9px] flex-shrink-0">{t.flag}</span>
                <span className="text-[7px] text-[#d1d5db] flex-1">{t.name}</span>
                <span className="text-[7px] font-bold" style={{ color: t.color }}>
                  {t.amt}
                </span>
              </div>
            ))}
          </div>
          <div className="flex items-center gap-1 text-[7px] text-[#4ade80] bg-[rgba(74,222,128,0.08)] border-[0.5px] border-[rgba(74,222,128,0.2)] rounded-[10px] px-1.5 py-[3px] w-fit mx-auto">
            <span className="w-1 h-1 rounded-full bg-[#4ade80] flex-shrink-0" />
            Live rates active
          </div>
        </div>
      </div>

      {/* Floating send card */}
      <div className="absolute left-0 top-[50px] bg-[#1f2937] border-[0.5px] border-white/10 rounded-md px-2.5 py-2 flex items-center gap-2 z-[3]">
        <div className="w-7 h-7 rounded-[7px] bg-[rgba(59,130,246,0.15)] flex items-center justify-center">
          <svg width="16" height="11" viewBox="0 0 32 22" fill="none">
            <rect width="32" height="22" rx="3" fill="#003087" />
            <circle cx="13" cy="11" r="6" fill="#EB001B" />
            <circle cx="19" cy="11" r="6" fill="#F79E1B" />
            <path d="M16 6.5a6 6 0 010 9 6 6 0 010-9z" fill="#FF5F00" />
          </svg>
        </div>
        <div>
          <div className="text-[9px] text-[var(--muted)]">You send</div>
          <div className="text-xs font-bold text-[#f9fafb]">$500 USD</div>
        </div>
      </div>

      {/* Floating received card */}
      <div className="absolute right-0 top-[130px] bg-[#1f2937] border-[0.5px] border-white/10 rounded-md px-2.5 py-2 flex items-center gap-2 z-[3]">
        <span style={{ fontSize: 16 }}>🇰🇪</span>
        <div>
          <div className="text-[9px] text-[var(--muted)]">They receive</div>
          <div className="text-xs font-bold text-[#f9fafb]">KES 64,750</div>
        </div>
      </div>
    </div>
  );
}

/* ─── OTP box ─── */
function OtpInput({ otp, otpRefs, onChange, onKeyDown, onPaste, compact }) {
  return (
    <div className={otpContainerClass(compact)}>
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
          className={otpBoxClass(compact)}
          autoComplete="off"
        />
      ))}
    </div>
  );
}

/* ─── Error popup ─── */
function ErrorPopup({ title, message, onClose, compact }) {
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        className={cn(
          "max-w-[360px] bg-[#1f2937] rounded-[20px] flex flex-col items-center gap-3.5 text-center animate-popup-in",
          compact ? "p-6" : "p-8",
        )}
      >
        <div className="w-[52px] h-[52px] bg-red-400/10 border border-red-400/25 rounded-[14px] flex items-center justify-center">
          <AlertCircle size={28} color="#f87171" strokeWidth={2} />
        </div>
        <DialogTitle className="text-[17px] font-bold text-[#f9fafb]">
          {title}
        </DialogTitle>
        <p className="text-[13px] text-[#9ca3af] leading-[1.55]">{message}</p>
        <Button
          onClick={onClose}
          className="w-full h-auto py-3 rounded-[10px] bg-red-400/[0.12] text-red-400 border border-red-400/30 text-sm font-semibold hover:bg-red-400/20 shadow-none"
        >
          Dismiss
        </Button>
      </DialogContent>
    </Dialog>
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
    <div className={cn("text-foreground", embedded ? "bg-transparent min-h-0" : "bg-background min-h-screen")}>
      {popup && (
        <ErrorPopup
          title={popup.title}
          message={popup.message}
          onClose={() => setPopup(null)}
          compact={compact}
        />
      )}

      <div
        className={cn(
          "min-h-screen grid grid-cols-1 md:grid-cols-2",
          embedded && "block min-h-0",
        )}
      >
        {/* Left panel — illustration */}
        <div
          className={cn(
            "relative overflow-hidden items-center justify-center p-12 px-10 border-r-[0.5px] border-white/[0.07] bg-[#111827]",
            "before:content-[''] before:absolute before:rounded-full before:border-[0.5px] before:border-[rgba(var(--gold-rgb),0.07)] before:pointer-events-none before:w-[480px] before:h-[480px] before:-top-[100px] before:-left-[100px]",
            "after:content-[''] after:absolute after:rounded-full after:border-[0.5px] after:border-[rgba(var(--gold-rgb),0.07)] after:pointer-events-none after:w-[320px] after:h-[320px] after:-bottom-20 after:-right-20",
            embedded ? "hidden" : "hidden md:flex",
          )}
        >
          <div className="flex flex-col gap-6 max-w-[360px] w-full relative z-[1]">
            <h2 className="text-[32px] font-extrabold leading-[1.15] tracking-[-0.8px] text-[#f9fafb]">
              <span className="text-gold tracking-[1.2rem] font-black">PAYZARC</span>
            </h2>
            <p className="text-[13px] text-[var(--muted)] leading-[1.65] -mt-2">
              Cross-border transfers to 50+ countries with real-time rates and
              zero hidden charges.
            </p>
            <PhoneIllustration />
            <div className="flex items-center gap-4 px-5 py-4 bg-white/[0.03] border-[0.5px] border-white/[0.07] rounded-[14px]">
              <div className="flex-1 text-center">
                <div className="text-[10px] text-[var(--muted)] mt-0.5">Transferred</div>
              </div>
              <div className="w-[0.5px] h-7 bg-white/[0.08]" />
              <div className="flex-1 text-center">
                <div className="text-base font-extrabold text-gold tracking-[-0.5px]">21K+</div>
                <div className="text-[10px] text-[var(--muted)] mt-0.5">Users</div>
              </div>
              <div className="w-[0.5px] h-7 bg-white/[0.08]" />
              <div className="flex-1 text-center">
                <div className="text-base font-extrabold text-gold tracking-[-0.5px]">50+</div>
                <div className="text-[10px] text-[var(--muted)] mt-0.5">Countries</div>
              </div>
            </div>
          </div>
        </div>

        {/* Right panel — form */}
        <div
          className={cn(
            "flex items-center justify-center bg-background",
            embedded
              ? "p-0 bg-transparent items-stretch justify-stretch"
              : "p-10 px-8 max-[768px]:p-8 max-[768px]:px-5 max-[768px]:items-start max-[768px]:pt-12",
          )}
        >
          <div
            className={cn(
              "w-full flex flex-col",
              embedded ? "max-w-full gap-6" : "max-w-[400px] gap-5 max-[768px]:max-w-full",
            )}
          >
            {/* Back home — hidden when embedded, the Modal already offers a close (×) */}
            <button
              className={cn(
                "inline-flex items-center gap-1.5 bg-transparent border-[0.5px] border-white/10 rounded-[20px] text-[#9ca3af] text-xs font-medium px-3 py-[5px] cursor-pointer w-fit transition-colors hover:text-[#f9fafb] hover:border-white/20",
                embedded && "hidden",
              )}
              onClick={onBack}
              title="Back to home"
            >
              <ArrowLeft size={16} />
              Home
            </button>

            {step === 1 ? (
              <>
                <div className={formHeaderClass(compact)}>
                  <h1 className={formTitleClass(compact)} id="login-modal-title">
                    Welcome back
                  </h1>
                  <p className={formSubClass(compact)}>
                    Sign in to your Payzarc account
                  </p>
                </div>

                {/* Toggle */}
                <div className="flex bg-white/[0.04] border-[0.5px] border-white/[0.08] rounded-[10px] p-1 gap-1">
                  <button
                    className={toggleTabClass(useUsername, compact)}
                    onClick={() => setUseUsername(true)}
                  >
                    Username
                  </button>
                  <button
                    className={toggleTabClass(!useUsername, compact)}
                    onClick={() => setUseUsername(false)}
                  >
                    Email
                  </button>
                </div>

                <form onSubmit={handleLogin} className={formGapClass(compact)}>
                  {/* Identifier */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-[#9ca3af] tracking-[0.2px]">
                      {useUsername ? "Username" : "Email address"}
                    </label>
                    <div className="relative flex items-center">
                      {useUsername ? (
                        <User className="absolute left-[13px] text-[#4b5563] pointer-events-none flex-shrink-0" size={16} />
                      ) : (
                        <Mail className="absolute left-[13px] text-[#4b5563] pointer-events-none flex-shrink-0" size={16} />
                      )}
                      <Input
                        type={useUsername ? "text" : "email"}
                        placeholder={
                          useUsername
                            ? "Enter your username"
                            : "Enter your email"
                        }
                        value={identifier}
                        onChange={(e) => setIdentifier(e.target.value)}
                        className={inputFieldClass(compact)}
                        autoComplete={useUsername ? "username" : "email"}
                      />
                    </div>
                  </div>

                  {/* Password */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-[#9ca3af] tracking-[0.2px]">Password</label>
                    <div className="relative flex items-center">
                      <Lock className="absolute left-[13px] text-[#4b5563] pointer-events-none flex-shrink-0" size={16} />
                      <Input
                        type={showPw ? "text" : "password"}
                        placeholder="Enter your password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className={inputFieldClass(compact)}
                        autoComplete="current-password"
                      />
                      <button
                        type="button"
                        className="absolute right-3 bg-transparent border-none text-[#4b5563] cursor-pointer p-0 flex items-center transition-colors hover:text-[#9ca3af]"
                        onClick={() => setShowPw(!showPw)}
                        tabIndex={-1}
                      >
                        {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>

                  <div className="flex justify-end -mt-1">
                    <Link
                      to="/components/member/reset-password"
                      className="text-xs text-gold no-underline font-medium transition-opacity hover:opacity-80"
                    >
                      Forgot password?
                    </Link>
                  </div>

                  {error && (
                    <div className={inlineErrorClass}>
                      <AlertCircle size={14} color="#f87171" strokeWidth={2} />
                      {error}
                    </div>
                  )}

                  <Button
                    type="submit"
                    className={submitBtnClass(compact)}
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <span className="inline-block w-[18px] h-[18px] rounded-full border-2 border-black/20 border-t-[#111] animate-spin" />
                    ) : (
                      "Sign in →"
                    )}
                  </Button>
                </form>

                <p className="text-[13px] text-[var(--muted)] text-center">
                  Don't have an account?{" "}
                  <Link
                    to="/components/member/register"
                    className="text-gold font-semibold no-underline transition-opacity hover:opacity-80"
                  >
                    Create one
                  </Link>
                </p>
              </>
            ) : (
              /* ── Step 2: OTP ── */
              <>
                <div className={formHeaderClass(compact)}>
                  <div className="w-[52px] h-[52px] bg-[rgba(var(--gold-rgb),0.1)] border-[0.5px] border-[rgba(var(--gold-rgb),0.25)] rounded-[14px] flex items-center justify-center mb-1">
                    <KeyRound size={28} color="var(--gold)" strokeWidth={1.8} />
                  </div>
                  <h1 className={formTitleClass(compact)}>Check your email</h1>
                  <p className={formSubClass(compact)}>
                    Hi <strong style={{ color: "#f0f4f8" }}>{fullName}</strong>{" "}
                    — we sent a 6-digit code to
                    <br />
                    <span className="text-gold text-xs">{email}</span>
                  </p>
                </div>

                <OtpInput
                  otp={otp}
                  otpRefs={otpRefs}
                  onChange={handleOtpChange}
                  onKeyDown={handleOtpKeyDown}
                  onPaste={handleOtpPaste}
                  compact={compact}
                />

                {error && (
                  <div className={inlineErrorClass}>
                    <AlertCircle size={14} color="#f87171" strokeWidth={2} />
                    {error}
                  </div>
                )}

                {otp.length === 6 && (
                  <Button
                    className={submitBtnClass(compact)}
                    onClick={handleVerify}
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <span className="inline-block w-[18px] h-[18px] rounded-full border-2 border-black/20 border-t-[#111] animate-spin" />
                    ) : (
                      "Verify code →"
                    )}
                  </Button>
                )}

                <div className="text-center">
                  {remainingTime > 0 && !showExpired && (
                    <span className="text-xs text-[var(--muted)]">
                      Code expires in{" "}
                      <strong className="text-[#9ca3af]">{formatTime(remainingTime)}</strong>
                    </span>
                  )}
                  {showExpired && (
                    <div className="flex flex-col items-center gap-2">
                      <p className="text-xs text-red-400">
                        Your code has expired.
                      </p>
                      <button
                        onClick={resendOtp}
                        className="bg-[rgba(var(--gold-rgb),0.1)] text-gold border-[0.5px] border-[rgba(var(--gold-rgb),0.3)] rounded-sm py-[7px] px-5 text-[13px] font-semibold cursor-pointer transition-colors hover:bg-[rgba(var(--gold-rgb),0.18)]"
                        disabled={isLoading}
                      >
                        {isLoading ? "Sending…" : "Resend code"}
                      </button>
                    </div>
                  )}
                </div>

                <button
                  className="bg-transparent border-none text-[var(--muted)] text-xs cursor-pointer text-center transition-colors hover:text-[#9ca3af]"
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
