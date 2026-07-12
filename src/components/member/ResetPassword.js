import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faHome, faRedo } from '@fortawesome/free-solid-svg-icons';
import axiosInstance from '../../utility/axiosInstance';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const homeButtonClass =
  'self-start ml-[5%] w-10 h-10 p-0 bg-transparent border-none text-foreground text-2xl cursor-pointer mb-4 flex items-center justify-center hover:bg-transparent hover:text-gold-dark shadow-none';
const inputFieldClass =
  'h-auto w-full rounded-sm bg-secondary border-input px-3 py-3 text-base text-foreground focus-visible:ring-0 focus-visible:border-gold shadow-none';
const submitBtnClass =
  'h-auto w-full rounded-sm px-3 py-3 text-base font-bold text-[#1a202c] bg-gold hover:bg-gold-dark shadow-none';

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
        navigate('/components/member/set-new-password', { state: { email } });
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
      <div className="min-h-screen w-full flex items-center justify-center bg-background text-foreground p-4 box-border">
        <div className="p-6 bg-card border border-border rounded-lg flex flex-col items-center w-full max-w-[400px] gap-4">
          <img src="/images/payzarc.png" alt="Payzarc" className="block text-center max-w-[35%] mx-auto" />
          <div className="bg-card rounded-lg w-full flex flex-col items-center p-6">
            <h2 className="text-[1.6rem] font-bold text-[#ff6347] text-center mt-2 mb-4">Temporarily Blocked</h2>
            <p className="text-[#cbd5e1] my-6 text-center">
              Too many reset attempts. Please try again later or contact support.
            </p>
            <button onClick={onBack} className={homeButtonClass}>
              <FontAwesomeIcon icon={faHome} /> Return Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-background text-foreground p-4 box-border">
      <div className="p-6 bg-card border border-border rounded-lg flex flex-col items-center w-full max-w-[400px] gap-4">
        <img src="/images/payzarc.png" alt="Payzarc" className="block text-center max-w-[35%] mx-auto" />

        <div className="bg-card rounded-lg w-full flex flex-col items-center p-6">
          <button onClick={onBack} className={homeButtonClass}>
            <FontAwesomeIcon icon={faHome} />
          </button>

          {step === 'email' ? (
            <>
              <h2 className="text-[1.6rem] font-bold text-gold text-center mt-2 mb-4">Forgot Password</h2>
              <p className="text-foreground text-center mb-2">We'll send a reset code to your registered email</p>
              <form onSubmit={handleSendOtp} className="w-[90%] flex flex-col gap-4">
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Email address"
                  required
                  className={inputFieldClass}
                />
                {error && <p className="text-destructive text-sm text-center my-2">{error}</p>}
                <Button type="submit" disabled={loading} className={submitBtnClass}>
                  {loading ? 'Sending...' : 'Send Reset Code'}
                </Button>
              </form>
            </>
          ) : (
            <>
              <h2 className="text-[1.6rem] font-bold text-gold text-center mt-2 mb-4">Enter Reset Code</h2>
              <p className="text-foreground text-center mb-2">Code sent to <strong>{email}</strong></p>
              <form onSubmit={handleVerifyOtp} className="w-[90%] flex flex-col gap-4">
                <Input
                  type="text"
                  maxLength={6}
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
                  placeholder="Enter 6-digit code"
                  required
                  autoFocus
                  className={inputFieldClass}
                />
                {error && <p className="text-destructive text-sm text-center my-2">{error}</p>}
                {remainingTime > 0 && (
                  <p className="text-foreground text-sm text-center my-4">Time remaining: {formatTime(remainingTime)}</p>
                )}
                <Button
                  type="submit"
                  disabled={loading || remainingTime === 0}
                  className={submitBtnClass}
                >
                  {loading ? 'Verifying...' : 'Verify & Continue'}
                </Button>
              </form>

              {remainingTime === 0 && (
                <button
                  onClick={handleResend}
                  disabled={loading}
                  className="bg-transparent border-none text-gold text-[0.95rem] cursor-pointer flex items-center gap-2 mt-4 hover:text-gold-dark disabled:opacity-60 disabled:cursor-not-allowed"
                >
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
