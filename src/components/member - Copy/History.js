import React from 'react';
import TransactionDetails from './TransactionDetails';
import { countries } from '../../utility/countries'; // Adjust path if necessary
import styles from './History.module.css';

function History({ selectedTransaction, openDetailsPopup, closeDetailsPopup }) {
  const transactions = [
    {
      date: '2025/04/05 08:05:45.438',
      refNo: '25kg04F7058',
      name: 'Neils Ogar',
      flag: 'South Africa',
      amount: '$230.00',
      status: 'Received',
      image: 'https://via.placeholder.com/100',
      fee: '$5.00',
      recipient: 'Joseph Were',
    },
    {
      date: '2025/04/06 08:05:45.438',
      refNo: '25kg04F7058',
      name: 'Appolly Bohr',
      flag: 'Uganda',
      amount: '$50.00',
      status: 'Paid',
      image: 'https://via.placeholder.com/100',
      fee: '$2.00',
      recipient: 'Alex Kerundu',
    },
    {
      date: '2025/07/05 08:05:45.438',
      refNo: '25kg04F7008',
      name: 'Alex Odoo',
      flag: 'Kenya',
      amount: '$700.00',
      status: 'Paid',
      image: 'https://via.placeholder.com/100',
      fee: '$10.00',
      recipient: 'Benjamin Omera',
    },
  ];

  const getFlagEmoji = (countryName) => {
    const country = countries.find(c => c.name.toLowerCase() === countryName.toLowerCase());
    return country ? country.flag : '🏳️'; // Fallback flag if not found
  };

  return (
    <div className={styles.section}>
      <div className={styles.dateGroup}>
        <div className={styles.buttonGroup}>
          <input
            type="email"
            placeholder="Email or phone no"
            className={styles.inputField}
          />
        </div>
        <div className={styles.dateInput}>
          <input
            type="date"
            id="toDate"
            className={styles.dateInput}
          />
        </div>
        <button className={styles.searchButton} title="Load Transactions">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
            <path d="M15.5 14h-.79l-.28-.27a6.5 6.5 0 0 0 1.48-5.34c-.47-2.78-2.79-5-5.59-5.34a6.505 6.505 0 0 0-7.27 7.27c.34 2.8 2.56 5.12 5.34 5.59a6.5 6.5 0 0 0 5.34-1.48l.27.28v.79l4.25 4.25c.41.41 1.08.41 1.49 0 .41-.41.41-1.08 0-1.49L15.5 14z" />
          </svg>
        </button>
      </div>
      <div className={styles.tableContainer}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Date</th> {/* Added Date column */}
              <th>Ref. No.</th>
              <th>Name</th>
              <th>Country</th>
              <th>Amt</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {transactions.map((transaction, index) => (
              <tr key={index}>
                <td>{transaction.date}</td> {/* Display date */}
                <td>{transaction.refNo}</td>
                <td>{transaction.name}</td>
                <td>
                  <span className={styles.flagContainer}>
                    <span className={styles.flagEmoji}>{getFlagEmoji(transaction.flag)}</span>
                    <span className={styles.countryName}>{transaction.flag}</span>
                  </span>
                </td>
                <td>{transaction.amount}</td>
                <td>
                  <button
                    className={styles.statusButton}
                    onClick={() => openDetailsPopup(transaction)}
                  >
                    {transaction.status}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
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