import React from 'react';
import { countries } from '../../utility/countries';
import styles from './TransactionDetails.module.css';

function TransactionDetails({ transaction, closeDetailsPopup }) {
  const getFlagEmoji = (countryName) => {
    const country = countries.find(c => c.name.toLowerCase() === countryName.toLowerCase());
    return country ? country.flag : '🏳️';
  };

  return (
    <div className={styles.modalOverlay} onClick={closeDetailsPopup}>
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        <button className={styles.closeButton} onClick={closeDetailsPopup}>
          Close
        </button>
        <h3>Transaction Details</h3>
        <img
          src={transaction.image || '/images/default-user.png'}
          alt="BeneficiaryImg"
          className={styles.modalImage}
          onError={(e) => { e.target.src = '/images/default-user.png'; }}
          loading="lazy"
        />
        <table className={styles.detailsTable}>
          <tbody>
            <tr>
              <th>Ref. ID</th>
              <td>{transaction.refNo}</td>
            </tr>
            <tr>
              <th>Name</th>
              <td>{transaction.name}</td>
            </tr>
            <tr>
              <th>Amount</th>
              <td>{transaction.amount}</td>
            </tr>
            <tr>
              <th>Fee</th>
              <td>{transaction.fee}</td>
            </tr>
            <tr>
              <th>Date</th>
              <td>{transaction.date}</td>
            </tr>
            <tr>
              <th>Recipient</th>
              <td>{transaction.recipient}</td>
            </tr>
            <tr>
              <th>Status</th>
              <td>{transaction.status}</td>
            </tr>
            <tr>
              <th>Country</th>
              <td>
                <span className={styles.flagContainer}>
                  <span className={styles.flagEmoji}>{getFlagEmoji(transaction.flag)}</span>
                  <span className={styles.countryName}>{transaction.flag}</span>
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default TransactionDetails;