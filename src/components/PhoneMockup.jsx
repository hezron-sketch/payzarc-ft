import React from "react";
import { cn } from "@/lib/utils";

export const psHeaderClass = "flex items-center justify-between mb-0.5";
export const psLogoClass = "w-[18px] h-[18px] bg-gold rounded-[5px]";
export const psDotsClass = "flex gap-[3px]";
export const psDotClass = "w-[5px] h-[5px] rounded-full bg-white/20";
export const psGreetingClass = "text-[9px] text-muted-foreground";
export const psNameClass = "text-[11px] font-bold text-foreground -mt-1";
export const psBalanceCardClass =
  "bg-gradient-to-br from-[#234876] to-[#1a2f4d] rounded-sm py-[7px] px-2 border-[0.5px] border-[rgba(96,165,250,0.25)] shadow-[0_6px_16px_rgba(0,0,0,0.25)]";
export const psBalLabelClass = "text-[8px] text-info";
export const psBalAmountClass = "text-[15px] font-bold text-foreground mt-px";

export const phoneBezelColorClass = "bg-[#0d1117]";
export const phoneNotchBaseClass =
  "absolute left-1/2 -translate-x-1/2 bg-[#0d1117] pointer-events-none z-[1]";

// Resting, not hovering: a tight contact shadow, a short soft one, and a
// faint wide ambient one — the way a real object close to a surface reads.
export const phoneModalShadowClass =
  "shadow-[0_1px_2px_rgba(0,0,0,0.35),0_6px_16px_-4px_rgba(0,0,0,0.35),0_20px_40px_-16px_rgba(0,0,0,0.45)]";
export const phoneModalOpenClass =
  "top-1/2 left-1/2 [transform:translate(-50%,-50%)_translateZ(48px)] h-[min(820px,88vh)] w-[min(calc(min(820px,88vh)*9/19.5),92vw)] [--r:44px] border-[0.5px] border-[rgba(var(--gold-rgb),0.16)] max-[480px]:w-[94vw] max-[480px]:h-[90vh] max-[480px]:[--r:36px]";

const DEFAULT_CONTACTS = [
  { initials: "JM", bg: "#fde68a", color: "#78350f", name: "James" },
  { initials: "SA", bg: "#bfdbfe", color: "#1e3a5f", name: "Sarah" },
  { initials: "NK", bg: "#d9f99d", color: "#365314", name: "Nora" },
  { initials: "+", bg: "#fecdd3", color: "#881337", name: "More" },
];
const DEFAULT_ACTIVITY = [
  { flag: "🇳🇬", name: "Nigeria", amt: "+NGN 90K", positive: true },
  { flag: "🇮🇳", name: "India", amt: "+INR 41K", positive: true },
  { flag: "🇰🇪", name: "Kenya", amt: "+KES 25K", positive: true },
];

export const PhoneFrame = React.forwardRef(function PhoneFrame(
  {
    hidden,
    className,
    greeting = "Hello,",
    name = "Elaine W.",
    balanceLabel = "Wallet balance",
    balance = "$4,820.00",
    sendToLabel = "Send to",
    contacts = DEFAULT_CONTACTS,
    activityLabel = "Recent activity",
    activity = DEFAULT_ACTIVITY,
  },
  ref,
) {
  return (
    <div
      ref={ref}
      className={cn(
        phoneBezelColorClass,
        "w-[250px] aspect-[9/19.5] flex flex-col rounded-[30px] border-[1.5px] border-[rgba(var(--gold-rgb),0.18)] p-[5px] shadow-[0_1px_2px_rgba(0,0,0,0.35),0_6px_16px_-4px_rgba(0,0,0,0.35),0_20px_40px_-16px_rgba(0,0,0,0.45),0_0_0_1px_rgba(255,255,255,0.04)_inset]",
        className,
      )}
      style={hidden ? { visibility: "hidden" } : undefined}
    >
      <div className="relative flex-1 min-h-0 overflow-hidden bg-card rounded-[24px] pt-[22px] pb-[12px] px-2 flex flex-col gap-[7px]">
        <div
          className={cn(
            phoneNotchBaseClass,
            "top-0 w-[40%] h-[14px] rounded-b-[9px]",
          )}
        />
        <div className={psHeaderClass}>
          <div className={psLogoClass} />
          <div className={psDotsClass}>
            <div className={psDotClass} />
            <div className={psDotClass} />
            <div className={psDotClass} />
          </div>
        </div>
        <div className={psGreetingClass}>{greeting}</div>
        <div className={psNameClass}>{name}</div>
        <div className={psBalanceCardClass}>
          <div className={psBalLabelClass}>{balanceLabel}</div>
          <div className={psBalAmountClass}>{balance}</div>
        </div>
        {contacts.length > 0 && (
          <>
            <div className="text-[9px] text-[var(--muted)]">{sendToLabel}</div>
            <div className="flex gap-[7px]">
              {contacts.map((r) => (
                <div
                  key={r.name}
                  className="flex flex-col items-center gap-[3px]"
                >
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
          </>
        )}
        {activity.length > 0 && (
          <>
            <div className="text-[9px] text-[var(--muted)] mt-0.5">
              {activityLabel}
            </div>
            <div className="flex flex-col gap-1">
              {activity.map((t, idx) => (
                <div
                  key={t.name ? `${t.name}-${idx}` : idx}
                  className="flex items-center gap-1 bg-white/[0.04] rounded-[5px] px-[5px] py-1"
                >
                  <span className="text-[10px] flex-shrink-0">{t.flag}</span>
                  <span className="text-[8px] text-[#d1d5db] flex-1 truncate">
                    {t.name}
                  </span>
                  <span
                    className={cn(
                      "text-[8px] font-bold",
                      t.positive === false
                        ? "text-destructive"
                        : "text-success",
                    )}
                  >
                    {t.amt}
                  </span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
});

export const PhoneMockup = React.forwardRef(function PhoneMockup(
  { hidden },
  ref,
) {
  return (
    <PhoneFrame
      ref={ref}
      hidden={hidden}
      className="absolute left-1/2 top-0 origin-top [transform:translate(-50%,0)_scale(1.55)_translateZ(60px)] z-[2] max-[768px]:w-[230px] max-[768px]:[transform:translate(-50%,0)_scale(1.35)_translateZ(60px)] max-[400px]:[transform:translate(-50%,0)_scale(1.15)_translateZ(60px)]"
    />
  );
});
