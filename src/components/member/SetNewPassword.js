// src/components/member/SetNewPassword.jsx
import React, { useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { Home } from 'lucide-react';
import axiosInstance from '../../utility/axiosInstance';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const homeButtonClass =
  'self-start p-0 h-auto bg-transparent border-none text-foreground text-2xl cursor-pointer mb-4 hover:bg-transparent hover:text-gold-dark shadow-none';
const inputFieldClass =
  'h-auto w-full rounded-sm bg-secondary border-input px-3 py-3 text-base text-foreground focus-visible:ring-0 focus-visible:border-gold shadow-none';
const loginButtonClass =
  'h-auto w-full rounded-sm px-3 py-2 text-base font-bold text-[#1a202c] bg-gold hover:bg-gold-dark shadow-none';

function SetNewPassword() {
  const { state } = useLocation();
  const navigate = useNavigate();
  const email = state?.email;

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (!email) {
    return <Navigate to="/reset-password" replace />;
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
    <div className="min-h-screen w-full flex items-center justify-center bg-background text-foreground p-4 box-border">
      <div className="p-6 bg-card border border-border rounded-lg flex flex-col items-center w-full max-w-[400px] gap-4">
        <img src="/images/payzarc.png" alt="Payzarc" className="block text-center max-w-[35%] mx-auto" />

        <div className="bg-card rounded-lg w-full flex flex-col items-center p-6">
          <button onClick={() => navigate('/reset-password')} className={homeButtonClass}>
            <Home size={22} />
          </button>

          <h2 className="text-[1.6rem] font-bold text-gold text-center mt-2 mb-4">Set New Password</h2>
          <p className="text-foreground text-center mb-2">For account: <strong>{email}</strong></p>

          <form onSubmit={handleSubmit} className="w-[90%] flex flex-col gap-5">
            <Input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="New Password"
              required
              className={inputFieldClass}
            />

            <Input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm Password"
              required
              className={inputFieldClass}
            />

            {error && <p className="text-destructive text-sm text-center my-2">{error}</p>}

            <Button type="submit" disabled={loading} className={loginButtonClass}>
              {loading ? 'Resetting...' : 'Reset Password'}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default SetNewPassword;
