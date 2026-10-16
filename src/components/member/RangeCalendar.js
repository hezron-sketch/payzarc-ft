import React, { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

/* ─── Range Calendar ───
   Inline month grid for picking a From/To range, rendered in the page's own
   DOM so it opens inside the phone frame (native date pickers are drawn by
   the browser and can't be contained). Values are "YYYY-MM-DD" strings, the
   same shape <input type="date"> used, so callers didn't have to change.
   First tap sets From; the next tap on/after it sets To (a tap before it
   restarts the range). */

const pad = (n) => String(n).padStart(2, "0");
// Local date, not toISOString() — that's UTC and shifts the day near midnight.
const toKey = (d) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const fromKey = (k) => {
  const [y, m, d] = k.split("-").map(Number);
  return new Date(y, m - 1, d);
};
const WEEKDAYS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];
const fmt = (k) =>
  fromKey(k).toLocaleDateString(undefined, { day: "numeric", month: "short" });

function presets() {
  const today = new Date();
  const daysAgo = (n) =>
    toKey(new Date(today.getFullYear(), today.getMonth(), today.getDate() - n));
  return [
    { label: "7 days", start: daysAgo(6), end: toKey(today) },
    { label: "30 days", start: daysAgo(29), end: toKey(today) },
    {
      label: "This month",
      start: toKey(new Date(today.getFullYear(), today.getMonth(), 1)),
      end: toKey(today),
    },
  ];
}

export default function RangeCalendar({ start, end, onChange, onDone }) {
  const [month, setMonth] = useState(() => {
    const d = start ? fromKey(start) : new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });
  const todayKey = toKey(new Date());

  // Monday-first grid: leading blanks, then the month's days.
  const lead = (month.getDay() + 6) % 7;
  const daysInMonth = new Date(
    month.getFullYear(),
    month.getMonth() + 1,
    0,
  ).getDate();
  const cells = [
    ...Array(lead).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) =>
      toKey(new Date(month.getFullYear(), month.getMonth(), i + 1)),
    ),
  ];

  const pick = (k) => {
    if (!start || end || k < start) onChange(k, "");
    else onChange(start, k);
  };
  const shift = (n) =>
    setMonth(new Date(month.getFullYear(), month.getMonth() + n, 1));

  const status = !start
    ? "Pick a start date"
    : !end
      ? `${fmt(start)} – pick an end date`
      : `${fmt(start)} – ${fmt(end)}`;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex gap-1.5">
        {presets().map((p) => {
          const active = p.start === start && p.end === end;
          return (
            <button
              key={p.label}
              type="button"
              onClick={() => onChange(p.start, p.end)}
              className={cn(
                "flex-1 h-8 rounded-full text-[0.75rem] font-semibold border transition-colors",
                active
                  ? "bg-gold/15 border-gold/40 text-gold"
                  : "bg-white/[0.03] border-white/[0.06] text-[var(--soft)] hover:text-foreground hover:bg-white/[0.06]",
              )}
            >
              {p.label}
            </button>
          );
        })}
      </div>

      <div className="flex items-center justify-between">
        <button
          type="button"
          aria-label="Previous month"
          onClick={() => shift(-1)}
          className="w-8 h-8 rounded-full flex items-center justify-center text-[var(--soft)] hover:text-foreground hover:bg-white/[0.06] transition-colors"
        >
          <ChevronLeft size={16} aria-hidden="true" />
        </button>
        <span
          key={toKey(month)}
          className="text-[0.85rem] font-semibold text-foreground animate-in fade-in duration-200"
          aria-live="polite"
        >
          {month.toLocaleDateString(undefined, {
            month: "long",
            year: "numeric",
          })}
        </span>
        <button
          type="button"
          aria-label="Next month"
          onClick={() => shift(1)}
          className="w-8 h-8 rounded-full flex items-center justify-center text-[var(--soft)] hover:text-foreground hover:bg-white/[0.06] transition-colors"
        >
          <ChevronRight size={16} aria-hidden="true" />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-y-1 text-center">
        {WEEKDAYS.map((w) => (
          <span
            key={w}
            className="text-[0.65rem] font-semibold uppercase tracking-wide text-muted-foreground pb-1"
          >
            {w}
          </span>
        ))}
        {cells.map((k, i) => {
          if (!k) return <span key={`b${i}`} />;
          const isStart = k === start;
          const isEnd = k === end;
          const inRange = start && end && k > start && k < end;
          return (
            // The outer cell carries the range band (edge to edge, so the
            // band is continuous); the inner circle marks the endpoints.
            <div
              key={k}
              className={cn(
                "h-9 flex items-center justify-center",
                inRange && "bg-gold/10",
                isStart && end && "bg-gradient-to-r from-transparent from-50% to-gold/10 to-50%",
                isEnd && start && "bg-gradient-to-l from-transparent from-50% to-gold/10 to-50%",
              )}
            >
              <button
                type="button"
                onClick={() => pick(k)}
                aria-pressed={isStart || isEnd}
                aria-label={fromKey(k).toDateString()}
                className={cn(
                  "w-9 h-9 rounded-full text-[0.8rem] tabular-nums transition-colors",
                  isStart || isEnd
                    ? "bg-gradient-to-b from-gold to-gold-dark text-black font-bold"
                    : inRange
                      ? "text-foreground hover:bg-white/[0.08]"
                      : "text-[var(--soft)] hover:text-foreground hover:bg-white/[0.06]",
                  k === todayKey &&
                    !isStart &&
                    !isEnd &&
                    "text-gold font-semibold",
                )}
              >
                {Number(k.slice(8))}
              </button>
            </div>
          );
        })}
      </div>

      <div className="flex items-center gap-2 border-t border-white/[0.06] pt-2.5">
        <span className="flex-1 min-w-0 truncate text-[0.75rem] text-muted-foreground">
          {status}
        </span>
        {start && (
          <button
            type="button"
            onClick={() => onChange("", "")}
            className="h-8 px-3 rounded-full text-[0.75rem] font-semibold text-[var(--soft)] hover:text-foreground hover:bg-white/[0.06] transition-colors"
          >
            Clear
          </button>
        )}
        <button
          type="button"
          onClick={onDone}
          className="h-8 px-4 rounded-full text-[0.75rem] font-semibold bg-gradient-to-b from-gold to-gold-dark text-black"
        >
          Done
        </button>
      </div>
    </div>
  );
}
