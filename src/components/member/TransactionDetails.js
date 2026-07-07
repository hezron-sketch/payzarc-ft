import React, { useState } from "react";
import { countries } from "../../utility/countries";
import styles from "./TransactionDetails.module.css";
import { generateReceiptPDF } from "../../utility/generateReceipt";

function TransactionDetails({ transaction, closeDetailsPopup }) {
  const [isDownloading, setIsDownloading] = useState(false);

  const getFlagEmoji = (countryName) => {
    const country = countries.find(
      (c) => c.name?.toLowerCase() === countryName?.toLowerCase(),
    );
    return country ? country.flag : "🏳️";
  };

  // `transaction` here is the raw tx object History.js fetched from the API
  // (see History.js's own field fallbacks) — not a pre-shaped "details"
  // object. Read the same fallback chains here so nothing renders blank.
  const refNo =
    transaction.refNo || transaction.transaction_code || transaction.reference;

  const name =
    transaction.name ||
    transaction.recipient_name ||
    transaction.sender_name ||
    "N/A";

  const amount = transaction.amount ?? "N/A";

  const fee = transaction.fee ?? transaction.transaction_fee ?? "N/A";

  const rawDate =
    transaction.date || transaction.created_at || transaction.timestamp;
  const date = rawDate ? new Date(rawDate).toLocaleString() : "N/A";

  const recipient =
    transaction.recipient ||
    transaction.recipient_name ||
    transaction.recipient_number ||
    "N/A";

  const status =
    transaction.status ||
    (transaction.transaction_type === "CREDIT" ? "Received" : "Paid");

  const country =
    transaction.country || transaction.recipient_country || transaction.flag;

  const flagEmoji = getFlagEmoji(country);

  /**
   * Handle receipt download
   * Generates a branded Payzarc PDF receipt with transaction details
   */
  const handleDownloadReceipt = async () => {
    try {
      setIsDownloading(true);
      await generateReceiptPDF(transaction);
    } catch (error) {
      console.error("Failed to generate receipt:", error);
      alert("Failed to download receipt. Please try again.");
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className={styles.modalOverlay} onClick={closeDetailsPopup}>
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <div className={styles.modalHeaderLeft}>
            <h3>Transaction Details</h3>
          </div>
          <button className={styles.closeButton} onClick={closeDetailsPopup}>
            ✕
          </button>
        </div>

        <div className={styles.modalImageContainer}>
          <img
            src={transaction.image || "/images/default-user.png"}
            alt="BeneficiaryImg"
            className={styles.modalImage}
            onError={(e) => {
              e.target.src = "/images/default-user.png";
            }}
            loading="lazy"
          />
        </div>

        <table className={styles.detailsTable}>
          <tbody>
            <tr>
              <th>Ref. ID</th>
              <td>{refNo}</td>
            </tr>
            <tr>
              <th>Name</th>
              <td>{name}</td>
            </tr>
            <tr>
              <th>Amount</th>
              <td className={styles.amountCell}>{amount}</td>
            </tr>
            <tr>
              <th>Fee</th>
              <td>{fee}</td>
            </tr>
            <tr>
              <th>Date</th>
              <td>{date}</td>
            </tr>
            <tr>
              <th>Recipient</th>
              <td>{recipient}</td>
            </tr>
            <tr>
              <th>Status</th>
              <td>
                <span
                  className={`${styles.statusBadge} ${styles[`status${status}`.replace(/\s+/g, "")]}`}
                >
                  {status}
                </span>
              </td>
            </tr>
            <tr>
              <th>Country</th>
              <td>
                <span className={styles.flagContainer}>
                  <span className={styles.flagEmoji}>{flagEmoji}</span>
                  <span className={styles.countryName}>{country}</span>
                </span>
              </td>
            </tr>
          </tbody>
        </table>

        <div className={styles.modalActions}>
          <button
            className={styles.downloadButton}
            onClick={handleDownloadReceipt}
            disabled={isDownloading}
            title="Download transaction receipt as PDF"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            {isDownloading ? "Generating..." : "Download Receipt"}
          </button>
          <button
            className={styles.closeActionButton}
            onClick={closeDetailsPopup}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

export default TransactionDetails;
