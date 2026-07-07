import React, { useState, useEffect } from "react";
import { ArrowLeft, Bell, ArrowDownCircle, ShieldAlert, CheckCircle2 } from "lucide-react";
import { transactionsApi } from "../../utility/axiosInstance";
import homeStyles from "./Home.module.css";
import styles from "./Notifications.module.css";

const ICONS = {
  receive: ArrowDownCircle,
  security: ShieldAlert,
  transaction: CheckCircle2,
};

function Notifications({ onBack }) {
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    transactionsApi
      .get("/api/notifications/")
      .then((res) => setNotifications(Array.isArray(res.data) ? res.data : []))
      .catch(() => {});
  }, []);

  return (
    <section
      className={`${homeStyles.flowCard} ${homeStyles.flowSection} ${styles.entrance}`}
    >
      <div className={homeStyles.flowHeader}>
        <button className={homeStyles.backBtn} onClick={onBack}>
          <ArrowLeft size={18} /> Back
        </button>
      </div>
      <h2 className={styles.pageTitle}>Notifications</h2>

      {notifications.length === 0 ? (
        <p className={styles.empty}>You're all caught up — no notifications yet.</p>
      ) : (
        <div className={styles.list}>
          {notifications.map((n) => {
            const Icon = ICONS[n.type] || Bell;
            return (
              <div
                key={n.id}
                className={`${styles.item} ${n.read ? "" : styles.itemUnread}`}
              >
                <div className={styles.itemIcon}>
                  <Icon size={18} />
                </div>
                <div className={styles.itemBody}>
                  <div className={styles.itemHeader}>
                    <span className={styles.itemTitle}>{n.title}</span>
                    <span className={styles.itemTime}>
                      {new Date(n.created_at).toLocaleString()}
                    </span>
                  </div>
                  <p className={styles.itemMessage}>{n.message}</p>
                </div>
                {!n.read && <span className={styles.unreadDot} />}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

export default Notifications;
