import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import springApi from '../../utility/axiosInstance';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { RotateCw } from 'lucide-react';

const inputFieldClass =
  'h-auto w-full rounded-sm bg-secondary border-input px-2.5 py-2.5 text-base text-foreground focus-visible:ring-0 focus-visible:border-gold shadow-none';
const setpswdButtonClass =
  'h-auto w-full rounded-sm px-2.5 py-2 text-base font-bold text-[#1a202c] bg-gold hover:bg-gold-dark shadow-none flex items-center justify-center gap-1.5 disabled:opacity-60 disabled:cursor-not-allowed';
const popupOverlayClass =
  'fixed inset-0 bg-black/50 flex justify-center items-center z-[1000]';
const popupContentClass =
  'bg-card border border-border p-6 rounded-md max-w-[400px] w-[90%] text-center';
const popupButtonClass = 'px-5 py-2 rounded-sm text-base h-auto shadow-none';

function SetPassword({ onBack }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { firstName = 'User', email = '' } = location.state || {};

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Must match the Spring Boot backend's password regex exactly.
  const PASSWORD_REGEX = /^(?=.*[A-Z])(?=.*[a-z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,15}$/;

  useEffect(() => {
    const checkIfBlocked = async () => {
      if (email) {
        try {
          const response = await springApi.get(`/api/is-blocked?email=${email}`);
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
      const response = await springApi.post('/api/register/password-attempt', { email, remark });
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

    setIsSubmitting(true);
    try {
      const response = await springApi.post('/api/register/password', {
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
    } finally {
      setIsSubmitting(false);
    }
  };

  const capitalizeFirstLetter = (str) => {
    if (!str || typeof str !== 'string') return 'User';
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center text-foreground p-4 box-border">
      {blocked ? (
        <div className={popupOverlayClass}>
          <div className={popupContentClass}>
            <h2 className="text-xl font-bold mb-2 text-destructive">Email Blocked</h2>
            <p className="text-foreground text-base mb-2">Your email is blocked. Please contact support.</p>
            <div className="flex justify-center">
              <Button
                onClick={() => navigate('/')}
                className={`${popupButtonClass} bg-destructive text-white hover:opacity-85`}
              >
                OK
              </Button>
            </div>
          </div>
        </div>
      ) : success ? (
        <div className={popupOverlayClass}>
          <div className={popupContentClass}>
            <h2 className="text-xl font-bold mb-2 text-gold">Password Set Successfully</h2>
            <p className="text-foreground text-base mb-2">
              Dear {capitalizeFirstLetter(firstName)}, your password has been set successfully.
            </p>
            <div className="flex justify-center">
              <Button
                onClick={() => navigate('/login')}
                className={`${popupButtonClass} font-bold bg-gold text-[#1a202c] hover:bg-gold-dark`}
              >
                Now Login
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <div className="p-4 text-center rounded-lg w-full max-w-[400px]">
          <div className="bg-card border border-border flex flex-col items-center p-4 rounded-lg">
            <img src="/images/payzarc.png" alt="Payzarc" className="w-[100px] max-w-[35%] h-auto mb-4 block mx-auto" />
            <h2 className="text-lg font-bold text-foreground mb-1">Welcome!</h2>
            <p className="text-base font-bold text-gold mb-1">{capitalizeFirstLetter(firstName)}</p>
            <p className="text-base font-bold text-gold mb-1">{email}</p>
            <p className="text-gold text-sm mb-1">Let's secure your account with a strong password.</p>

            <form onSubmit={handleSetPassword} className="w-[90%] flex flex-col gap-2 mx-auto text-foreground">
              <Input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={inputFieldClass}
                required
              />
              <Input
                type="password"
                placeholder="Confirm Password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className={inputFieldClass}
                required
              />
              <div style={{ fontSize: '0.85rem', color: '#666', marginTop: '10px', textAlign: 'left' }}>
                <ul style={{ margin: '8px 0', paddingLeft: '20px' }}>
                  <li>8–15 characters long</li>
                  <li>At least 1 uppercase letter</li>
                  <li>At least 1 lowercase letter</li>
                  <li>At least 1 number</li>
                  <li>At least one of: @ $ ! % * ? &</li>
                </ul>
              </div>

              {error && <p className="text-destructive text-sm my-2">{error}</p>}

              <Button type="submit" className={setpswdButtonClass} disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <RotateCw className="w-4 h-4 animate-spin" />
                    Setting Password...
                  </>
                ) : (
                  "Set Password"
                )}
              </Button>
            </form>

            <p className="text-gold text-sm mt-4 text-center font-light">Your financial trusted partner at a go.</p>
          </div>
        </div>
      )}
    </div>
  );
}

export default SetPassword;
