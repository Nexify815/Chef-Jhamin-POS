import { useState, useEffect } from 'react';
import { useModal } from '../components/Modal';
import api from '../api';
import CustomSelect from '../components/CustomSelect';

const calcHours = (inTime, outTime) => {
  if (!inTime || !outTime) return '';
  const [inH, inM] = inTime.split(':').map(Number);
  const [outH, outM] = outTime.split(':').map(Number);
  let diff = (outH * 60 + outM) - (inH * 60 + inM);
  if (diff < 0) diff += 24 * 60;
  return (diff / 60).toFixed(2);
};

export default function EditStaffLogModal({ log, onClose, onSaved }) {
  const { showAlert } = useModal();
  const [loading, setLoading] = useState(false);

  const [date, setDate] = useState(log.date || '');
  const [name, setName] = useState(log.name || '');
  const [shift, setShift] = useState(log.shift || 'Morning');
  const [timeIn, setTimeIn] = useState(log.timeIn || '');
  const [timeOut, setTimeOut] = useState(log.timeOut || '');
  const [hours, setHours] = useState(log.hours || '');

  useEffect(() => {
    const calculated = calcHours(timeIn, timeOut);
    if (calculated) setHours(calculated);
  }, [timeIn, timeOut]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.put(`staff/${log.id}`, {
        date,
        name,
        shift,
        timeIn,
        timeOut,
        hours: Number(hours) || 0,
      });
      onSaved();
    } catch (err) {
      showAlert('error', 'Error', err.message || 'Failed to update staff log');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(8px)' }} onClick={onClose}>
      <div className="glass-panel w-[90%] max-w-[500px] max-h-[90vh] overflow-y-auto p-6" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-teal">Edit Staff Log</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-2xl leading-none">&times;</button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-gray-400 text-sm font-medium mb-1">Date</label>
            <input type="date" value={date} onChange={e => setDate(e.target.value)} className="input-field w-full" required />
          </div>

          <div>
            <label className="block text-gray-400 text-sm font-medium mb-1">Staff Name</label>
            <input type="text" value={name} onChange={e => setName(e.target.value)} className="input-field w-full" required />
          </div>

          <div>
            <label className="block text-gray-400 text-sm font-medium mb-1">Shift</label>
            <CustomSelect value={shift} onChange={setShift} options={['Morning', 'Afternoon', 'Evening', 'Night']} placeholder="Select shift" required />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-gray-400 text-sm font-medium mb-1">Time In</label>
              <input type="time" value={timeIn} onChange={e => setTimeIn(e.target.value)} className="input-field w-full" required />
            </div>
            <div>
              <label className="block text-gray-400 text-sm font-medium mb-1">Time Out</label>
              <input type="time" value={timeOut} onChange={e => setTimeOut(e.target.value)} className="input-field w-full" required />
            </div>
          </div>

          <div>
            <label className="block text-gray-400 text-sm font-medium mb-1">Hours Worked</label>
            <input type="text" value={hours} readOnly className="input-field w-full bg-white/[0.03]" />
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2 rounded-lg border border-white/10 text-gray-300 hover:bg-white/5 transition">Cancel</button>
            <button type="submit" disabled={loading} className="btn-primary flex-1 px-4 py-2 rounded-lg font-semibold disabled:opacity-50">
              {loading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
