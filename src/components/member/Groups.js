import React from 'react';
import styles from './Groups.module.css';

function Groups() {
  return (
    <div className={`${styles.section} ${styles.active}`}>
      <h2>Group Fund</h2>
      <div className={styles.fundOptions}>
        <button className={`${styles.fundButton} ${styles.emergency}`}>⚠ Emergency</button>
        <button className={`${styles.fundButton} ${styles.funeral}`}>🌸 Funeral</button>
        <button className={`${styles.fundButton} ${styles.wedding}`}>💒 Wedding</button>
      </div>
      <button className={styles.createGroup}>+ Create Group</button>
    </div>
  );
}

export default Groups;