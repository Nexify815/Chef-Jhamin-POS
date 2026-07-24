import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import ThemeToggle from '../components/ThemeToggle';

export default function ChangePasswordPage() {
  const { user, changePassword, logout } = useAuth();
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [current, setCurrent] = useState('');
  const [newPass, setNewPass] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    if (!current || !newPass || !confirm) {
      setError('All fields are required');
      return;
    }
    if (newPass.length < 8) {
      setError('New password must be at least 8 characters');
      return;
    }
    if (newPass !== confirm) {
      setError('New passwords do not match');
      return;
    }
    setLoading(true);
    try {
      const res = await changePassword(current, newPass);
      if (res?.success) {
        setSuccess('Password changed successfully! Redirecting...');
        setTimeout(() => window.location.reload(), 1500);
      } else {
        setError(res?.message || 'Failed to change password');
      }
    } catch (err) {
      setError(err.message || 'Failed to change password');
    } finally {
      setLoading(false);
    }
  };

  const neu = {
    card: {
      background: isDark ? '#1a2535' : '#FFFFFF',
      boxShadow: isDark
        ? '8px 8px 20px rgba(0,0,0,0.5), -4px -4px 12px rgba(255,255,255,0.03)'
        : '8px 8px 20px rgba(0,0,0,0.08), -4px -4px 12px rgba(255,255,255,0.7)',
      borderRadius: '20px',
    },
    inset: {
      background: isDark ? '#161f2e' : '#F1F5F9',
      boxShadow: isDark
        ? 'inset 4px 4px 10px rgba(0,0,0,0.5), inset -2px -2px 6px rgba(255,255,255,0.03)'
        : 'inset 4px 4px 10px rgba(0,0,0,0.06), inset -2px -2px 6px rgba(255,255,255,0.6)',
      borderRadius: '12px',
    },
    button: {
      background: 'linear-gradient(145deg, #16b89a, #0d8a72)',
      boxShadow: isDark
        ? '4px 4px 12px rgba(0,0,0,0.4), -2px -2px 8px rgba(20,184,166,0.2)'
        : '4px 4px 12px rgba(0,0,0,0.12), -2px -2px 8px rgba(20,184,166,0.15)',
      borderRadius: '12px',
    },
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6" style={{ background: isDark ? '#141e2d' : '#E2E8F0' }}>
      <div className="absolute top-5 right-5"><ThemeToggle /></div>
      <div className="w-full max-w-sm">
        <div style={neu.card} className="p-8">
          <div className="flex flex-col items-center mb-6">
            <div className="w-16 h-16 rounded-full flex items-center justify-center mb-3" style={{ background: 'rgba(245,158,11,0.15)' }}>
              <i className="fas fa-shield-halved text-amber-400 text-2xl" />
            </div>
            <h1 className="text-lg font-bold text-center" style={{ color: isDark ? '#fff' : '#0F172A' }}>Change Your Password</h1>
            <p className="text-xs text-center mt-1" style={{ color: 'var(--text-dim)' }}>
              You must change your password before continuing. Welcome, {user?.name || 'User'}.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-xs font-semibold tracking-widest uppercase mb-2 block ml-1" style={{ color: 'var(--teal)' }}>Current Password</label>
              <div className="flex items-center gap-3 px-4 py-3" style={neu.inset}>
                <span className="shrink-0" style={{ color: 'var(--teal-muted)' }}>{"\ud83d\udd11"}</span>
                <input type="password" value={current} onChange={e => setCurrent(e.target.value)} placeholder="Enter current password" className="flex-1 bg-transparent text-sm focus:outline-none" style={{ color: isDark ? '#fff' : '#0F172A' }} required />
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold tracking-widest uppercase mb-2 block ml-1" style={{ color: 'var(--teal)' }}>New Password</label>
              <div className="flex items-center gap-3 px-4 py-3" style={neu.inset}>
                <span className="shrink-0" style={{ color: 'var(--teal-muted)' }}>{"\ud83d\udd12"}</span>
                <input type="password" value={newPass} onChange={e => setNewPass(e.target.value)} placeholder="Min 8 characters" className="flex-1 bg-transparent text-sm focus:outline-none" style={{ color: isDark ? '#fff' : '#0F172A' }} required />
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold tracking-widest uppercase mb-2 block ml-1" style={{ color: 'var(--teal)' }}>Confirm New Password</label>
              <div className="flex items-center gap-3 px-4 py-3" style={neu.inset}>
                <span className="shrink-0" style={{ color: 'var(--teal-muted)' }}>{"\ud83d\udd12"}</span>
                <input type="password" value={confirm} onChange={e => setConfirm(e.target.value)} placeholder="Re-enter new password" className="flex-1 bg-transparent text-sm focus:outline-none" style={{ color: isDark ? '#fff' : '#0F172A' }} required />
              </div>
            </div>

            {error && (
              <p className="text-sm text-center rounded-lg py-2 anim-slide-down" style={{ color: '#F87171', background: 'rgba(239,68,68,0.10)', border: '1px solid rgba(239,68,68,0.20)' }}>{error}</p>
            )}
            {success && (
              <p className="text-sm text-center rounded-lg py-2 anim-slide-down" style={{ color: '#34D399', background: 'rgba(16,185,129,0.10)', border: '1px solid rgba(16,185,129,0.20)' }}>{success}</p>
            )}

            <button type="submit" disabled={loading} className="w-full text-white font-bold py-4 text-sm tracking-widest uppercase mt-2 transition-all duration-200 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2" style={neu.button}>
              {loading ? (<><i className="fas fa-spinner fa-spin" /> Changing...</>) : (<><i className="fas fa-check mr-2" /> Change Password</>)}
            </button>
          </form>

          <div className="mt-6 text-center">
            <button onClick={logout} className="text-xs hover:underline transition" style={{ color: 'var(--text-dim)' }}>
              <i className="fas fa-arrow-left mr-1" /> Back to Login
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
