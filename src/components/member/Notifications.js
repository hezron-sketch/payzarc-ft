import React, { useState, useEffect } from "react";
import { ChevronLeft, Bell, CircleArrowDown, ShieldAlert, CircleCheck } from "lucide-react";
import { transactionsApi } from "../../utility/axiosInstance";
import { Button } from "@/components/ui/button";

const ICONS = {
  receive: CircleArrowDown,
  security: ShieldAlert,
  transaction: CircleCheck,
};

const flowCardClass =
  "relative p-8 w-full max-w-[600px] mx-auto min-h-[560px] flex flex-col gap-7 bg-card border border-border rounded-lg animate-flow-fade-in max-[640px]:p-6 max-[640px]:px-5 max-[640px]:gap-6 max-[640px]:min-h-[480px]";
const flowHeaderClass =
  "absolute left-0 w-full bottom-full mb-3 grid grid-cols-[1fr_auto_1fr] items-center text-white";
const backBtnClass =
  "col-start-1 justify-self-start h-auto gap-1 px-1 py-1 text-white text-[0.9rem] font-semibold transition-opacity duration-200 hover:bg-transparent hover:text-white hover:opacity-75 [&_svg]:size-auto";

function Notifications({ onBack }) {
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    transactionsApi
      .get("/api/notifications/")
      .then((res) => setNotifications(Array.isArray(res.data) ? res.data : []))
      .catch(() => {});
  }, []);

  const markRead = (n) => {
    if (n.read) return;
    setNotifications((prev) =>
      prev.map((x) => (x.id === n.id ? { ...x, read: true } : x)),
    );
    transactionsApi
      .post("/api/notifications/read", { id: n.id })
      .catch(() => {});
  };

  return (
    <section className={flowCardClass}>
      <div className={flowHeaderClass}>
        <Button variant="ghost" onClick={onBack} className={backBtnClass}>
          <ChevronLeft size={18} /> Back
        </Button>
      </div>
      <h2 className="text-[1.6rem] font-bold text-foreground mb-2">Notifications</h2>

      {notifications.length === 0 ? (
        <p className="text-center text-[var(--soft)] text-sm py-8">
          You're all caught up — no notifications yet.
        </p>
      ) : (
        <div className="flex flex-col gap-[0.6rem] stagger">
          {notifications.map((n) => {
            const Icon = ICONS[n.type] || Bell;
            return (
              <button
                key={n.id}
                type="button"
                onClick={() => markRead(n)}
                className={
                  n.read
                    ? "relative flex gap-3 bg-secondary border border-input rounded-sm px-4 py-[0.6rem] text-left w-full transition-colors duration-300"
                    : "relative flex gap-3 bg-[var(--gold-pale)] border border-[var(--gold-border)] rounded-sm px-4 py-[0.6rem] text-left w-full cursor-pointer transition-colors duration-300"
                }
              >
                <div className="w-9 h-9 rounded-full bg-white/[0.06] text-gold flex items-center justify-center shrink-0">
                  <Icon size={18} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-baseline gap-2">
                    <span className="text-sm font-bold text-foreground">{n.title}</span>
                    <span className="text-[0.7rem] text-[var(--soft)] whitespace-nowrap">
                      {new Date(n.created_at).toLocaleString()}
                    </span>
                  </div>
                  <p className="mt-1 text-[0.82rem] text-muted-foreground leading-[1.4]">
                    {n.message}
                  </p>
                </div>
                {!n.read && (
                  <span className="absolute top-3 right-3 w-2 h-2 rounded-full bg-gold" />
                )}
              </button>
            );
          })}
        </div>
      )}
    </section>
  );
}

export default Notifications;
