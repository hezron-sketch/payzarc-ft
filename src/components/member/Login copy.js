// src/components/member/Login.jsx
import React, { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faHome } from '@fortawesome/free-solid-svg-icons';
import { useNavigate, Link } from 'react-router-dom';
import axiosInstance from '../../utility/axiosInstance';
import styles from './Login.module.css';

function Login({ onBack }) {
  const [isLoginStepOneOk, setLoginStepOne] = useState(false);
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [otp, setOtp] = useState('');
  const otpRefs = React.useRef([]);
  const [showBlocked, setShowBlocked] = useState(false);
  const [showNotRegistered, setShowNotRegistered] = useState(false);
  const [showInvalidFormat, setShowInvalidFormat] = useState(false);
  const [showIncorrectCredentials, setShowIncorrectCredentials] = useState(false);
  const [showGenericError, setShowGenericError] = useState(false);
  const [showExpired, setShowExpired] = useState(false);
  const [errorPopupMsg, setErrorPopupMsg] = useState('');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [remainingTime, setRemainingTime] = useState(120);
  const [timerStarted, setTimerStarted] = useState(false);
  const [useUsername, setUseUsername] = useState(true);

  const navigate = useNavigate();

  const usernameRegex = /^[a-zA-Z0-9 ]{3,30}$/;
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      // User is already logged in → bounce them to dashboard immediately
      navigate('/components/member/dashboard');
    }
  }, [navigate]);

  // Timer for OTP expiry
  useEffect(() => {
    let interval;
    if (isLoginStepOneOk && timerStarted && remainingTime > 0) {
      interval = setInterval(() => {
        setRemainingTime((prev) => {
          if (prev <= 1) {
            clearInterval(interval);
            setShowExpired(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isLoginStepOneOk, timerStarted, remainingTime]);

  useEffect(() => {
    setIdentifier('');
    setPassword('');
    setError('');
  }, [useUsername]);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const resendOtp = async () => {
    try {
      await axiosInstance.post('/api/login', { email, password: 'resend' });
      setRemainingTime(120);
      setTimerStarted(true);
      setShowExpired(false);
      setError('');
    } catch (err) {
      setError('Failed to resend OTP. Try again.');
    }
  };

  // OTP input handlers
  const handleOtpChange = (value, index) => {
    if (!value) return;
    if (!/^[A-Z0-9]$/i.test(value)) return;
    const upperValue = value.toUpperCase();
    const newOtp = otp.split('');
    newOtp[index] = upperValue;
    const finalOtp = newOtp.join('').slice(0, 6);
    setOtp(finalOtp);
    if (upperValue && index < 5) otpRefs.current[index + 1]?.focus();
    if (finalOtp.length === 6) handleVerify(new Event('submit'));
  };

  const handleOtpKeyDown = (e, index) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  };

  const handleOtpPaste = (e) => {
    e.preventDefault();
    const paste = e.clipboardData.getData('text');
    const cleaned = paste.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
    if (cleaned) {
      setOtp(cleaned);
      const lastIndex = Math.min(cleaned.length - 1, 5);
      otpRefs.current[lastIndex]?.focus();
      if (cleaned.length === 6) setTimeout(() => handleVerify(new Event('submit')), 100);
    }
  };

  // Step 1: Login with password
  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setShowBlocked(false);
    setShowNotRegistered(false);
    setShowInvalidFormat(false);
    setShowIncorrectCredentials(false);
    setShowGenericError(false);

    if (!identifier || !password) {
      setError('All fields are required.');
      return;
    }

    let loginEmail = '';

    try {
      if (useUsername) {
        const trimmed = identifier.trim();
        if (!usernameRegex.test(trimmed)) {
          setError('Username must be 3-30 characters (letters, numbers, spaces).');
          return;
        }
        const resolveRes = await axiosInstance.post('/api/resolve-username', { username: trimmed });
        if (!resolveRes.data?.email) {
          setShowNotRegistered(true);
          setError('Username not found.');
          return;
        }
        loginEmail = resolveRes.data.email;
      } else {
        if (!emailRegex.test(identifier)) {
          setError('Please enter a valid email address.');
          setShowInvalidFormat(true);
          return;
        }
        loginEmail = identifier;
      }

      if (password.length < 8 || password.length > 15) {
        setError('Password must be 8-15 characters long.');
        return;
      }

      const res = await axiosInstance.post('/api/login', {
        email: loginEmail,
        password,
      });

      setFullName(res.data.fullName || 'User');
      setEmail(loginEmail);
      setLoginStepOne(true);
      setRemainingTime(120);
      setTimerStarted(true);
      setShowExpired(false);

    } catch (err) {
      const errMsg = err.response?.data?.error || 'Login failed. Please try again.';

      if (
        errMsg.toLowerCase().includes('invalid credentials') ||
        errMsg.toLowerCase().includes('incorrect password') ||
        err.response?.status === 401
      ) {
        setShowIncorrectCredentials(true);
        setError('Incorrect username/email or password.');
        setIdentifier('');
        setPassword('');
      } else if (errMsg.toLowerCase().includes('blocked')) {
        setShowBlocked(true);
      } else if (errMsg.toLowerCase().includes('not registered') || errMsg.toLowerCase().includes('username not found')) {
        setShowNotRegistered(true);
      } else if (errMsg.toLowerCase().includes('invalid')) {
        setShowInvalidFormat(true);
      } else {
        setErrorPopupMsg(errMsg);
        setShowGenericError(true);
      }

      setPassword('');
    }
  };

  // Step 2: Verify OTP
  const handleVerify = async (e) => {
    e.preventDefault();
    setError('');
    if (otp.length !== 6) {
      setError('Please enter all 6 characters');
      return;
    }
    try {
      const verifyRes = await axiosInstance.post('/api/login/verify-otp', {
        email,
        code: otp,
      });
      const data = verifyRes.data;
      if (data.accessToken && data.user) {
        localStorage.setItem('accessToken', data.accessToken); // ← Store short-lived token
        localStorage.setItem('user', JSON.stringify(data.user));
        navigate('/components/member/dashboard');
      } else {
        setError('Login failed. Please try again.');
      }
    } catch (err) {
      const res = err.response?.data;
      if (res?.result === 'invalid') {
        setError(`Wrong OTP. Attempts: ${res.attempts || '?'} / 3`);
        setOtp('');
      } else if (res?.result === 'expired') {
        setShowExpired(true);
        setOtp('');
      } else if (res?.result === 'too_many_attempts') {
        setShowBlocked(true);
        setLoginStepOne(false);
        clearFields();
      } else {
        setError('Verification failed. Please try again.');
        setOtp('');
      }
    }
  };

  const clearFields = () => {
    setIdentifier('');
    setPassword('');
    setOtp('');
    setEmail('');
    setFullName('');
    setLoginStepOne(false);
    setTimerStarted(false);
    setRemainingTime(120);
  };

  // POPUPS — Only OK button closes them (clicking outside does nothing)
  const blockedPopup = (
    <div className={styles.popupOverlay}>
      <div className={styles.popupContent} onClick={(e) => e.stopPropagation()}>
        <h2 className={`${styles.popupTitle} ${styles.error}`}>Account Blocked</h2>
        <p className={styles.popupMessage}>Your account is blocked. Please contact support.</p>
        <div className={styles.popupButtonContainer}>
          <button onClick={() => setShowBlocked(false)} className={`${styles.popupButton} ${styles.errorButton}`}>
            OK
          </button>
        </div>
      </div>
    </div>
  );

  const notRegisteredPopup = (
    <div className={styles.popupOverlay}>
      <div className={styles.popupContent} onClick={(e) => e.stopPropagation()}>
        <h2 className={`${styles.popupTitle} ${styles.error}`}>Not Registered</h2>
        <p className={styles.popupMessage}>This username/email is not registered.</p>
        <div className={styles.popupButtonContainer}>
          <button onClick={() => setShowNotRegistered(false)} className={`${styles.popupButton} ${styles.errorButton}`}>
            OK
          </button>
        </div>
      </div>
    </div>
  );

  const invalidFormatPopup = (
    <div className={styles.popupOverlay}>
      <div className={styles.popupContent} onClick={(e) => e.stopPropagation()}>
        <h2 className={`${styles.popupTitle} ${styles.error}`}>Invalid Format</h2>
        <p className={styles.popupMessage}>Please check your input format.</p>
        <div className={styles.popupButtonContainer}>
          <button onClick={() => setShowInvalidFormat(false)} className={`${styles.popupButton} ${styles.errorButton}`}>
            OK
          </button>
        </div>
      </div>
    </div>
  );

  const incorrectCredentialsPopup = (
    <div className={styles.popupOverlay}>
      <div className={styles.popupContent} onClick={(e) => e.stopPropagation()}>
        <h2 className={`${styles.popupTitle} ${styles.error}`}>Login Failed</h2>
        <p className={styles.popupMessage}>
          Incorrect username/email or password. Please try again.
        </p>
        <div className={styles.popupButtonContainer}>
          <button
            onClick={() => setShowIncorrectCredentials(false)}
            className={`${styles.popupButton} ${styles.errorButton}`}
          >
            OK
          </button>
        </div>
      </div>
    </div>
  );

  const genericErrorPopup = (
    <div className={styles.popupOverlay}>
      <div className={styles.popupContent} onClick={(e) => e.stopPropagation()}>
        <h2 className={`${styles.popupTitle} ${styles.error}`}>Error</h2>
        <p className={styles.popupMessage}>{errorPopupMsg}</p>
        <div className={styles.popupButtonContainer}>
          <button onClick={() => setShowGenericError(false)} className={`${styles.popupButton} ${styles.errorButton}`}>
            OK
          </button>
        </div>
      </div>
    </div>
  );

  const normalContent = (
    <div className={styles.apppLogo}>
      <img src="/images/payzarc.png" alt="Payzarc" className={styles.appLogo} />
      {!isLoginStepOneOk ? (
        <div className={styles.loginContainer}>
          <div className={styles.innerContainer}>
            <div className={styles.toggleContainer}>
              <span>Login with {useUsername ? 'Username' : 'Email'}</span>
              <label className={styles.switch}>
                <input type="checkbox" checked={!useUsername} onChange={() => setUseUsername(!useUsername)} />
                <span className={styles.slider}></span>
              </label>
            </div>
            <div className={styles.loginForm}>
              <input
                type={useUsername ? 'text' : 'email'}
                placeholder={useUsername ? 'Username' : 'Email address'}
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                className={styles.inputField}
              />
              <input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={styles.inputField}
              />
              {error && <p className={styles.error}>{error}</p>}
              <button onClick={handleLogin} className={styles.loginButton}>Login</button>
            </div>
            <div className={styles.links}>
              <Link to="/components/member/register">Register</Link>
              <Link to="/components/member/reset-password">Forgot Password?</Link>
            </div>
            <p className={styles.slogan}>Your financial trusted partner at a go.</p>
            <button className={styles.homeButton} onClick={onBack} title="Return to Home">
              <FontAwesomeIcon icon={faHome} />
            </button>
          </div>
        </div>
      ) : (
        <div className={styles.verifyContainer}>
          <div className={styles.innerContainer}>
            <h2>Welcome, {fullName}</h2>
            <p>Enter the 6-digit code sent to {email}</p>
            <div className={styles.otpContainer}>
              {[...Array(6)].map((_, index) => (
                <input
                  key={index}
                  type="text"
                  inputMode="text"
                  maxLength={1}
                  value={otp[index] || ''}
                  onChange={(e) => handleOtpChange(e.target.value, index)}
                  onKeyDown={(e) => handleOtpKeyDown(e, index)}
                  onPaste={index === 0 ? handleOtpPaste : undefined}
                  className={styles.otpBox}
                  autoComplete="one-time-code"
                  ref={(el) => (otpRefs.current[index] = el)}
                />
              ))}
            </div>
            {otp.length === 6 && (
              <button onClick={handleVerify} className={styles.verifyButton} style={{ marginTop: '20px' }}>
                Verify
              </button>
            )}
            {error && <p className={styles.error}>{error}</p>}
            {isLoginStepOneOk && timerStarted && remainingTime > 0 && (
              <p className={styles.timer}>Time left: {formatTime(remainingTime)}</p>
            )}
            {showExpired && (
              <div className={styles.resendContainer}>
                <p className={styles.expiredText}>Your code has expired.</p>
                <button onClick={resendOtp} className={styles.resendButton}>Resend Code</button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className={styles.app}>
      {showBlocked && blockedPopup}
      {showNotRegistered && notRegisteredPopup}
      {showInvalidFormat && invalidFormatPopup}
      {showIncorrectCredentials && incorrectCredentialsPopup}
      {showGenericError && genericErrorPopup}
      {normalContent}
    </div>
  );
}

export default Login;
