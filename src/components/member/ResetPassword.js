// src/components/member/ResetPassword.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faHome, faRedo } from '@fortawesome/free-solid-svg-icons';
import axiosInstance from '../../utility/axiosInstance';
import styles from './ResetPassword.module.css';

function ResetPassword({ onBack }) {
  const [step, setStep] = useState('email');
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('User');
  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [remainingTime, setRemainingTime] = useState(120);
  const [timerActive, setTimerActive] = useState(false);
  const [isBlocked, setIsBlocked] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (!timerActive || remainingTime <= 0) return;
    const interval = setInterval(() => {
      setRemainingTime((prev) => (prev <= 1 ? 0 : prev - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [timerActive, remainingTime]);

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handleSendOtp = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const trimmedEmail = email.trim();
    if (!trimmedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setError('Please enter a valid email address');
      setLoading(false);
      return;
    }

    try {
      const res = await axiosInstance.post('/api/reset-password-email', { email: trimmedEmail });
      if (res.data.success) {
        setFullName(res.data.fullName || 'User');
        setEmail(trimmedEmail);
        setStep('otp');
        setRemainingTime(120);
        setTimerActive(true);
        setIsBlocked(false);
      } else {
        setError(res.data.error || 'Failed to send reset code');
      }
    } catch (err) {
      const msg = err.response?.data?.error || 'Something went wrong';
      if (msg.toLowerCase().includes('blocked') || msg.includes('Too many')) {
        setIsBlocked(true);
        setError('Too many attempts. Please try again later.');
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const trimmedOtp = otp.trim().toUpperCase();
    if (trimmedOtp.length !== 6 || !/^[A-Z0-9]{6}$/.test(trimmedOtp)) {
      setError('Please enter a valid 6-character code');
      setLoading(false);
      return;
    }

    try {
      const res = await axiosInstance.post('/api/verify-email-code', {
        email,
        code: trimmedOtp,
        purpose: 'PASSWORD_RESET'
      });

      if (res.data.result === 'valid') {
        // Fixed navigation path
        navigate('/components/member/set-new-password', { state: { email } });
        // Or if you change routes to short paths: navigate('/set-new-password', { state: { email } });
      } else if (res.data.result === 'locked') {
        setIsBlocked(true);
        setError('Too many invalid attempts. Account temporarily locked.');
      } else {
        setError(res.data.error || 'Invalid code');
        setOtp('');
      }
    } catch (err) {
      const msg = err.response?.data?.error || 'Verification failed';
      setError(msg);
      setOtp('');
      if (msg.toLowerCase().includes('locked') || msg.includes('Too many')) {
        setIsBlocked(true);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setError('');
    setLoading(true);
    try {
      await axiosInstance.post('/api/reset-password-email', { email });
      setRemainingTime(120);
      setTimerActive(true);
      setOtp('');
      setError('New code sent successfully!');
    } catch (err) {
      const msg = err.response?.data?.error || 'Failed to resend code';
      setError(msg);
      if (msg.toLowerCase().includes('blocked')) setIsBlocked(true);
    } finally {
      setLoading(false);
    }
  };

  if (isBlocked) {
    return (
      <div className={styles.app}>
        <div className={styles.apppLogo}>
          <img src="/images/payzarc.png" alt="Payzarc" className={styles.appLogo} />
          <div className={styles.innerContainer}>
            <h2 style={{ color: '#ff6347' }}>Temporarily Blocked</h2>
            <p style={{ color: '#cbd5e1', margin: '1.5rem 0', textAlign: 'center' }}>
              Too many reset attempts. Please try again later or contact support.
            </p>
            <button onClick={onBack} className={styles.homeButton}>
              <FontAwesomeIcon icon={faHome} /> Return Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.app}>
      <div className={styles.apppLogo}>
        <img src="/images/payzarc.png" alt="Payzarc" className={styles.appLogo} />

        <div className={styles.innerContainer}>
          <button onClick={onBack} className={styles.homeButton}>
            <FontAwesomeIcon icon={faHome} />
          </button>

          {step === 'email' ? (
            <>
              <h2>Forgot Password</h2>
              <p>We'll send a reset code to your registered email</p>
              <form onSubmit={handleSendOtp} className={styles.form}>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Email address"
                  required
                  className={styles.inputField}
                />
                {error && <p className={styles.error}>{error}</p>}
                <button type="submit" disabled={loading} className={styles.loginButton}>
                  {loading ? 'Sending...' : 'Send Reset Code'}
                </button>
              </form>
            </>
          ) : (
            <>
              <h2>Enter Reset Code</h2>
              <p>Code sent to <strong>{email}</strong></p>
              <form onSubmit={handleVerifyOtp} className={styles.form}>
                <input
                  type="text"
                  maxLength={6}
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
                  placeholder="Enter 6-digit code"
                  required
                  autoFocus
                  className={styles.inputField}
                />
                {error && <p className={styles.error}>{error}</p>}
                {remainingTime > 0 && (
                  <p className={styles.timer}>Time remaining: {formatTime(remainingTime)}</p>
                )}
                <button
                  type="submit"
                  disabled={loading || remainingTime === 0}
                  className={styles.verifyButton}
                >
                  {loading ? 'Verifying...' : 'Verify & Continue'}
                </button>
              </form>

              {remainingTime === 0 && (
                <button onClick={handleResend} disabled={loading} className={styles.resendButton}>
                  <FontAwesomeIcon icon={faRedo} /> Resend Code
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default ResetPassword;