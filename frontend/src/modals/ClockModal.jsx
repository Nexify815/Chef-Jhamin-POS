import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useModal } from '../components/Modal';
import api from '../api';

export default function ClockModal({ mode, onClose }) {
  const { user } = useAuth();
  const { showAlert } = useModal();
  const [loading, setLoading] = useState(false);

  const detectShift = () => {
    const hour = new Date().getHours();
    return hour < 12 ? 'Morning' : 'Evening';
  };

  const title = mode === 'in' ? 'Clock In' : 'Clock Out';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const endpoint = mode === 'in' ? 'clockin' : 'clockout';
      const res = await api.post(endpoint, { name: user.name, shift: detectShift(), task: 'General' });
      if (res && res.success === false) {
        showAlert('error', 'Error', res.message || `Failed to ${title.toLowerCase()}`);
      } else {
        showAlert('success', title, `${title} successful!`, () => onClose());
      }
    } catch (err) {
      showAlert('error', 'Error', err.message || `Failed to ${title.toLowerCase()}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(8px)' }} onClick={onClose}>
      <div className="glass-panel w-[90%] max-w-[500px] max-h-[90vh] overflow-y-auto p-6" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-teal">{title}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-2xl leading-none">&times;</button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="bg-white/[0.03] rounded-lg p-4 border border-white/[0.04] text-center">
            <span className="text-gray-400 text-sm">Clocking in as</span>
            <div className="text-white text-lg font-semibold mt-1">{user.name}</div>
          </div>

          <div className="bg-white/[0.03] rounded-lg p-3 text-center border border-white/[0.04]">
            <span className="text-gray-400 text-sm">Auto-detected shift: </span>
            <span className="text-teal font-semibold">{detectShift()}</span>
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2 rounded-lg border border-white/10 text-gray-300 hover:bg-white/5 transition">Cancel</button>
            <button type="submit" disabled={loading} className="btn-primary flex-1 px-4 py-2 rounded-lg font-semibold disabled:opacity-50">
              {loading ? 'Processing...' : title}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
