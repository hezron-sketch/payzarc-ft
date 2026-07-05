import React, { useState, useEffect } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faArrowLeft,
  faRedo,
  faLock,
  faShieldAlt,
  faCheckCircle,
} from "@fortawesome/free-solid-svg-icons";
import axiosInstance from "../../utility/axiosInstance";
import styles from "./Settings.module.css";

function Settings({ user, onSuccess }) {
  const [step, setStep] = useState("init");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [remainingTime, setRemainingTime] = useState(120);
  const [timerStarted, setTimerStarted] = useState(false);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  useEffect(() => {
    let interval;
    if (step === "otp" && timerStarted && remainingTime > 0) {
      interval = setInterval(() => {
        setRemainingTime((prev) => (prev <= 1 ? 0 : prev - 1));
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [step, timerStarted, remainingTime]);

  const isPasswordValid = (pwd) => {
    const regex =
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,15}$/;
    return regex.test(pwd);
  };

  const handleInit = async (e) => {
    e.preventDefault();
    setError("");

    if (!currentPassword || !newPassword || !confirmPassword) {
      setError("All fields are required");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("New passwords do not match");
      return;
    }

    if (!isPasswordValid(newPassword)) {
      setError(
        "Password must be 8–15 chars with uppercase, lowercase, number & special char",
      );
      return;
    }

    setLoading(true);

    try {
      const response = await axiosInstance.post("/api/change-password/init", {
        currentPassword,
        newPassword,
        confirmPassword,
      });

      if (response.data.success) {
        setStep("otp");
        setTimerStarted(true);
        setRemainingTime(120);
        setError("");
      } else {
        setError(response.data.error || "Failed to initiate change");
      }
    } catch (err) {
      setError(err.response?.data?.error || "Server error");
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (e) => {
    e.preventDefault();
    setError("");

    if (!/^[A-Z0-9]{6}$/.test(otp)) {
      setError("Enter valid 6-character OTP");
      return;
    }

    setLoading(true);

    try {
      const response = await axiosInstance.post("/api/change-password/verify", {
        code: otp,
      });

      if (response.data.success) {
        setStep("success");
        setTimeout(() => {
          onSuccess();
        }, 2000);
      } else {
        setError(response.data.error || "Invalid OTP");
        setOtp("");
      }
    } catch (err) {
      setError(err.response?.data?.error || "Verification failed");
      setOtp("");
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setError("");
    setLoading(true);

    try {
      await axiosInstance.post("/api/change-password/init", {
        currentPassword,
        newPassword,
        confirmPassword,
      });
      setRemainingTime(120);
      setTimerStarted(true);
      setOtp("");
      setError("New OTP sent!");
    } catch (err) {
      setError(err.response?.data?.error || "Failed to resend");
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    setStep("init");
    setOtp("");
    setError("");
    setRemainingTime(120);
    setTimerStarted(false);
  };

  if (step === "success") {
    return (
      <div className={styles.container}>
        <div className={styles.card}>
          <div className={styles.successContent}>
            <FontAwesomeIcon
              icon={faCheckCircle}
              className={styles.successIcon}
            />
            <h2 className={styles.title}>Password Updated!</h2>
            <p className={styles.infoText}>
              Your password has been changed successfully. Redirecting you
              home...
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <div className={styles.header}>
          <button
            onClick={onSuccess}
            className={styles.backButton}
            aria-label="Go back"
          >
            <FontAwesomeIcon icon={faArrowLeft} />
          </button>
          <h2 className={styles.title}>
            {step === "init" ? "Security Settings" : "Verify Identity"}
          </h2>
          <div className={styles.headerSpacer}></div>
        </div>

        {step === "init" ? (
          <div className={styles.content}>
            <div className={styles.iconWrapper}>
              <FontAwesomeIcon icon={faLock} className={styles.mainIcon} />
            </div>
            <p className={styles.description}>
              Update your account password to keep your account secure.
            </p>

            <form onSubmit={handleInit} className={styles.form}>
              <div className={styles.inputGroup}>
                <label htmlFor="currentPassword">Current Password</label>
                <input
                  id="currentPassword"
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                />
              </div>
              <div className={styles.inputGroup}>
                <label htmlFor="newPassword">New Password</label>
                <input
                  id="newPassword"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                />
              </div>
              <div className={styles.inputGroup}>
                <label htmlFor="confirmPassword">Confirm New Password</label>
                <input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                />
              </div>

              {error && <div className={styles.errorMsg}>{error}</div>}

              <button
                type="submit"
                disabled={loading}
                className={styles.submitButton}
              >
                {loading ? (
                  <span className={styles.loader}></span>
                ) : (
                  "Send Verification Code"
                )}
              </button>
            </form>
          </div>
        ) : (
          <div className={styles.content}>
            <div className={styles.iconWrapper}>
              <FontAwesomeIcon icon={faShieldAlt} className={styles.mainIcon} />
            </div>
            <h3 className={styles.subtitle}>Enter 6-Digit Code</h3>
            <p className={styles.infoText}>
              We've sent a code to{" "}
              <strong>{user?.email || "your email"}</strong>
            </p>

            <div className={styles.otpWrapper}>
              <input
                type="text"
                maxLength="6"
                value={otp}
                onChange={(e) =>
                  setOtp(
                    e.target.value.replace(/\W/g, "").toUpperCase().slice(0, 6),
                  )
                }
                placeholder="000000"
                className={styles.otpInput}
                autoFocus
              />
            </div>

            <div className={styles.timerWrapper}>
              {remainingTime > 0 ? (
                <p className={styles.timer}>
                  Expires in: <span>{formatTime(remainingTime)}</span>
                </p>
              ) : (
                <div className={styles.expiredWrapper}>
                  <p className={styles.expiredText}>Code expired</p>
                  <button
                    onClick={handleResend}
                    disabled={loading}
                    className={styles.resendBtn}
                  >
                    <FontAwesomeIcon icon={faRedo} /> Resend Code
                  </button>
                </div>
              )}
            </div>

            {error && <div className={styles.errorMsg}>{error}</div>}

            <div className={styles.buttonGroup}>
              <button
                onClick={handleVerify}
                disabled={loading || remainingTime === 0}
                className={styles.submitButton}
              >
                {loading ? (
                  <span className={styles.loader}></span>
                ) : (
                  "Verify & Update"
                )}
              </button>
              <button onClick={handleBack} className={styles.cancelBtn}>
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default Settings;

// import React, { useState, useEffect } from 'react';
// import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
// import { faArrowLeft, faRedo } from '@fortawesome/free-solid-svg-icons';
// import axiosInstance from '../../utility/axiosInstance';
// import styles from './Settings.module.css';

// function Settings({ user, onSuccess }) {
//   const [step, setStep] = useState('init');
//   const [currentPassword, setCurrentPassword] = useState('');
//   const [newPassword, setNewPassword] = useState('');
//   const [confirmPassword, setConfirmPassword] = useState('');
//   const [otp, setOtp] = useState('');
//   const [error, setError] = useState('');
//   const [loading, setLoading] = useState(false);
//   const [remainingTime, setRemainingTime] = useState(120);
//   const [timerStarted, setTimerStarted] = useState(false);

//   const formatTime = (seconds) => {
//     const mins = Math.floor(seconds / 60);
//     const secs = seconds % 60;
//     return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
//   };

//   useEffect(() => {
//     let interval;
//     if (step === 'otp' && timerStarted && remainingTime > 0) {
//       interval = setInterval(() => {
//         setRemainingTime((prev) => (prev <= 1 ? 0 : prev - 1));
//       }, 1000);
//     }
//     return () => clearInterval(interval);
//   }, [step, timerStarted, remainingTime]);

//   const isPasswordValid = (pwd) => {
//     const regex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,15}$/;
//     return regex.test(pwd);
//   };

//   const handleInit = async (e) => {
//     e.preventDefault();
//     setError('');

//     if (!currentPassword || !newPassword || !confirmPassword) {
//       setError('All fields are required');
//       return;
//     }

//     if (newPassword !== confirmPassword) {
//       setError('New passwords do not match');
//       return;
//     }

//     if (!isPasswordValid(newPassword)) {
//       setError('New password must be 8–15 chars with uppercase, lowercase, number & special char');
//       return;
//     }

//     setLoading(true);

//     try {
//       const response = await axiosInstance.post('/api/change-password/init', {
//         currentPassword,
//         newPassword,
//         confirmPassword,
//       });

//       if (response.data.success) {
//         setStep('otp');
//         setTimerStarted(true);
//         setRemainingTime(120);
//         setError('');
//       } else {
//         setError(response.data.error || 'Failed to initiate change');
//       }
//     } catch (err) {
//       setError(err.response?.data?.error || 'Server error');
//     } finally {
//       setLoading(false);
//     }
//   };

//   const handleVerify = async (e) => {
//     e.preventDefault();
//     setError('');

//     if (!/^[A-Z0-9]{6}$/.test(otp)) {
//       setError('Enter valid 6-character OTP');
//       return;
//     }

//     setLoading(true);

//     try {
//       const response = await axiosInstance.post('/api/change-password/verify', {
//         code: otp,
//       });

//       if (response.data.success) {
//         alert('Password changed successfully!');
//         onSuccess();
//       } else {
//         setError(response.data.error || 'Invalid OTP');
//         setOtp('');
//       }
//     } catch (err) {
//       setError(err.response?.data?.error || 'Verification failed');
//       setOtp('');
//     } finally {
//       setLoading(false);
//     }
//   };

//   const handleResend = async () => {
//     setError('');
//     setLoading(true);

//     try {
//       await axiosInstance.post('/api/change-password/init', {
//         currentPassword,
//         newPassword,
//         confirmPassword,
//       });
//       setRemainingTime(120);
//       setTimerStarted(true);
//       setOtp('');
//       setError('New OTP sent!');
//     } catch (err) {
//       setError(err.response?.data?.error || 'Failed to resend');
//     } finally {
//       setLoading(false);
//     }
//   };

//   const handleBack = () => {
//     setStep('init');
//     setOtp('');
//     setError('');
//     setRemainingTime(120);
//     setTimerStarted(false);
//   };

//   return (
//     <div className={styles.container}>
//       <div className={styles.card}>
//         <div className={styles.header}>
//           <button onClick={onSuccess} className={styles.backButton}>
//             <FontAwesomeIcon icon={faArrowLeft} />
//           </button>
//           <h2 className={styles.title}>Change Password</h2>
//         </div>

//         {step === 'init' ? (
//           <form onSubmit={handleInit} className={styles.form}>
//             <div className={styles.inputGroup}>
//               <label>Current Password</label>
//               <input
//                 type="password"
//                 value={currentPassword}
//                 onChange={(e) => setCurrentPassword(e.target.value)}
//                 placeholder="Enter current password"
//                 required
//               />
//             </div>
//             <div className={styles.inputGroup}>
//               <label>New Password</label>
//               <input
//                 type="password"
//                 value={newPassword}
//                 onChange={(e) => setNewPassword(e.target.value)}
//                 placeholder="Enter new password"
//                 required
//               />
//             </div>
//             <div className={styles.inputGroup}>
//               <label>Confirm New Password</label>
//               <input
//                 type="password"
//                 value={confirmPassword}
//                 onChange={(e) => setConfirmPassword(e.target.value)}
//                 placeholder="Confirm new password"
//                 required
//               />
//             </div>
//             {error && <p className={styles.error}>{error}</p>}
//             <button type="submit" disabled={loading} className={styles.submitButton}>
//               {loading ? 'Sending OTP...' : 'Continue'}
//             </button>
//           </form>
//         ) : (
//           <div className={styles.otpSection}>
//             <button onClick={handleBack} className={styles.backButton}>
//               <FontAwesomeIcon icon={faArrowLeft} />
//             </button>
//             <h3 className={styles.subtitle}>Verify Your Identity</h3>
//             <p className={styles.infoText}>
//               OTP sent to: <strong>{user?.email || 'your email'}</strong>
//             </p>
//             <input
//               type="text"
//               maxLength="6"
//               value={otp}
//               onChange={(e) => setOtp(e.target.value.replace(/\W/g, '').toUpperCase().slice(0, 6))}
//               placeholder="Enter OTP"
//               className={styles.otpInput}
//               autoFocus
//             />
//             {remainingTime > 0 && <p className={styles.timer}>Time left: {formatTime(remainingTime)}</p>}
//             {remainingTime === 0 && (
//               <div style={{ textAlign: 'center', margin: '1rem 0' }}>
//                 <p className={styles.expiredText}>OTP expired.</p>
//                 <button
//                   onClick={handleResend}
//                   disabled={loading}
//                   style={{
//                     background: 'none',
//                     border: 'none',
//                     color: '#ecc94b',
//                     cursor: 'pointer',
//                     display: 'flex',
//                     alignItems: 'center',
//                     gap: '8px',
//                     margin: '0 auto'
//                   }}
//                 >
//                   <FontAwesomeIcon icon={faRedo} /> Resend OTP
//                 </button>
//               </div>
//             )}
//             {error && <p className={styles.error}>{error}</p>}
//             <button
//               onClick={handleVerify}
//               disabled={loading || remainingTime === 0}
//               className={styles.submitButton}
//             >
//               {loading ? 'Verifying...' : 'Verify & Change Password'}
//             </button>
//           </div>
//         )}
//       </div>
//     </div>
//   );
// }

// export default Settings;
