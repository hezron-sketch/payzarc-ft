// src/components/member/SetNewPassword.jsx
import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faHome } from '@fortawesome/free-solid-svg-icons';
import axiosInstance from '../../utility/axiosInstance';
import styles from './SetNewPassword.module.css';

function SetNewPassword() {
  const { state } = useLocation();
  const navigate = useNavigate();
  const email = state?.email;

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (!email) {
    navigate('/reset-password');
    return null;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,15}$/.test(newPassword)) {
      setError('8–15 characters with uppercase, lowercase, number & special character');
      return;
    }

    setLoading(true);

    try {
      await axiosInstance.post('/api/reset-password/set', {
        email,
        code: 'used',
        newPassword,
        confirmPassword
      });
      alert('Password reset successful! Please log in.');
      navigate('/login');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to reset password');
      console.error('Reset error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.app}>
      <div className={styles.apppLogo}>
        <img src="/images/payzarc.png" alt="Payzarc" className={styles.appLogo} />

        <div className={styles.innerContainer}>
          <button onClick={() => navigate('/reset-password')} className={styles.homeButton}>
            <FontAwesomeIcon icon={faHome} />
          </button>

          <h2>Set New Password</h2>
          <p>For account: <strong>{email}</strong></p>

          <form onSubmit={handleSubmit} className={styles.form}>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="New Password"
              required
              className={styles.inputField}
            />

            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm Password"
              required
              className={styles.inputField}
            />

            {error && <p className={styles.error}>{error}</p>}

            <button type="submit" disabled={loading} className={styles.loginButton}>
              {loading ? 'Resetting...' : 'Reset Password'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default SetNewPassword;