import React, { useState, useEffect } from "react";
import TransactionDetails from "./TransactionDetails";
import styles from "./History.module.css";
import { transactionsApi } from "../../utility/axiosInstance";

const PAGE_SIZE = 25;

function History({ selectedTransaction, openDetailsPopup, closeDetailsPopup }) {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);

  const [searchTerm, setSearchTerm] = useState("");

  const fetchTransactions = async () => {
    setLoading(true);
    setError(null);

    try {
      const params = {};
      if (searchTerm.trim()) params.search = searchTerm.trim();

      const response = await transactionsApi.get(
        "/api/transactions/history/",
        { params },
      );

      const data = response.data;
      const txArray = Array.isArray(data)
        ? data
        : data.results || data.transactions || [];
      setTransactions(txArray);
      setPage(1);
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

  useEffect(() => {
    fetchTransactions();
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    fetchTransactions();
  };

  const formatAmount = (tx) => {
    const amount = Number(tx.amount || 0);
    const prefix = tx.transaction_type === "CREDIT" ? "+" : "-";
    return `${prefix}${amount.toFixed(2)}`;
  };

  const totalPages = Math.max(1, Math.ceil(transactions.length / PAGE_SIZE));
  const pagedTransactions = transactions.slice(
    (page - 1) * PAGE_SIZE,
    page * PAGE_SIZE,
  );

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
                <th>Recipient</th>
                <th>Currency</th>
                <th>Amount</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {pagedTransactions.map((tx, index) => {
                const status =
                  tx.status ||
                  (tx.transaction_type === "CREDIT" ? "Received" : "Paid");
                const recipient =
                  tx.name || tx.recipient_name || tx.sender_name || "N/A";

                return (
                  <tr key={tx.id || tx.transaction_code || index}>
                    <td>
                      {new Date(
                        tx.created_at || tx.date || tx.timestamp,
                      ).toLocaleDateString()}
                    </td>
                    <td>{recipient}</td>
                    <td>{tx.currency || "USD"}</td>
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

      {transactions.length > PAGE_SIZE && (
        <div className={styles.pagination}>
          <button
            className={styles.pageBtn}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
          >
            Prev
          </button>
          <span className={styles.pageInfo}>
            Page {page} of {totalPages}
          </span>
          <button
            className={styles.pageBtn}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
          >
            Next
          </button>
        </div>
      )}

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
