import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import styles from './SetPassword.module.css';
import axios from 'axios';
import { API_URL } from '../../utility/constants';

function SetPassword({ onBack }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { firstName = 'User', email = '' } = location.state || {};

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [blocked, setBlocked] = useState(false);

  // EXACT same regex as your Spring Boot backend
  const PASSWORD_REGEX = /^(?=.*[A-Z])(?=.*[a-z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,15}$/;

  useEffect(() => {
    const checkIfBlocked = async () => {
      if (email) {
        try {
          const response = await axios.get(`${API_URL}/api/is-blocked?email=${email}`);
          setBlocked(response.data);
        } catch (err) {
          console.error('Failed to check blocked status:', err);
        }
      }
    };
    checkIfBlocked();
  }, [email]);

  const logAttempt = async (remark) => {
    try {
      const response = await axios.post(`${API_URL}/api/register/password-attempt`, { email, remark });
      if (response.data.blocked) {
        setBlocked(true);
      }
    } catch (err) {
      console.error('Failed to log attempt:', err);
    }
  };

  const validatePassword = (pwd) => {
    if (!PASSWORD_REGEX.test(pwd)) {
      return 'Password must be 8–15 characters and contain: uppercase, lowercase, number, and one of @ $ ! % * ? &';
    }
    return '';
  };

  const handleSetPassword = async (e) => {
    e.preventDefault();
    setError('');

    // Basic required checks
    if (!email || !password || !confirmPassword) {
      setError('All fields are required.');
      await logAttempt('All fields are required.');
      return;
    }

    if (email.length < 10 || email.length > 30) {
      setError('Email must be between 10 and 30 characters.');
      await logAttempt('Invalid email length');
      return;
    }

    // NEW: Use the same regex as backend
    const passwordError = validatePassword(password);
    if (passwordError) {
      setError(passwordError);
      await logAttempt('Invalid password format');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      await logAttempt('Passwords do not match');
      return;
    }

    try {
      const response = await axios.post(`${API_URL}/api/register/password`, {
        email,
        password,
        confirmPassword
      });

      if (response.status === 200) {
        setSuccess(true);
      }
    } catch (err) {
      const message = err.response?.data || 'Failed to set password. Please try again.';
      setError(message);
      await logAttempt(message);
    }
  };

  const capitalizeFirstLetter = (str) => {
    if (!str || typeof str !== 'string') return 'User';
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
  };

  return (
    <div className={styles.app}>
      {blocked ? (
        <div className={styles.popupOverlay}>
          <div className={styles.popupContent}>
            <h2 className={`${styles.popupTitle} ${styles.error}`}>Email Blocked</h2>
            <p className={styles.popupMessage}>Your email is blocked. Please contact support.</p>
            <div className={styles.popupButtonContainer}>
              <button
                onClick={() => navigate('/')}
                className={`${styles.popupButton} ${styles.errorButton}`}
              >
                OK
              </button>
            </div>
          </div>
        </div>
      ) : success ? (
        <div className={styles.popupOverlay}>
          <div className={styles.popupContent}>
            <h2 className={`${styles.popupTitle} ${styles.success}`}>Password Set Successfully</h2>
            <p className={styles.popupMessage}>
              Dear {capitalizeFirstLetter(firstName)}, your password has been set successfully.
            </p>
            <div className={styles.popupButtonContainer}>
              <button
                onClick={() => navigate('/components/member/login')}
                className={`${styles.popupButton} ${styles.successButton}`}
              >
                Now Login
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className={styles.setpswdContainer}>
          <div className={styles.innerContainer}>
            <img src="/images/payzarc.png" alt="Payzarc" className={styles.appLogo} />
            <h2 className={styles.setpswdTitle}>Welcome!</h2>
            <p className={styles.setpswdTitlee}>{capitalizeFirstLetter(firstName)}</p>
            <p className={styles.setpswdTitlee}>{email}</p>
            <p className={styles.setpswdInfo}>Let's secure your account with a strong password.</p>

            <form onSubmit={handleSetPassword} className={styles.setpswdForm}>
              <input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={styles.inputField}
                required
              />
              <input
                type="password"
                placeholder="Confirm Password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className={styles.inputField}
                required
              />

              {/* Helpful password rules below inputs */}
              <div style={{ fontSize: '0.85rem', color: '#666', marginTop: '10px', textAlign: 'left' }}>
                <ul style={{ margin: '8px 0', paddingLeft: '20px' }}>
                  <li>8–15 characters long</li>
                  <li>At least 1 uppercase letter</li>
                  <li>At least 1 lowercase letter</li>
                  <li>At least 1 number</li>
                  <li>At least one of: @ $ ! % * ? &</li>
                </ul>
              </div>

              {error && <p className={styles.errorMessage}>{error}</p>}

              <button type="submit" className={styles.setpswdButton}>
                Set Password
              </button>
            </form>

            <p className={styles.slogan}>Your financial trusted partner at a go.</p>
          </div>
        </div>
      )}
    </div>
  );
}

export default SetPassword;