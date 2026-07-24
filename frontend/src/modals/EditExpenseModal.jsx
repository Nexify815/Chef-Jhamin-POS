import { useState } from 'react';
import { useModal } from '../components/Modal';
import api from '../api';
import CustomSelect from '../components/CustomSelect';
import { EXPENSE_CATEGORIES } from '../utils/helpers';

export default function EditExpenseModal({ expense, onClose, onSaved }) {
  const { showAlert } = useModal();
  const [loading, setLoading] = useState(false);

  const [date, setDate] = useState(expense.date || '');
  const [category, setCategory] = useState(expense.category || 'Ingredients');
  const [amount, setAmount] = useState(expense.amount || '');
  const [description, setDescription] = useState(expense.description || '');
  const [payment, setPayment] = useState(expense.payment || 'Cash');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!amount || Number(amount) <= 0) {
      showAlert('warning', 'Invalid', 'Please enter a valid amount.');
      return;
    }
    setLoading(true);
    try {
      await api.put(`expenses/${expense.id}`, {
        date,
        category,
        amount: Number(amount),
        description,
        payment,
      });
      onSaved();
    } catch (err) {
      showAlert('error', 'Error', err.message || 'Failed to update expense');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(8px)' }} onClick={onClose}>
      <div className="glass-panel w-[90%] max-w-[500px] max-h-[90vh] overflow-y-auto p-6" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-teal">Edit Expense</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-2xl leading-none">&times;</button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-gray-400 text-sm font-medium mb-1">Date</label>
            <input type="date" value={date} onChange={e => setDate(e.target.value)} className="input-field w-full" required />
          </div>

          <div>
            <label className="block text-gray-400 text-sm font-medium mb-1">Category</label>
            <CustomSelect
              value={category}
              onChange={setCategory}
              options={EXPENSE_CATEGORIES}
              className="w-full"
            />
          </div>

          <div>
            <label className="block text-gray-400 text-sm font-medium mb-1">Amount (GHS)</label>
            <input type="number" step="0.01" min="0" value={amount} onChange={e => setAmount(e.target.value)} className="input-field w-full" placeholder="0.00" required />
          </div>

          <div>
            <label className="block text-gray-400 text-sm font-medium mb-1">Description</label>
            <input type="text" value={description} onChange={e => setDescription(e.target.value)} className="input-field w-full" placeholder="Optional description" />
          </div>

          <div>
            <label className="block text-gray-400 text-sm font-medium mb-1">Payment Method</label>
            <CustomSelect value={payment} onChange={setPayment} options={['Cash', 'MoMo', 'Bolt Food', 'Delivery']} placeholder="Select payment" required />
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
