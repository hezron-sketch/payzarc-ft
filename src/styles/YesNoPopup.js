import React, { useState, useEffect, useRef } from "react";
import PropTypes from "prop-types";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const YesNoPopup = ({
  isOpen,
  onClose,
  onSubmit,
  title,
  message,
  type = "default",
  isNotification = false,
}) => {
  const [input, setInput] = useState("");
  const [error, setError] = useState("");
  const inputRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return;
    // Clear input every time it opens
    setInput("");
    setError("");
    // Radix already focuses the first focusable element on open; nudge that
    // to the text input specifically once it's actually mounted.
    const id = setTimeout(() => inputRef.current?.focus(), 0);
    return () => clearTimeout(id);
  }, [isOpen]);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        className={cn(
          "max-w-[400px] rounded-lg p-7 gap-4 bg-[radial-gradient(circle_at_30%_0%,var(--card),var(--card2)_65%)] shadow-[0_35px_80px_rgba(0,0,0,0.5),0_0_0_1px_rgba(255,255,255,0.04)_inset] animate-modal-3d-in",
        )}
      >
        <DialogTitle
          className={cn(
            "text-[1.15rem] font-bold text-foreground",
            type === "warning" && "text-amber-400",
            type === "error" && "text-red-400",
          )}
        >
          {title}
        </DialogTitle>

        <p className="whitespace-pre-line leading-[1.55] text-sm text-muted-foreground -mt-2">
          {message}
        </p>

        {/* Hide input if it's just a notification */}
        {!isNotification && (
          <Input
            type="text"
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              setError("");
            }}
            placeholder="Type exactly 1, then click Yes"
            className="h-auto w-full rounded-xl bg-secondary border-input px-3.5 py-3 text-base text-foreground placeholder:text-[var(--muted)] focus-visible:ring-0 focus-visible:border-gold shadow-none"
            ref={inputRef}
            maxLength={1}
            autoComplete="off"
          />
        )}

        {error && <p className="text-red-400 text-[0.8rem] -mt-2">{error}</p>}

        <div className="flex justify-end gap-2.5">
          {/* Hide "No" button if it's just a notification */}
          {!isNotification && (
            <Button
              type="button"
              onClick={() => {
                onSubmit(input, "no");
                onClose();
              }}
              className="h-auto rounded-xl px-[18px] py-2.5 bg-white/[0.06] border border-input text-foreground text-sm font-semibold hover:bg-white/10 shadow-none"
            >
              No (2)
            </Button>
          )}

          <Button
            type="button"
            onClick={() => {
              if (isNotification) {
                onClose(); // Just close for notifications
              } else if (input === "1") {
                onSubmit(input, "yes");
                onClose();
              } else {
                setError("You must type exactly 1 before clicking Yes");
              }
            }}
            className="h-auto rounded-xl px-[18px] py-2.5 bg-primary text-primary-foreground text-sm font-bold hover:bg-gold-dark shadow-none"
          >
            {isNotification ? "OK" : "Yes (1)"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

YesNoPopup.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onSubmit: PropTypes.func.isRequired,
  title: PropTypes.string.isRequired,
  message: PropTypes.string.isRequired,
  type: PropTypes.oneOf(["default", "warning", "error"]),
  isNotification: PropTypes.bool,
};

export default YesNoPopup;
