import React, { useEffect, useState } from "react";
import { ScanFace } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { formInputClass, pickerDialogClass, primaryBtnClass } from "./shared";

function ReviewSheet({ request, onClose }) {
  const [pin, setPin] = useState("");
  useEffect(() => setPin(""), [request]);

  const submit = (credential) => {
    const { onConfirm } = request;
    onClose();
    onConfirm(credential);
  };

  return (
    <Dialog open={!!request} onOpenChange={(open) => !open && onClose()}>
      {request && (
        <DialogContent className={cn(pickerDialogClass, "gap-5")}>
          <div className="flex flex-col gap-1">
            <DialogTitle className="text-[1.15rem] font-semibold text-foreground m-0">
              {request.title}
            </DialogTitle>
            <DialogDescription className="text-[0.85rem] text-[var(--soft)] m-0">
              Check the details before money moves.
            </DialogDescription>
          </div>

          {request.recipient && (
            <div className="flex items-center gap-3">
              <span
                aria-hidden="true"
                className="w-11 h-11 rounded-full bg-gold/15 text-gold font-semibold flex items-center justify-center shrink-0"
              >
                {(request.recipient.name || "?").charAt(0).toUpperCase()}
              </span>
              <div className="min-w-0">
                <p className="text-[0.95rem] font-semibold text-foreground truncate m-0">
                  {request.recipient.name}
                </p>
                <p className="text-[0.8rem] text-[var(--soft)] truncate m-0">
                  {request.recipient.detail}
                </p>
              </div>
            </div>
          )}

          {request.recipients && (
            <ul className="flex flex-col gap-2 max-h-40 overflow-y-auto m-0 p-0 list-none">
              {request.recipients.map((r) => (
                <li
                  key={r.key}
                  className="flex items-center justify-between gap-3 text-sm"
                >
                  <span className="text-foreground truncate">{r.name}</span>
                  <span className="text-foreground tabular-nums shrink-0">
                    {r.amount}
                  </span>
                </li>
              ))}
            </ul>
          )}

          <dl className="m-0 rounded-[14px] bg-white/[0.04] border border-white/[0.06] px-4">
            {request.rows.map((row) => (
              <div
                key={row.label}
                className="flex items-baseline justify-between gap-3 py-2.5 border-b border-white/[0.06] last:border-b-0"
              >
                <dt className="text-[0.85rem] text-[var(--soft)]">
                  {row.label}
                </dt>
                <dd
                  className={cn(
                    "m-0 text-[0.9rem] font-medium text-foreground tabular-nums text-right",
                    row.strong && "text-base font-bold text-gold",
                  )}
                >
                  {row.value}
                </dd>
              </div>
            ))}
          </dl>

          {request.auth ? (
            <form
              className="flex flex-col gap-3"
              onSubmit={(e) => {
                e.preventDefault();
                if (pin.length === 4) submit(pin);
              }}
            >
              <Label
                htmlFor="review-pin"
                className="text-[0.8rem] font-medium text-[var(--soft)]"
              >
                Transaction PIN
              </Label>
              <Input
                id="review-pin"
                type="password"
                inputMode="numeric"
                autoComplete="off"
                maxLength={4}
                placeholder="••••"
                className={cn(
                  formInputClass,
                  "text-center text-xl tracking-[0.6em] placeholder:tracking-[0.6em]",
                )}
                value={pin}
                onChange={(e) =>
                  setPin(e.target.value.replace(/\D/g, "").slice(0, 4))
                }
              />
              <Button
                type="submit"
                className={primaryBtnClass}
                disabled={pin.length !== 4}
              >
                Confirm with PIN
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="h-11 w-full text-[0.9rem] text-gold hover:text-gold"
                onClick={() => submit("")}
              >
                <ScanFace /> Use Face ID instead
              </Button>
            </form>
          ) : (
            <Button className={primaryBtnClass} onClick={() => submit(null)}>
              {request.confirmLabel}
            </Button>
          )}
        </DialogContent>
      )}
    </Dialog>
  );
}

export default ReviewSheet;
