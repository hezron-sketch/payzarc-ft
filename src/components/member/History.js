import React, { useState, useEffect } from "react";
import TransactionDetails from "./TransactionDetails";
import { countries } from "../../utility/countries";
import styles from "./History.module.css";
import { transactionsApi } from "../../utility/axiosInstance";

function History({ selectedTransaction, openDetailsPopup, closeDetailsPopup }) {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Filter states
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  const fetchTransactions = async () => {
    setLoading(true);
    setError(null);

    // --- Auth temporarily disabled — re-enable when ready ---
    // let rawToken = localStorage.getItem("accessToken");
    //
    // if (!rawToken) {
    //   setError("Please login again. No token found.");
    //   setLoading(false);
    //   return;
    // }
    //
    // // Clean token
    // let token = rawToken
    //   .replace(/^["']|["']$/g, "")
    //   .replace(/\\"/g, "")
    //   .replace(/Bearer\s*/i, "")
    //   .trim();

    try {
      const params = {};
      if (dateFrom) params.date_from = dateFrom;
      if (dateTo) params.date_to = dateTo;
      if (searchTerm.trim()) params.search = searchTerm.trim();

      // Using transactionsApi as it's proven to work in Home.js
      const response = await transactionsApi.get(
        "/api/transactions/history/",
        { params },
        // Auth temporarily disabled — re-enable when ready:
        // { params, headers: { Authorization: `Bearer ${token}` } },
      );

      const data = response.data;
      const txArray = Array.isArray(data)
        ? data
        : data.results || data.transactions || [];
      setTransactions(txArray);
      setError(null);
    } catch (err) {
      console.error("❌ History Fetch Error:", err.response?.data || err);
      setError(
        err.response?.data?.detail ||
          err.message ||
          "Failed to load transactions",
      );
      setTransactions([]);
    } finally {
      setLoading(false);
    }
  };

  // Load on mount
  useEffect(() => {
    fetchTransactions();
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    fetchTransactions();
  };

  const getFlagEmoji = (countryName) => {
    const country = countries.find(
      (c) => c.name.toLowerCase() === countryName?.toLowerCase(),
    );
    return country ? country.flag : "🏳️";
  };

  const formatAmount = (tx) => {
    const amount = Number(tx.amount || 0);
    const prefix = tx.transaction_type === "CREDIT" ? "+" : "-";
    return `${prefix}$${amount.toFixed(2)}`;
  };

  return (
    <div className={styles.section}>
      {/* Filter Section */}
      <div className={styles.dateGroup}>
        <div className={styles.buttonGroup}>
          <input
            type="text"
            placeholder="Search transactions..."
            className={styles.inputField}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className={styles.dateInput}>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className={styles.dateInput}
          />
        </div>
        <div className={styles.dateInput}>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className={styles.dateInput}
          />
        </div>
        <button
          className={styles.searchButton}
          onClick={handleSearch}
          disabled={loading}
        >
          {loading ? "..." : "Search"}
        </button>
      </div>

      {/* Table Section */}
      <div className={styles.tableContainer}>
        {loading && (
          <p className={styles.loadingText}>Loading transactions...</p>
        )}

        {error && <p className={styles.errorText}>{error}</p>}

        {!loading && !error && transactions.length === 0 && (
          <p className={styles.noDataText}>No transactions found.</p>
        )}

        {transactions.length > 0 && (
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Date</th>
                <th>Ref. No.</th>
                <th>Name</th>
                <th>Country</th>
                <th>Amt</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((tx, index) => {
                const status =
                  tx.status ||
                  (tx.transaction_type === "CREDIT" ? "Received" : "Paid");
                const country = tx.country || tx.recipient_country || "Kenya";

                return (
                  <tr key={tx.id || tx.transaction_code || index}>
                    <td>
                      {new Date(
                        tx.created_at || tx.date || tx.timestamp,
                      ).toLocaleDateString()}
                    </td>
                    <td>{tx.transaction_code || tx.refNo || tx.reference}</td>
                    <td>
                      {tx.name || tx.recipient_name || tx.sender_name || "N/A"}
                    </td>
                    <td>
                      <span className={styles.flagContainer}>
                        <span className={styles.flagEmoji}>
                          {getFlagEmoji(country)}
                        </span>
                        <span className={styles.countryName}>{country}</span>
                      </span>
                    </td>
                    <td
                      className={
                        tx.transaction_type === "CREDIT"
                          ? styles.credit
                          : styles.debit
                      }
                    >
                      {formatAmount(tx)}
                    </td>
                    <td>
                      <button
                        className={styles.statusButton}
                        onClick={() => openDetailsPopup(tx)}
                      >
                        {status}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Popup */}
      {selectedTransaction && (
        <TransactionDetails
          transaction={selectedTransaction}
          closeDetailsPopup={closeDetailsPopup}
        />
      )}
    </div>
  );
}

export default History;
