import React, { useState, useEffect } from 'react';
import styles from './Friends.module.css';
import { djangoApis } from '../../utility/axiosInstance';

function Friends() {
  const [favourites, setFavourites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchAllFavourites();
  }, []);

  const fetchAllFavourites = async () => {
    try {
      const token = localStorage.getItem('token') || localStorage.getItem('accessToken');
      if (!token) {
        setError("No token found. Please log in again.");
        setLoading(false);
        return;
      }

      const response = await djangoApis.system2.get('/api/favorites/all/');
      const result = response.data;

      if (result.success) {
        setFavourites(result.favourites || []);
      } else {
        setError(result.message || "Failed to load recipients");
      }
    } catch (err) {
      console.error("Full error:", err);
      if (err.response) {
        setError(`Server error: ${err.response.data.message || 'Unknown error'}`);
      } else if (err.request) {
        setError("Cannot connect to server. Is Django running?");
      } else {
        setError("Request error: " + err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className={styles.section}>Loading your recipients...</div>;
  if (error) return <div className={styles.section}>Error: {error}</div>;

  return (
    <div className={`${styles.section} ${styles.active}`}>
      <h2>My Recipients ({favourites.length})</h2>

      {favourites.length === 0 ? (
        <p>You have no saved recipients yet.</p>
      ) : (
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Phone</th>
              <th>Label</th>
            </tr>
          </thead>
          <tbody>
            {favourites.map((fav, index) => (
              <tr key={fav.id} className={index % 2 === 0 ? styles.evenRow : styles.oddRow}>
                <td>{fav.display_name || '—'}</td>
                <td className={styles.emailCell}>{fav.email || '—'}</td>
                <td className={styles.phoneCell}>{fav.phone || '—'}</td>
                <td className={styles.labelCell}>{fav.label || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

export default Friends;