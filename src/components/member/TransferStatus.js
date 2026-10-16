import React from "react";
import {
  ShieldCheck,
  RefreshCw,
  Check,
  CircleAlert,
  CircleHelp,
  LoaderCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { pickerDialogClass, primaryBtnClass } from "./shared";

// The one result screen every money flow ends on (Send, Send to Many,
// Deposit, Withdraw), so moving money always closes the same way:
//
//   status = {
//     phase: "sending" | "done" | "failed",
//     kind?: "declined" | "unconfirmed",   // failed only (see failureKind)
//     error?, summary, details?: [{ label, value }],
//     items?: [{ key, name, amount, state: "sending"|"done"|"failed"|"pending" }],
//   }
//
// `items` (Send to Many) swaps the three-step track for a per-recipient
// list. Every step is driven by real state: "Done" only after the server
// confirms, and "balance unchanged" only when the server said no. Step 1 is
// "Submitted", not "Authorized" — the server checks the PIN/face, so the
// client can't claim it passed.
//
// Recovery depends on why it failed: a decline can't succeed if replayed
// (wrong PIN, insufficient funds), so its primary action is onReviewAgain
// (a fresh review, credential and key); only an unconfirmed failure offers
// the same-key onRetry, which the idempotency key makes safe.
// Same support address the landing page's Contact section lists.
const SUPPORT_EMAIL = "info.e@payzarc.com";

const TRACK = [
  { label: "Submitted", sub: "Sent securely with your PIN or face check", icon: ShieldCheck },
  { label: "Processing", sub: "Waiting for confirmation", icon: RefreshCw, spin: true },
];

const itemIcon = {
  done: { icon: Check, className: "bg-gold border-gold text-black" },
  failed: {
    icon: CircleAlert,
    className: "bg-destructive/15 border-destructive/40 text-destructive",
  },
  sending: { icon: LoaderCircle, className: "text-gold", spin: true },
  pending: { icon: LoaderCircle, className: "text-[var(--soft)] opacity-50" },
};

function TransferStatus({
  status,
  verb, // "Sending", "Depositing", "Withdrawing"
  doneTitle, // "Money delivered"
  doneStep, // { label: "Delivered", sub: "Funds have arrived with the recipient" }
  onDone,
  onRetry,
  onReviewAgain,
  onEdit,
  onViewTransactions,
}) {
  if (!status) return null;
  const { phase, kind, items } = status;
  const failedCount = items?.filter((i) => i.state === "failed").length ?? 0;
  const deliveredCount = items ? items.length - failedCount : 0;
  const unconfirmed = phase === "failed" && kind === "unconfirmed";
  const steps = [...TRACK, { ...doneStep, icon: Check }];
  // Current step: 2 while in flight or failed, 3 once confirmed.
  const current = phase === "done" ? 3 : 2;

  // A batch always leads with its delivered count, so one unconfirmed row
  // never hides what did go through.
  const title =
    phase === "sending"
      ? `${verb}…`
      : phase === "done"
        ? doneTitle
        : items && deliveredCount > 0
          ? `${deliveredCount} of ${items.length} delivered`
          : unconfirmed
            ? "We couldn't confirm this"
            : "Not sent";

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (open || phase === "sending") return;
        phase === "done" ? onDone() : onEdit();
      }}
    >
      <DialogContent
        className={cn(
          pickerDialogClass,
          phase === "sending" && "[&>button:last-child]:hidden",
        )}
        onEscapeKeyDown={(e) => phase === "sending" && e.preventDefault()}
        onPointerDownOutside={(e) => phase === "sending" && e.preventDefault()}
      >
        <DialogTitle className="text-center text-[1.15rem] font-semibold text-foreground m-0">
          {title}
        </DialogTitle>

        {items ? (
          <ul
            className="flex flex-col gap-2.5 m-0 p-0 list-none max-h-60 overflow-y-auto stagger"
            aria-live="polite"
          >
            {items.map((item) => {
              const { icon: Icon, className, spin } = itemIcon[item.state];
              return (
                <li key={item.key} className="flex items-center gap-3">
                  <span
                    className={cn(
                      "w-7 h-7 rounded-full border border-white/[0.08] flex items-center justify-center shrink-0",
                      className,
                    )}
                  >
                    {/* key = state: each change remounts the icon so it
                        pops in, instead of the glyph silently swapping. */}
                    <Icon
                      key={item.state}
                      size={14}
                      aria-hidden="true"
                      // Both set `animation`, so a spinning icon only spins.
                      className={
                        spin
                          ? "animate-spin"
                          : "animate-in fade-in zoom-in-75 duration-200 ease-out"
                      }
                    />
                  </span>
                  <span className="flex-1 min-w-0 text-[0.9rem] text-foreground truncate">
                    {item.name}
                  </span>
                  <span className="text-[0.9rem] text-foreground tabular-nums shrink-0">
                    {item.amount}
                  </span>
                  <span className="sr-only">
                    {
                      {
                        done: "delivered",
                        failed: "not delivered",
                        sending: "sending",
                        pending: "waiting",
                      }[item.state]
                    }
                  </span>
                </li>
              );
            })}
          </ul>
        ) : (
          <ol className="flex flex-col py-2 px-1 m-0 list-none" aria-live="polite">
            {steps.map((step, idx) => {
              const stepNum = idx + 1;
              const isLast = idx === steps.length - 1;
              const failedHere = phase === "failed" && stepNum === current;
              const isPast =
                current > stepNum || (phase === "done" && stepNum === current);
              const isCurrent = phase === "sending" && current === stepNum;
              const reached = current >= stepNum && !failedHere;
              const StepIcon = failedHere
                ? unconfirmed
                  ? CircleHelp
                  : CircleAlert
                : isPast
                  ? Check
                  : step.icon;
              return (
                <li key={step.label} className="flex gap-3.5">
                  <div className="flex flex-col items-center flex-shrink-0">
                    <div
                      className={cn(
                        "w-[34px] h-[34px] rounded-full bg-white/[0.03] border border-white/[0.06] text-[var(--soft)] flex items-center justify-center flex-shrink-0 transition-[background-color,border-color,color] duration-300 ease-apple",
                        reached && "bg-gold border-gold text-black",
                        failedHere &&
                          (unconfirmed
                            ? "bg-gold/10 border-gold/40 text-gold"
                            : "bg-destructive/15 border-destructive/40 text-destructive"),
                        isCurrent && "animate-progress-pulse",
                      )}
                    >
                      <StepIcon
                        key={`${isPast}-${failedHere}`}
                        size={15}
                        aria-hidden="true"
                        className={
                          isCurrent && step.spin
                            ? "animate-spin"
                            : "animate-in fade-in zoom-in-75 duration-200 ease-out"
                        }
                      />
                    </div>
                    {!isLast && (
                      // Connector fills top-down toward the next step (scaleY
                      // from the top) rather than just changing color — shows
                      // the transfer travelling, not a light switching on.
                      <div className="relative w-0.5 flex-1 min-h-[26px] bg-white/[0.08] my-[3px] overflow-hidden">
                        <div
                          className={cn(
                            "absolute inset-0 bg-gold origin-top transition-transform duration-[400ms] ease-apple",
                            isPast ? "scale-y-100" : "scale-y-0",
                          )}
                        />
                      </div>
                    )}
                  </div>
                  <div className="pb-5 pt-1">
                    <span
                      className={cn(
                        "text-[0.9rem] font-semibold text-foreground",
                        !reached && !failedHere && "text-[var(--soft)]",
                      )}
                    >
                      {failedHere
                        ? unconfirmed
                          ? "Not confirmed"
                          : "Not completed"
                        : step.label}
                    </span>
                    <p className="mt-0.5 text-[0.8rem] text-[var(--soft)] m-0">
                      {failedHere
                        ? unconfirmed
                          ? "It may still have gone through."
                          : "Your balance is unchanged."
                        : step.sub}
                    </p>
                  </div>
                </li>
              );
            })}
          </ol>
        )}

        {phase === "failed" && (
          <p
            role="alert"
            className={cn(
              "text-[0.85rem] text-foreground rounded-[14px] px-4 py-3 m-0 border",
              unconfirmed
                ? "bg-gold/[0.06] border-gold/25"
                : "bg-destructive/10 border-destructive/30",
            )}
          >
            {unconfirmed
              ? items
                ? `We couldn't confirm ${failedCount === 1 ? "1 payment" : `${failedCount} payments`}. Check Transactions before retrying.`
                : "The connection dropped before we heard back. Check Transactions before trying again."
              : status.error}
          </p>
        )}

        {phase === "done" && status.details?.length > 0 && (
          <dl className="m-0 rounded-[14px] bg-white/[0.04] border border-white/[0.06] px-4">
            {status.details.map((row) => (
              <div
                key={row.label}
                className="flex items-baseline justify-between gap-3 py-2.5 border-b border-white/[0.06] last:border-b-0"
              >
                <dt className="text-[0.85rem] text-[var(--soft)]">{row.label}</dt>
                <dd className="m-0 text-[0.9rem] font-medium text-foreground tabular-nums text-right break-words min-w-0">
                  {row.value}
                </dd>
              </div>
            ))}
          </dl>
        )}

        <p className="text-center text-[var(--soft)] text-[0.85rem] m-0 pt-3 border-t border-dashed border-white/[0.08] tabular-nums">
          {status.summary}
        </p>

        {phase === "done" && (
          <Button className={primaryBtnClass} onClick={onDone}>
            Done
          </Button>
        )}
        {phase === "failed" && (
          <div className="flex flex-col gap-2">
            {unconfirmed ? (
              <>
                <Button className={primaryBtnClass} onClick={onViewTransactions}>
                  Check Transactions
                </Button>
                <Button variant="ghost" className="h-11 w-full" onClick={onRetry}>
                  {items ? `Retry unconfirmed (${failedCount})` : "Try again"}
                </Button>
              </>
            ) : items ? (
              <Button className={primaryBtnClass} onClick={onEdit}>
                {deliveredCount > 0 ? "Done" : "Edit transfer"}
              </Button>
            ) : (
              <>
                <Button className={primaryBtnClass} onClick={onReviewAgain}>
                  Review again
                </Button>
                <Button variant="ghost" className="h-11 w-full" onClick={onEdit}>
                  Edit
                </Button>
              </>
            )}
          </div>
        )}
        {phase === "failed" && (
          <p className="text-center text-[0.8rem] text-[var(--soft)] m-0">
            Need help?{" "}
            <a
              className="text-gold underline underline-offset-2"
              href={`mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(`Transfer issue: ${status.summary}`)}`}
            >
              Email support
            </a>
          </p>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default TransferStatus;
